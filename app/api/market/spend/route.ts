import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

type SpendPayload = {
  portal: string;
  month: string;   // "YYYY-MM"
  amount: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SpendPayload>;
    const portal = body.portal?.trim();
    const month = body.month?.trim();
    const amount = body.amount;

    // Validation
    if (!portal || !month || typeof amount !== 'number' || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: 'portal, month and numeric amount are required' },
        { status: 400 }
      );
    }

    // Upsert (portal, month)
    const record = await prisma.spend.upsert({
      where: {
        portal_month: {
          portal,
          month,
        },
      },
      update: {
        amount,
      },
      create: {
        id: randomUUID(),   // REQUIRED in your schema
        portal,
        month,
        amount,
      },
    });

    return NextResponse.json(
      {
        id: record.id,
        portal: record.portal,
        month: record.month,
        amount: Number(record.amount),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in POST /api/market/spend', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}