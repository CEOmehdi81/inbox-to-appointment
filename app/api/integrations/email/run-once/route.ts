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
    if (!uiSecret) {
      return NextResponse.json({ ok: false, error: "missing_HOMI_UI_POLL_SECRET" }, { status: 500 });
    }

    const url = new URL("/api/gmail/poll", req.url);

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-homi-ui-key": uiSecret,
      },
      body: JSON.stringify({ agencyId, days: body?.days ?? 30 }),
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
