import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['pending', 'accepted', 'declined']);

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: params.id },
  });
  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(appt);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => null);
    const status = body?.status as string | undefined;

    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

