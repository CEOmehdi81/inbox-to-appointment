import { NextRequest, NextResponse } from 'next/server';
import { getListingHealthRows } from '@/lib/queries/listingHealth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const portal = searchParams.get('portal') || undefined;
  const underperformingOnly =
    (searchParams.get('underperformingOnly') || '').toLowerCase() === 'true';
  const limit = Number(searchParams.get('limit') || '100');

  const rows = await getListingHealthRows({
    portal,
    underperformingOnly,
    limit,
  });

  return NextResponse.json(rows);
}