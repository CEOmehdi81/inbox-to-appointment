import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    // Optional: let UI pass days + agencyId
    const body = await req.json().catch(() => ({} as any));
    const daysRaw = body?.days;
    const agencyIdRaw = body?.agencyId;

    const days = Number.isFinite(Number(daysRaw)) ? Math.max(1, Math.min(90, Number(daysRaw))) : 30;
    const agencyId = typeof agencyIdRaw === "string" && agencyIdRaw.trim() ? agencyIdRaw.trim() : null;

    // Server-to-server secret (never expose this in the browser)
    const secret = mustEnv("N8N_SHARED_SECRET");

    // Call your existing poll endpoint internally (same Next.js app)
    const origin = new URL(req.url).origin;
    const pollUrl = new URL("/api/gmail/poll", origin);

    const res = await fetch(pollUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-homi-n8n-key": secret,
      },
      body: JSON.stringify({
        agencyId: agencyId ?? undefined,
        days,
        // we also pass q explicitly so poll can use it if you add support
        q: `newer_than:${days}d`,
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      return json(res.status || 500, {
        ok: false,
        error: data?.error || `poll_failed_http_${res.status}`,
        details: data,
      });
    }

    return json(200, { ok: true, poll: data });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "run_inbox_failed" });
  }
}