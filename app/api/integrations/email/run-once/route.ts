import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const agencyId = (body?.agencyId || "").toString().trim();
    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "missing_agencyId" }, { status: 400 });
    }

    const daysRaw = body?.days;
    const days =
      typeof daysRaw === "number" && Number.isFinite(daysRaw) && daysRaw > 0
        ? Math.floor(daysRaw)
        : 30;

    const maxPerRunRaw = body?.maxPerRun;
    const maxPerRun =
      typeof maxPerRunRaw === "number" && Number.isFinite(maxPerRunRaw) && maxPerRunRaw > 0
        ? Math.floor(maxPerRunRaw)
        : undefined;

    const query = body?.query ? String(body.query).trim() : undefined;

    const secret = (process.env.N8N_SHARED_SECRET || "").trim();
    if (!secret) {
      return NextResponse.json({ ok: false, error: "missing_N8N_SHARED_SECRET" }, { status: 500 });
    }

    const url = new URL("/api/gmail/poll", req.url);

    const payload: any = { agencyId, days };
    if (maxPerRun != null) payload.maxPerRun = maxPerRun;
    if (query) payload.query = query;

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-homi-n8n-key": secret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await r.json().catch(() => null);

    // ✅ Always return JSON with 200, even when poll fails.
    // This prevents "fetch failed" / JSON parse issues and avoids proxy-style retry behavior.
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      result,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}