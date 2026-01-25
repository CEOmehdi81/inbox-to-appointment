import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // keep it explicit

function pickText(payload: any) {
  const change = payload?.entry?.[0]?.changes?.[0];
  const value = change?.value;

  const msg = value?.messages?.[0];
  const contact = value?.contacts?.[0];

  return {
    field: change?.field,
    from: msg?.from,
    messageId: msg?.id,
    timestamp: msg?.timestamp,
    type: msg?.type,
    text: msg?.text?.body,
    contactName: contact?.profile?.name,
    waId: contact?.wa_id,
    phoneNumberId: value?.metadata?.phone_number_id,
    displayPhone: value?.metadata?.display_phone_number,
  };
}

// GET: Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const token = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 403 });
}

// POST: incoming webhook events
export async function POST(req: NextRequest) {
  const raw = await req.text();

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("META WEBHOOK INVALID JSON RAW:", raw);
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // 1) raw + full json
  console.log("META WEBHOOK RAW:", raw);
  console.log("META WEBHOOK JSON:", JSON.stringify(json, null, 2));

  // 2) extracted message summary (what you actually care about)
  const summary = pickText(json);
  console.log("META WEBHOOK SUMMARY:", summary);

  return NextResponse.json({ ok: true });
}