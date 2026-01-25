import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LeadRow = any; // Prisma returns plain objects, we'll treat them loosely

function normString(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function normPhone(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D+/g, '');
}

function normText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function GET() {
  try {
    const rows: LeadRow[] = await prisma.leadDetails.findMany({
      include: { lead: true },
      orderBy: { lead: { created_at: 'asc' } },
    });

    type MessageAgg = {
      text: string;
      raw_text: string | null;
      summary: string | null;
      created_at: string;
    };

    type InterestAgg = {
      portal: string;
      listing_id: string;
      listing_reference: string | null;
      listing_url: string | null;
      contact_count: number;
      first_contact_at: string;
      last_contact_at: string;
      messages: Map<string, MessageAgg>; // key = normText
    };

    type PhoneAgg = {
      phone: string | null;
      interests: Map<string, InterestAgg>; // key = portal|listing_id
    };

    type PersonBaseAgg = {
      name: string | null;
      email: string | null;
      phones: Map<string, PhoneAgg>; // key = normPhone or 'no-phone'
    };

    const personBaseMap = new Map<string, PersonBaseAgg>();

    for (const row of rows) {
      const name = row.contact_name as string | null;
      const email = row.contact_email as string | null;
      const phone = row.contact_phone as string | null;

      const normName = normString(name);
      const normEmail = normString(email);
      const normPhoneVal = normPhone(phone);

      // Base person identity: name + email
      // If both missing, fall back to lead id so we don't merge unrelated people
      const baseKey =
        normName || normEmail
          ? `${normName}|${normEmail}`
          : `anon|${row.lead.id}`;

      const phoneKey = normPhoneVal || 'no-phone';

      let person = personBaseMap.get(baseKey);
      if (!person) {
        person = {
          name,
          email,
          phones: new Map<string, PhoneAgg>(),
        };
        personBaseMap.set(baseKey, person);
      }

      let phoneAgg = person.phones.get(phoneKey);
      if (!phoneAgg) {
        phoneAgg = {
          phone,
          interests: new Map<string, InterestAgg>(),
        };
        person.phones.set(phoneKey, phoneAgg);
      }

      const portal = row.lead.portal as string;
      const listing_id = row.lead.listing_id as string;

      const interestKey = `${portal}|${listing_id}`;
      let interest = phoneAgg.interests.get(interestKey);

      const createdAtIso = row.lead.created_at.toISOString();
      const listing_reference = (row.listing_reference as string | null) ?? null;
      const listing_url = (row.listing_url as string | null) ?? null;

      if (!interest) {
        interest = {
          portal,
          listing_id,
          listing_reference,
          listing_url,
          contact_count: 0,
          first_contact_at: createdAtIso,
          last_contact_at: createdAtIso,
          messages: new Map<string, MessageAgg>(),
        };
        phoneAgg.interests.set(interestKey, interest);
      }

      // Update contact count and dates
      interest.contact_count += 1;
      if (createdAtIso < interest.first_contact_at) {
        interest.first_contact_at = createdAtIso;
      }
      if (createdAtIso > interest.last_contact_at) {
        interest.last_contact_at = createdAtIso;
      }

      // Messages: apply "same text" dedupe
      const rawText = (row.raw_text as string | null) ?? null;
      const summary = (row.summary as string | null) ?? null;
      const primaryText = rawText || summary || '';
      const normMsg = normText(primaryText);

      if (normMsg) {
        if (!interest.messages.has(normMsg)) {
          interest.messages.set(normMsg, {
            text: primaryText,
            raw_text: rawText,
            summary,
            created_at: createdAtIso,
          });
        }
      }
    }

    // Now flatten personBaseMap into display objects following your rules
    const people: any[] = [];

    for (const [baseKey, person] of personBaseMap.entries()) {
      const phoneEntries = Array.from(person.phones.entries());
      const multiplePhones = phoneEntries.length > 1;

      for (const [phoneKey, phoneAgg] of phoneEntries) {
        const interests = Array.from(phoneAgg.interests.values());

        // Compute metrics
        let contactsTotal = 0;
        let messagesTotal = 0;
        let firstContactAt: string | null = null;
        let lastContactAt: string | null = null;

        for (const interest of interests) {
          contactsTotal += interest.contact_count;
          messagesTotal += interest.messages.size;

          if (!firstContactAt || interest.first_contact_at < firstContactAt) {
            firstContactAt = interest.first_contact_at;
          }
          if (!lastContactAt || interest.last_contact_at > lastContactAt) {
            lastContactAt = interest.last_contact_at;
          }
        }

        people.push({
          person_name: person.name,
          person_email: person.email,
          person_phone: phoneAgg.phone,
          suspicious_duplicate: multiplePhones,
          contacts_total: contactsTotal,
          messages_total: messagesTotal,
          first_contact_at: firstContactAt,
          last_contact_at: lastContactAt,
          interests: interests.map(interest => ({
            portal: interest.portal,
            listing_id: interest.listing_id,
            listing_reference: interest.listing_reference,
            listing_url: interest.listing_url,
            contact_count: interest.contact_count,
            first_contact_at: interest.first_contact_at,
            last_contact_at: interest.last_contact_at,
            messages: Array.from(interest.messages.values()),
          })),
        });
      }
    }

    return NextResponse.json(people);
  } catch (err) {
    console.error('GET /api/lead-people failed', err);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 },
    );
  }
}