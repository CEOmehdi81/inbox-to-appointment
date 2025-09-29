// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 });
  }

  const listingId = String(body.listingId || '').trim();
  const name = (body.name ? String(body.name).trim() : '') || null;
  const email = (body.email ? String(body.email).trim() : '') || null;
  const phone = (body.phone ? String(body.phone).trim() : '') || null;

  if (!listingId) {
    return NextResponse.json({ ok: false, error: 'Missing listingId' }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ ok: false, error: 'Provide email or phone' }, { status: 400 });
  }

  // ensure listing exists
  const exists = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ ok: false, error: 'Unknown listing' }, { status: 404 });
  }

  const lead = await prisma.lead.create({
    data: {
      listingId,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
    },
  });

  // Optional: also drop an analytics event (ignore if it fails)
  prisma.listingEvent.create({
    data: { listingId, type: 'lead_click' as any, sessionId: req.cookies.get('homi_sid')?.value ?? undefined },
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}