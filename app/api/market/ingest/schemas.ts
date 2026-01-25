import { z } from "zod";

// ---------- Listing ----------

const ListingInputSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    portal: z.string(),
    location: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    listed_at: z.string().nullable().optional(), // ISO string
  })
  .passthrough();

// ---------- Spend ----------

const SpendInputSchema = z
  .object({
    id: z.string().optional(),
    portal: z.string(),
    month: z.string(), // "YYYY-MM"
    amount: z.number(),
  })
  .passthrough();

// ---------- Helpers for coercion ----------

const CoercedNumberNullable = z
  .union([
    z.coerce.number(),       // 22 or "22"
    z.null(),                // explicitly null
  ])
  .nullable()
  .optional();

const CoercedBooleanNullable = z
  .union([
    z.boolean(),
    z
      .string()
      .transform((v) => {
        const val = v.trim().toLowerCase();
        if (val === "true" || val === "1" || val === "yes" || val === "oui") {
          return true;
        }
        if (val === "false" || val === "0" || val === "no" || val === "non") {
          return false;
        }
        return null;
      }),
    z.null(),
  ])
  .nullable()
  .optional();

// ---------- Lead (core + enriched) ----------

export const LeadInputSchema = z
  .object({
    // core technical fields
    id: z.string().nullable().optional(),
    listing_id: z.string(),
    portal: z.string(),
    lead_source: z.string(),
    created_at: z.string(), // ISO string

    // enriched fields coming from the LLM / n8n
    lead_language: z.string().nullable().optional(),
    lead_type: z.string().nullable().optional(), // "rental" | "sale" | null
    profile: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    contact_email: z.string().nullable().optional(),
    contact_phone: z.string().nullable().optional(),

    listing_reference: z.string().nullable().optional(),
    listing_url: z.string().nullable().optional(),

    // numeric / boolean with coercion
    age: CoercedNumberNullable,
    has_guarantor: CoercedBooleanNullable,
    budget_monthly: CoercedNumberNullable,
    motivation_level: CoercedNumberNullable,

    budget_currency: z.string().nullable().optional(),
    move_in_timing: z.string().nullable().optional(),
    city_or_area: z.string().nullable().optional(),
    visit_preferences: z.string().nullable().optional(),
    motivation_bucket: z.string().nullable().optional(),

    // text blobs
    lead_summary: z.string().nullable().optional(),
    raw_text: z.string().nullable().optional(),
    email_subject: z.string().nullable().optional(),
  })
  .passthrough();

export type LeadInput = z.infer<typeof LeadInputSchema>;

// ---------- Ingest body ----------

export const IngestBodySchema = z
  .object({
    listings: z.array(ListingInputSchema).optional(),
    leads: z.array(LeadInputSchema).optional(),
    spend: z.array(SpendInputSchema).optional(),
  })
  .passthrough();

export type IngestBody = z.infer<typeof IngestBodySchema>;