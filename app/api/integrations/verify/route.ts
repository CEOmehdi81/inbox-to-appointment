import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidGmailAccessToken } from "@/lib/gmail";

async function gmailFetch(accessToken: string, path: string) {
  return fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const agencyId = body?.agencyId as string | undefined;
  if (!agencyId) return NextResponse.json({ error: "agencyId required" }, { status: 400 });

  const integration = await prisma.emailIntegration.findUnique({ where: { agencyId } });
  if (!integration) return NextResponse.json({ error: "No integration" }, { status: 404 });

  try {
    const accessToken = await getValidGmailAccessToken(agencyId);

    // Sample last 20 messages
    const listRes = await gmailFetch(accessToken, "/messages?maxResults=20");
    if (!listRes.ok) throw new Error(await listRes.text());

    const listJson: any = await listRes.json();
    const ids: string[] = (listJson.messages ?? []).map((m: any) => m.id).filter(Boolean);

    // Heuristic: if mailbox has 0 messages or we cannot access, keep it ERROR
    if (ids.length === 0) {
      await prisma.emailIntegration.update({
        where: { agencyId },
        data: { status: "RESTRICTED", lastError: "No messages found. Likely wrong inbox for leads." },
      });
      return NextResponse.json({ ok: false, status: "RESTRICTED" });
    }

    // Optional: try to label one message to confirm write access
    // If you only requested readonly, skip this.
    if (integration.labelId) {
      const mid = ids[0];
      const modRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${mid}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ addLabelIds: [integration.labelId] }),
      });

      // If modify fails, you can still keep CONNECTED but warn
      if (!modRes.ok) {
        await prisma.emailIntegration.update({
          where: { agencyId },
          data: { status: "CONNECTED", lastError: "Label write failed. Check scopes." },
        });
        return NextResponse.json({ ok: true, status: "CONNECTED", warning: "label_write_failed" });
      }
    }

    await prisma.emailIntegration.update({
      where: { agencyId },
      data: { status: "VERIFIED", verifiedAt: new Date(), lastError: null },
    });

    return NextResponse.json({ ok: true, status: "VERIFIED" });
  } catch (e: any) {
    await prisma.emailIntegration.update({
      where: { agencyId },
      data: { status: "ERROR", lastError: e?.message ?? "verify_failed" },
    });
    return NextResponse.json({ ok: false, status: "ERROR", error: e?.message ?? "verify_failed" }, { status: 400 });
  }
}