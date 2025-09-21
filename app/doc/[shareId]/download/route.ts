// app/doc/[shareId]/download/route.ts
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { rotatingCode } from "@/lib/documents";
import path from "path";
import fs from "fs/promises";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;

  // 1) Load share + document
  const share = await prisma.documentShare.findUnique({
    where: { id: shareId },
    include: { document: true },
  });
  if (!share || !share.document) {
    return new Response("Share not found", { status: 404 });
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return new Response("Share expired", { status: 410 });
  }

  // Enforce download permission (inline is always allowed)
  const isAttachment = req.nextUrl.searchParams.get("download") === "1";
  if (isAttachment && !share.canDownload) {
    return new Response("Downloads disabled for this share", { status: 403 });
  }

  // 2) Current rotating code
  const { code } = rotatingCode(share.document.totpSecret);

  // 3) Load original PDF
  const absPath = path.join(process.cwd(), "public", share.document.storageKey);
  const srcBytes = await fs.readFile(absPath);
  const pdf = await PDFDocument.load(srcBytes);

  // 4) Watermark
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  const bigText = `HOMI • SHARE ${share.id} • CODE ${code}`;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    // Size relative to page so it looks good on any doc
    const size = Math.round(Math.min(width, height) * 0.035);
    const textWidth = bold.widthOfTextAtSize(bigText, size);

    // Big diagonal center
    page.drawText(bigText, {
      x: (width - textWidth) / 2,
      y: height * 0.55,
      size,
      font: bold,
      color: rgb(0.55, 0.55, 0.55),
      rotate: degrees(-20),
      opacity: 0.2, // ignored on older pdf-lib, safe to leave
    });

    // Small footer (helps verification in screenshots/prints)
    const footer = `Share ${share.id} • Code ${code} • ${new Date().toLocaleString()}`;
    page.drawText(footer, {
      x: 24,
      y: 24,
      size: 10,
      font: regular,
      color: rgb(0.9, 0.9, 0.9),
      opacity: 0.75,
    });
  }

  const out = await pdf.save();

  // 5) Log a view (non-fatal if it fails)
  try {
    await prisma.documentView.create({
      data: {
        documentId: share.documentId,
        shareId: share.id,
        viewerEmail: "", // set if you have auth
        codeShown: code,
        ip: req.headers.get("x-forwarded-for") ?? "",
        userAgent: req.headers.get("user-agent") ?? "",
      },
    });
  } catch {}

  // 6) Send file; `download=1` forces attachment, otherwise inline
  const niceName = share.document.filename?.replace(/"/g, "") || "document.pdf";

  return new Response(Buffer.from(out), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `${isAttachment ? "attachment" : "inline"}; filename="${niceName}"`,
      "Content-Length": String(out.byteLength),
    },
  });
}