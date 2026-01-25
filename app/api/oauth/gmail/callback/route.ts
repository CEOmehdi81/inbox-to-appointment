// ⚠️ OAuth callback (PKCE + nonce). Works with localhost + ngrok dynamically.
// Uses findFirst + update/create (no composite unique required).
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function b64urlToBuf(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

type VerifiedState = { agencyId: string; emailHint?: string; nonce: string };

function verifyState(state: string, secret: string): VerifiedState {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) throw new Error("Invalid state format");

  const payloadJson = b64urlToBuf(payloadB64).toString("utf8");
  const sig = b64urlToBuf(sigB64);

  const expected = crypto.createHmac("sha256", secret).update(payloadJson).digest();

  if (sig.length !== expected.length) throw new Error("Invalid state signature");
  if (!crypto.timingSafeEqual(sig, expected)) throw new Error("Invalid state signature");

  const parsed = JSON.parse(payloadJson) as any;
  if (!parsed?.agencyId) throw new Error("State missing agencyId");
  if (!parsed?.nonce) throw new Error("State missing nonce");

  const now = Date.now();
  if (typeof parsed.exp === "number" && now > parsed.exp) throw new Error("State expired");

  return {
    agencyId: String(parsed.agencyId),
    emailHint: parsed.emailHint ? String(parsed.emailHint) : undefined,
    nonce: String(parsed.nonce),
  };
}

function pkceCookieNameFromNonce(nonce: string) {
  return `homi_gmail_cv_${nonce}`;
}

async function gmailFetch(accessToken: string, path: string, init?: RequestInit) {
  return fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const origin = url.origin;

    const oauthError = url.searchParams.get("error");
    if (oauthError) return NextResponse.json({ ok: false, error: oauthError }, { status: 400 });

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return NextResponse.json({ ok: false, error: "Missing code/state" }, { status: 400 });
    }

    const stateSecret = must(process.env.OAUTH_STATE_SECRET, "OAUTH_STATE_SECRET");
    const { agencyId, nonce, emailHint } = verifyState(state, stateSecret);

    const cvName = pkceCookieNameFromNonce(nonce);
    const codeVerifier =
      req.cookies.get(cvName)?.value ?? req.cookies.get("homi_gmail_cv")?.value;

    if (!codeVerifier) {
      return NextResponse.json(
        { ok: false, error: `Missing PKCE verifier cookie (${cvName}). Restart OAuth flow and avoid multiple tabs.` },
        { status: 400 }
      );
    }

    const clientId = must(process.env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = must(process.env.GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET");

    // ✅ Redirect URI must match the current host (localhost or ngrok)
    const redirectUri = `${origin}/api/oauth/gmail/callback`;

    // Exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "Token exchange failed", details: txt, redirect_uri: redirectUri },
        { status: 400 }
      );
    }

    const tokenJson: any = await tokenRes.json();
    const accessToken = tokenJson.access_token as string;
    const refreshToken = tokenJson.refresh_token as string | undefined;

    // Get Gmail profile email (fallback to emailHint)
    let emailAddress: string | null = emailHint ?? null;
    const profileRes = await gmailFetch(accessToken, "/profile");
    if (profileRes.ok) {
      const profile = await profileRes.json();
      if (profile?.emailAddress) emailAddress = profile.emailAddress;
    }

    // If still null, we can’t safely store an inbox identity
    if (!emailAddress) {
      return NextResponse.json(
        { ok: false, error: "Could not read Gmail emailAddress (profile) and no emailHint provided." },
        { status: 400 }
      );
    }

    // Label management (best effort)
    const labelName = "HOMI/Leads";
    let labelId: string | null = null;

    try {
      const labelsRes = await gmailFetch(accessToken, "/labels");
      if (labelsRes.ok) {
        const labels = (await labelsRes.json())?.labels ?? [];
        const existing = labels.find((l: any) => l?.name === labelName);
        if (existing?.id) labelId = existing.id;
      }

      if (!labelId) {
        const createLabelRes = await gmailFetch(accessToken, "/labels", {
          method: "POST",
          body: JSON.stringify({
            name: labelName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          }),
        });

        if (createLabelRes.ok) {
          const created = await createLabelRes.json();
          if (created?.id) labelId = created.id;
        }
      }
    } catch {
      // ignore label failures
    }

    const expiresIn = typeof tokenJson.expires_in === "number" ? tokenJson.expires_in : undefined;
    const expiryDateMs = expiresIn ? BigInt(Date.now() + expiresIn * 1000) : null;

    // ✅ NO findUnique/upsert with missing composite unique.
    // Find existing integration for this agency + provider + inbox email.
    const existing = await prisma.emailIntegration.findFirst({
      where: {
        agencyId,
        provider: "GMAIL",
        email: emailAddress,
      },
    });

    const finalRefreshEnc = refreshToken
      ? encrypt(refreshToken)
      : existing?.refreshTokenEnc ?? null;

    if (existing) {
      await prisma.emailIntegration.update({
        where: { id: existing.id },
        data: {
          provider: "GMAIL",
          email: emailAddress,
          status: "CONNECTED",
          accessTokenEnc: encrypt(accessToken),
          refreshTokenEnc: finalRefreshEnc,
          scope: tokenJson.scope ?? existing.scope ?? null,
          tokenType: tokenJson.token_type ?? existing.tokenType ?? null,
          expiryDateMs,
          labelId: labelId ?? existing.labelId ?? null,
          labelName,
          lastError: null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.emailIntegration.create({
        data: {
          agencyId,
          provider: "GMAIL",
          email: emailAddress,
          status: "CONNECTED",
          accessTokenEnc: encrypt(accessToken),
          refreshTokenEnc: finalRefreshEnc,
          scope: tokenJson.scope ?? null,
          tokenType: tokenJson.token_type ?? null,
          expiryDateMs,
          labelId,
          labelName,
          lastError: null,
        },
      });
    }

    // Redirect back to same host
    const res = NextResponse.redirect(
      `${origin}/admin/settings/channels/verify?agencyId=${encodeURIComponent(agencyId)}`
    );

    // Cleanup PKCE cookies
    res.cookies.set(cvName, "", { path: "/", maxAge: 0 });
    res.cookies.set("homi_gmail_cv", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e: any) {
    console.error("OAuth callback failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "oauth_callback_failed" }, { status: 500 });
  }
}