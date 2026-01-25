import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const personId = params.id;

  const [person, events] = await Promise.all([
    prisma.leadPerson.findUnique({
      where: { id: personId },
      include: {
        leads: {
          select: {
            id: true,
            created_at: true,
            listing_id: true,
          },
          orderBy: { created_at: "desc" },
        },
      },
    }),
    prisma.leadPersonMatchEvent.findMany({
      where: { person_id: personId },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
  ]);

  if (!person) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    person: {
      id: person.id,
      display_name: person.display_name,
      display_email: person.display_email,
      display_phone: person.display_phone,
      total_contacts: person.total_contacts,
      listings_count: person.listings_count,
      suspicious_duplicate: person.suspicious_duplicate,
      leads: person.leads,
    },
    events,
  });
}