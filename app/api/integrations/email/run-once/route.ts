import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const agencyId = (body?.agencyId || "").toString().trim();

    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "missing_agencyId" }, { status: 400 });
    }

    const uiSecret = (process.env.HOMI_UI_POLL_SECRET || "").trim();
    const n8nSecret = (process.env.N8N_SHARED_SECRET || "").trim();
    const authKey = uiSecret || n8nSecret;

    if (!authKey) {
      return NextResponse.json(
        { ok: false, error: "missing_HOMI_UI_POLL_SECRET_or_N8N_SHARED_SECRET" },
        { status: 500 }
      );
    }

    const url = new URL("/api/gmail/poll", req.url);

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(uiSecret ? { "x-homi-ui-key": uiSecret } : { "x-homi-n8n-key": authKey }),
      },
      body: JSON.stringify({
        agencyId,
        days: body?.days ?? 30,
        maxPerRun: body?.maxPerRun,
        query: body?.query,
      }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => null);

    return NextResponse.json(
      { ok: r.ok, status: r.status, result: data },
      { status: r.ok ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
