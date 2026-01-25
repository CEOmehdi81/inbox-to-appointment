// ⚠️ OAuth start (PKCE + nonce). Uses dynamic redirect_uri based on current host.
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256b64url(input: string) {
  return b64url(crypto.createHash("sha256").update(input).digest());
}

function signState(payloadJson: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(payloadJson).digest();
  return `${b64url(payloadJson)}.${b64url(sig)}`;
}

// Must match callback
function pkceCookieNameFromNonce(nonce: string) {
  return `homi_gmail_cv_${nonce}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const agencyId = url.searchParams.get("agencyId");
    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "agencyId is required" }, { status: 400 });
    }

    const emailHint = url.searchParams.get("email") || undefined;

    const clientId = must(process.env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID");
    const stateSecret = must(process.env.OAUTH_STATE_SECRET, "OAUTH_STATE_SECRET");

    // ✅ Dynamic redirect (must be registered in Google Console)
    const origin = url.origin;
    const redirectUri = `${origin}/api/oauth/gmail/callback`;

    // PKCE
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = sha256b64url(codeVerifier);

    // Nonce drives cookie name and is included in state (callback reads it)
    const nonce = b64url(crypto.randomBytes(16));
    const expiresAtMs = Date.now() + 10 * 60 * 1000;

    const payloadJson = JSON.stringify({
      agencyId,
      emailHint,
      iat: Date.now(),
      exp: expiresAtMs,
      nonce,
      origin, // ✅ optional, can help debugging
    });

    const state = signState(payloadJson, stateSecret);
    const pkceCookieName = pkceCookieNameFromNonce(nonce);

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.labels",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    if (emailHint) params.set("login_hint", emailHint);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const res = NextResponse.redirect(authUrl);

    // Avoid caching while debugging OAuth
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    // Store verifier under nonce-scoped cookie (callback expects this)
    res.cookies.set(pkceCookieName, codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/oauth/gmail",
      maxAge: 10 * 60,
      expires: new Date(expiresAtMs),
    });

    // Clear legacy cookie
    res.cookies.set("homi_gmail_cv", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "OAuth start failed" }, { status: 500 });
  }
}