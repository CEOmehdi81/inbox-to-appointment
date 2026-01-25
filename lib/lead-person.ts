// lib/lead-person.ts
import type { PrismaClient } from '@prisma/client';

type LeadIdentity = {
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

function normString(v: string | null | undefined): string | null {
  const trimmed = v?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function normPhone(v: string | null | undefined): string | null {
  if (!v) return null;
  const digits = v.replace(/\D+/g, '');
  return digits || null;
}

export async function attachLeadToPerson(
  prisma: PrismaClient,
  leadId: string,
  identity: LeadIdentity,
) {
  const norm_name = normString(identity.contact_name);
  const norm_email = normString(identity.contact_email);
  const norm_phone = normPhone(identity.contact_phone);

  // 1. Find existing person by fuzzy identity
  const person =
    (await prisma.leadPerson.findFirst({
      where: {
        OR: [
          {
            norm_email: norm_email,
            norm_name: norm_name,
          },
          norm_email
            ? {
                norm_email: norm_email,
              }
            : undefined,
          norm_phone
            ? {
                norm_phone: norm_phone,
              }
            : undefined,
        ].filter(Boolean) as any,
      },
    })) ??
    // If not found, create one
    (await prisma.leadPerson.create({
      data: {
        norm_name,
        norm_email,
        norm_phone,
        display_name: identity.contact_name,
        display_email: identity.contact_email,
        display_phone: identity.contact_phone,
      },
    }));

  // 2. Attach lead to this person
  await prisma.lead.update({
    where: { id: leadId },
    data: { person_id: person.id },
  });

  // 3. Recompute stats for this person
  const personLeads = await prisma.lead.findMany({
    where: { person_id: person.id },
    select: {
      listing_id: true,
      portal: true,
      details: {
        select: {
          contact_phone: true,
          raw_text: true,
        },
      },
    },
  });

  const listingIds = new Set<string>();
  const phones = new Set<string>();

  for (const l of personLeads) {
    listingIds.add(l.listing_id);
    if (l.details?.contact_phone) {
      const p = normPhone(l.details.contact_phone);
      if (p) phones.add(p);
    }
  }

  const suspiciousDuplicate = phones.size > 1;

  // 4. Update aggregate stats on LeadPerson
  await prisma.leadPerson.update({
    where: { id: person.id },
    data: {
      total_contacts: personLeads.length,
      listings_count: listingIds.size,
      suspicious_duplicate: suspiciousDuplicate,
      display_name: identity.contact_name ?? person.display_name,
      display_email: identity.contact_email ?? person.display_email,
      display_phone: identity.contact_phone ?? person.display_phone,
    },
  });

  // 5. Log a match event
  // This assumes the model in schema.prisma is `model LeadPersonMatchEvent { ... }`
  const email_exact =
    !!norm_email && norm_email === person.norm_email && !!person.norm_email;
  const phone_exact =
    !!norm_phone && norm_phone === person.norm_phone && !!person.norm_phone;

  // crude 0..1 score
  const name_similarity =
    norm_name && person.norm_name
      ? norm_name === person.norm_name
        ? 1
        : 0
      : 0;

  const same_listing = personLeads.some(l => l.listing_id === leadId);
  const same_portal = personLeads.some(
    l => l.portal && l.portal === personLeads[0]?.portal,
  );

  const score =
    (email_exact ? 0.4 : 0) +
    (phone_exact ? 0.4 : 0) +
    name_similarity * 0.2;

  const decision: 'suspicious' | 'new_person' | 'attach' =
    suspiciousDuplicate ? 'suspicious' : personLeads.length === 1 ? 'new_person' : 'attach';

  await prisma.leadPersonMatchEvent.create({
    data: {
      lead_id: leadId,
      person_id: person.id,
      score,
      email_exact,
      phone_exact,
      name_similarity,
      same_listing,
      same_portal,
      decision,
    },
  });
}