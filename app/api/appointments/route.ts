import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDateRange } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = (searchParams.get('date') || 'today') as 'today' | 'week' | 'all';

  const { start, end } = getDateRange(date);
  const where: any = {};
  if (start && end) where.requestedStart = { gte: start, lt: end };

  const items = await prisma.appointment.findMany({
    where,
    orderBy: { requestedStart: 'asc' },
  });

  return NextResponse.json({ items });
}

