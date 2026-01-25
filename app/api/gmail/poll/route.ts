import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

/**
 * Auth modes:
 * - n8n: header x-homi-n8n-key must equal N8N_SHARED_SECRET
 * - UI:  header x-homi-ui-key must equal HOMI_UI_POLL_SECRET
 */
function authOr401(req: Request) {
  const n8nGot = (req.headers.get("x-homi-n8n-key") || "").trim();
  const n8nExpected = (process.env.N8N_SHARED_SECRET || "").trim();

  const uiGot = (req.headers.get("x-homi-ui-key") || "").trim();
  const uiExpected = (process.env.HOMI_UI_POLL_SECRET || "").trim();

  const okN8n = n8nExpected && n8nGot && n8nGot === n8nExpected;
  const okUi = uiExpected && uiGot && uiGot === uiExpected;

  if (!okN8n && !okUi) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return null;
}

function headerValue(headers: any[], name: string) {
  const h = (headers || []).find(
    (x: any) => (x?.name || "").toLowerCase() === name.toLowerCase()
  );
  return h?.value || null;
}

function decodeB64Url(data?: string | null) {
  if (!data) return "";
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function pickTextFromPayload(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeB64Url(payload.body.data);
  }
  if (payload.body?.data && payload.mimeType?.startsWith("text/")) {
    return decodeB64Url(payload.body.data);
  }
  const parts = payload.parts || [];
  for (const p of parts) {
    const t = pickTextFromPayload(p);
    if (t?.trim()) return t;
  }
  return "";
}

function safeDecrypt(enc?: string | null): string | null {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}

function toExpiryDateMs(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function markSeenOrSkip(params: {
  provider: string;
  agencyId: string;
  inboxEmail: string;
  messageId: string;
}): Promise<{ shouldSkip: boolean }> {
  try {
    await prisma.emailMessageSeen.create({
      data: {
        provider: params.provider,
        agencyId: params.agencyId,
        inboxEmail: params.inboxEmail,
        messageId: params.messageId,
      },
    });
    return { shouldSkip: false };
  } catch {
    return { shouldSkip: true };
  }
}

/**
 * Best-effort forwarding.
 * - If n8n is down or webhook missing, DO NOT throw (so polling still works).
 */
async function forwardToN8nBestEffort(payload: any): Promise<{ ok: boolean; error?: string }> {
  const url = (process.env.N8N_GMAIL_INBOX_WEBHOOK_URL || "").trim();
  const secret = (process.env.N8N_SHARED_SECRET || "").trim();

  if (!url) return { ok: false, error: "missing_N8N_GMAIL_INBOX_WEBHOOK_URL" };
  if (!secret) return { ok: false, error: "missing_N8N_SHARED_SECRET" };

  const user = process.env.N8N_BASIC_USER;
  const pass = process.env.N8N_BASIC_PASS;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-homi-n8n-key": secret,
  };

  if (user && pass) {
    headers["authorization"] =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `n8n_webhook_failed_${res.status}:${txt.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.name === "AbortError" ? "n8n_timeout" : (e?.message || "n8n_fetch_failed") };
  } finally {
    clearTimeout(t);
  }
}

function clampInt(v: any, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const x = Math.floor(n);
  return Math.max(min, Math.min(max, x));
}

export async function POST(req: Request) {
  const authErr = authOr401(req);
  if (authErr) return authErr;

  try {
    const GOOGLE_OAUTH_CLIENT_ID = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
    const GOOGLE_OAUTH_CLIENT_SECRET = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
    const GOOGLE_OAUTH_REDIRECT_URL = mustEnv("GOOGLE_OAUTH_REDIRECT_URL");

    const body = await req.json().catch(() => ({} as any));

    const agencyId = (body?.agencyId || "").toString().trim();
    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "missing_agencyId" }, { status: 400 });
    }

    const days = clampInt(body?.days ?? 30, 30, 1, 365);
    const MAX_PER_RUN = clampInt(body?.maxPerRun ?? process.env.GMAIL_MAX_PER_RUN ?? 50, 50, 1, 200);

    const QUERY =
      (body?.query && String(body.query).trim()) ||
      process.env.GMAIL_POLL_QUERY ||
      `newer_than:${days}d`;

    let scanned = 0;
    let forwarded = 0;
    let skipped = 0;
    let forwardFailures = 0;
    const forwardFailureSamples: string[] = [];

    const integrations = await prisma.emailIntegration.findMany({
      where: {
        provider: "GMAIL",
        status: { in: ["CONNECTED", "ACTIVE"] },
        agencyId,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!integrations.length) {
      return NextResponse.json({
        ok: true,
        agencyId,
        scanned: 0,
        forwarded: 0,
        skipped: 0,
        inboxes: 0,
        note: "no_connected_inboxes",
      });
    }

    for (const integ of integrations) {
      const inboxEmail = integ.email || null;

      const refreshToken = safeDecrypt(integ.refreshTokenEnc);
      const accessToken = safeDecrypt(integ.accessTokenEnc);

      if (!inboxEmail || !refreshToken) {
        skipped++;
        continue;
      }

      const oauth2 = new google.auth.OAuth2(
        GOOGLE_OAUTH_CLIENT_ID,
        GOOGLE_OAUTH_CLIENT_SECRET,
        GOOGLE_OAUTH_REDIRECT_URL
      );

      oauth2.setCredentials({
        refresh_token: refreshToken,
        access_token: accessToken || undefined,
        token_type: integ.tokenType || undefined,
        expiry_date: toExpiryDateMs(integ.expiryDateMs),
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2 });

      const list = await gmail.users.messages.list({
        userId: "me",
        q: QUERY,
        maxResults: MAX_PER_RUN,
      });

      const msgs = list.data.messages || [];
      scanned += msgs.length;
      if (!msgs.length) continue;

      for (const m of msgs) {
        const msgId = m.id;
        if (!msgId) continue;

        const { shouldSkip } = await markSeenOrSkip({
          provider: "GMAIL",
          agencyId,
          inboxEmail,
          messageId: msgId,
        });

        if (shouldSkip) {
          skipped++;
          continue;
        }

        const full = await gmail.users.messages.get({
          userId: "me",
          id: msgId,
          format: "full",
        });

        const data = full.data;
        const headers = data.payload?.headers || [];

        const from = headerValue(headers, "From");
        const to = headerValue(headers, "To");
        const subject = headerValue(headers, "Subject");
        const text = pickTextFromPayload(data.payload) || data.snippet || "";

        const receivedAtIso = data.internalDate
          ? new Date(Number(data.internalDate)).toISOString()
          : new Date().toISOString();

        const fwd = await forwardToN8nBestEffort({
          agencyId,
          provider: "GMAIL",
          email: inboxEmail,
          message: {
            id: msgId,
            threadId: data.threadId || null,
            from,
            to,
            subject,
            text,
            receivedAt: receivedAtIso,
          },
        });

        if (fwd.ok) {
          forwarded++;
        } else {
          forwardFailures++;
          skipped++;
          if (fwd.error && forwardFailureSamples.length < 5) {
            forwardFailureSamples.push(fwd.error);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      agencyId,
      query: QUERY,
      scanned,
      forwarded,
      skipped,
      inboxes: integrations.length,
      forwardFailures,
      forwardFailureSamples,
    });
  } catch (e: any) {
    console.error("gmail poll failed", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}