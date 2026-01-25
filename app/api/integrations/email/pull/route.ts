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

    // optional: provider selection, default GMAIL
    const provider = (body?.provider || "GMAIL").toString().toUpperCase();

    if (provider !== "GMAIL") {
      return NextResponse.json({ ok: false, error: "unsupported_provider" }, { status: 400 });
    }

    const secret = (process.env.EMAIL_POLL_SECRET || "").trim();
    if (!secret) {
      return NextResponse.json({ ok: false, error: "missing_EMAIL_POLL_SECRET" }, { status: 500 });
    }

    // call your existing Gmail poll endpoint once
    const url = new URL("/api/gmail/poll", req.url);

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-email-poll-secret": secret,
      },
      body: JSON.stringify({ agencyId }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => null);

    return NextResponse.json(
      { ok: r.ok, status: r.status, result: data },
      { status: r.ok ? 200 : 502 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
await fetch("/api/integrations/email/pull", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ agencyId: "test_agency", provider: "GMAIL" }),
});