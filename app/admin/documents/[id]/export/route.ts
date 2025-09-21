// app/admin/documents/[id]/export/route.ts
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const url = new URL(req.url);

  const q    = (url.searchParams.get('q') || '').trim();
  const from = (url.searchParams.get('from') || '').trim();
  const to   = (url.searchParams.get('to') || '').trim();
  const code = (url.searchParams.get('code') || '').trim(); // NEW

  const where: any = { documentId: id };
  const and: any[] = [];

  if (q) {
    and.push({
      OR: [
        { viewerEmail: { contains: q, mode: 'insensitive' } },
        { ip:          { contains: q } },
        { shareId:     { contains: q } },
      ],
    });
  }

  // NEW: code filter (exact if 6 digits, else contains)
  if (code) {
    if (/^\d{6}$/.test(code)) {
      and.push({ codeShown: code });
    } else {
      and.push({ codeShown: { contains: code } });
    }
  }

  if (from) {
    const gte = new Date(`${from}T00:00:00.000Z`);
    and.push({ viewedAt: { gte } });
  }
  if (to) {
    const nextDay = new Date(`${to}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    and.push({ viewedAt: { lt: nextDay } });
  }

  if (and.length) where.AND = and;

  const views = await prisma.documentView.findMany({
    where,
    orderBy: { viewedAt: 'desc' },
  });

  const header = ['viewedAt','shareId','codeShown','viewerEmail','ip','userAgent'].join(',');
  const rows = views.map(v => {
    const cells = [
      v.viewedAt.toISOString(),
      v.shareId,
      v.codeShown,
      v.viewerEmail || '',
      v.ip || '',
      (v.userAgent || '').replaceAll(',', ' '),
    ];
    return cells.map(c => `"${c.replaceAll('"','""')}"`).join(',');
  });

  const csv = [header, ...rows].join('\n');
  const bytes = new TextEncoder().encode(csv);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="document-${id}-views.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}