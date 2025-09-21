import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rotatingCode } from '@/lib/documents';

export async function GET(
  _req: Request,
  { params }: { params: { shareId: string } }
) {
  const { shareId } = params;

  const share = await prisma.documentShare.findUnique({
    where: { id: shareId },
    include: { document: true },
  });

  if (!share || !share.document) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Share expired' }, { status: 410 });
  }

  const { code, expiresInMs } = rotatingCode(share.document.totpSecret);
  return NextResponse.json({
    shareId,
    documentId: share.documentId,
    code,
    expiresInMs,
  });
}