import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secret = (process.env.N8N_SHARED_SECRET || "").trim();
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "missing_env_N8N_SHARED_SECRET" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const agencyId = (body?.agencyId || "").toString().trim();

    const daysRaw = body?.days;
    const days =
      typeof daysRaw === "number" && Number.isFinite(daysRaw) && daysRaw > 0
        ? Math.floor(daysRaw)
        : 30;

    if (!agencyId) {
      return NextResponse.json(
        { ok: false, error: "missing_agencyId" },
        { status: 400 }
      );
    }

    // Always call poll on SAME origin (localhost or ngrok)
    const origin = new URL(req.url).origin;
    const pollUrl = `${origin}/api/gmail/poll`;

    const res = await fetch(pollUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-homi-n8n-key": secret,
      },
      body: JSON.stringify({ agencyId, days }),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "poll_failed",
          status: res.status,
          details: json,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: true, poll: json, agencyId, days },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}