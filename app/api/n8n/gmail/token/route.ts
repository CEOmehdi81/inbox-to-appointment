import { NextResponse } from "next/server";
import { getValidGmailAccessToken } from "@/lib/gmail";

function mustAuth(req: Request) {
  const got = req.headers.get("x-homi-n8n-key");
  const expected = process.env.N8N_SHARED_SECRET;
  if (!expected) throw new Error("Missing env N8N_SHARED_SECRET");
  if (!got || got !== expected) throw new Error("Unauthorized");
}

export async function POST(req: Request) {
  try {
    mustAuth(req);
    const body = await req.json().catch(() => ({}));
    const agencyId = body?.agencyId as string | undefined;
    if (!agencyId) return NextResponse.json({ error: "agencyId required" }, { status: 400 });

    const accessToken = await getValidGmailAccessToken(agencyId);

    return NextResponse.json({ accessToken });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "token_error" }, { status: 401 });
  }
}