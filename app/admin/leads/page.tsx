"use client";

import { useEffect, useMemo, useState } from "react";
import RunInboxButton from "./RunInboxButton";

type BaseLead = {
  id: string;
  listing_id: string;
  portal: string;
  lead_source: string;
  created_at: string;
};

type LeadEvent = {
  lead_id: string;
  language: string | null;
  contact_name: string | null;
  profile: string | null;
  age: number | null;
  has_guarantor: boolean | null;
  budget_monthly: number | null;
  budget_currency?: string | null;
  move_in_timing: string | null;
  city_or_area: string | null;
  visit_preferences: string | null;
  motivation_level: number | null;
  motivation_bucket: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  listing_reference: string | null;
  listing_url: string | null;
  summary?: string | null;
  lead_summary?: string | null;
  raw_text?: string | null;
  email_subject?: string | null;
  lead: BaseLead;
};

type LeadMessage = {
  text: string;
  raw_text: string | null;
  summary: string | null;
  created_at: string;
};

type LeadListing = {
  portal: string;
  listing_id: string;
  listing_reference: string | null;
  listing_url: string | null;
  contact_count: number;
  messages: LeadMessage[];
};

type AggregatedLead = {
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  suspiciousDuplicate: boolean;
  contacts_count: number;
  messages_count: number;
  listings: LeadListing[];
  primary: LeadEvent;
};

type BucketFilter = "all" | "hot" | "warm" | "cold";

const BUCKET_ORDER: Record<string, number> = { hot: 0, warm: 1, cold: 2 };

const norm = (v?: string | null) => (v || "").trim().toLowerCase();
const normPhone = (v?: string | null) => (v ? v.replace(/\D+/g, "") : "");
const normText = (ev: LeadEvent) =>
  (ev.raw_text || ev.summary || ev.lead_summary || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function aggregateLeads(events: LeadEvent[]): AggregatedLead[] {
  type Group = { key: string; name: string | null; email: string | null; phone: string | null; events: LeadEvent[] };

  const groups = new Map<string, Group>();
  const baseKeyPhones = new Map<string, Set<string>>();

  for (const ev of events) {
    const nName = norm(ev.contact_name);
    const nEmail = norm(ev.contact_email);
    const nPhone = normPhone(ev.contact_phone);

    const baseKey = nName || nEmail ? `${nName}|${nEmail}` : `anon|${ev.lead_id}`;
    const personKey = `${baseKey}|${nPhone || "no-phone"}`;

    if (!baseKeyPhones.has(baseKey)) baseKeyPhones.set(baseKey, new Set());
    baseKeyPhones.get(baseKey)!.add(nPhone || "no-phone");

    let g = groups.get(personKey);
    if (!g) {
      g = { key: personKey, name: ev.contact_name, email: ev.contact_email, phone: ev.contact_phone, events: [] };
      groups.set(personKey, g);
    }
    g.events.push(ev);
  }

  const result: AggregatedLead[] = [];

  for (const [personKey, g] of groups.entries()) {
    type ListingBucket = { listing: LeadListing; msgKeys: Set<string> };
    const listingMap = new Map<string, ListingBucket>();
    let contactsCount = 0;

    for (const ev of g.events) {
      contactsCount += 1;

      const listingKey = `${ev.lead.portal}|${ev.lead.listing_id}`;
      let bucket = listingMap.get(listingKey);
      if (!bucket) {
        bucket = {
          listing: {
            portal: ev.lead.portal,
            listing_id: ev.lead.listing_id,
            listing_reference: ev.listing_reference ?? null,
            listing_url: ev.listing_url ?? null,
            contact_count: 0,
            messages: [],
          },
          msgKeys: new Set<string>(),
        };
        listingMap.set(listingKey, bucket);
      }

      bucket.listing.contact_count += 1;

      const t = normText(ev);
      if (!t) continue;
      if (bucket.msgKeys.has(t)) continue;

      bucket.msgKeys.add(t);
      bucket.listing.messages.push({
        text: ev.raw_text || ev.summary || ev.lead_summary || "",
        raw_text: ev.raw_text ?? null,
        summary: ev.summary ?? ev.lead_summary ?? null,
        created_at: ev.lead.created_at,
      });
    }

    const listings = Array.from(listingMap.values()).map((b) => b.listing);
    const messagesCount = listings.reduce((acc, l) => acc + l.messages.length, 0);

    const primary = [...g.events].sort(
      (a, b) => new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime()
    )[0];

    const baseKey = personKey.split("|").slice(0, 2).join("|");
    const phones = baseKeyPhones.get(baseKey) || new Set<string>();
    const suspiciousDuplicate = phones.size > 1;

    result.push({
      key: personKey,
      name: g.name,
      email: g.email,
      phone: g.phone,
      suspiciousDuplicate,
      contacts_count: contactsCount,
      messages_count: messagesCount,
      listings,
      primary,
    });
  }

  return result.sort((a, b) => {
    const ra = BUCKET_ORDER[norm(a.primary.motivation_bucket)] ?? 99;
    const rb = BUCKET_ORDER[norm(b.primary.motivation_bucket)] ?? 99;
    if (ra !== rb) return ra - rb;
    return new Date(b.primary.lead.created_at).getTime() - new Date(a.primary.lead.created_at).getTime();
  });
}

function getAgencyIdFromUrlOrStorage(): string {
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("agencyId");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
    const fromLs = window.localStorage.getItem("homi_agencyId");
    if (fromLs && fromLs.trim()) return fromLs.trim();
    return "";
  } catch {
    return "";
  }
}

export default function LeadsPage() {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");

  const [agencyId, setAgencyId] = useState("");
  const [agencyInput, setAgencyInput] = useState("");

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const arr: LeadEvent[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : Array.isArray((data as any)?.leads)
        ? (data as any).leads
        : [];
      setEvents(arr);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    const aid = getAgencyIdFromUrlOrStorage();
    setAgencyId(aid);
    setAgencyInput(aid);

    (async () => {
      setLoading(true);
      await fetchLeads();
      setLoading(false);
    })();
  }, []);

  const aggregatedAll = useMemo(() => aggregateLeads(events), [events]);

  const aggregated = useMemo(
    () =>
      aggregatedAll.filter((l) => {
        if (bucketFilter === "all") return true;
        return norm(l.primary.motivation_bucket) === bucketFilter;
      }),
    [aggregatedAll, bucketFilter]
  );

  const saveAgency = () => {
    const v = agencyInput.trim();
    setAgencyId(v);
    try {
      window.localStorage.setItem("homi_agencyId", v);
    } catch {}
  };

  if (loading) return <div className="text-sm text-gray-400">Loading leads…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-xl font-semibold text-white">Leads</h1>

        <div className="flex items-center gap-2">
          <input
            value={agencyInput}
            onChange={(e) => setAgencyInput(e.target.value)}
            placeholder="agencyId"
            className="h-9 w-64 rounded-xl bg-black/30 px-3 text-xs text-white border border-white/10"
          />
          <button type="button" onClick={saveAgency} className="h-9 px-3 rounded-xl bg-white/10 text-xs text-gray-200">
            Save
          </button>

          <RunInboxButton agencyId={agencyId} onDone={fetchLeads} />
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "hot", "warm", "cold"] as BucketFilter[]).map((b) => (
          <FilterPill key={b} label={b} active={bucketFilter === b} onClick={() => setBucketFilter(b)} />
        ))}
      </div>

      {aggregated.length === 0 ? (
        <div className="text-sm text-gray-400">No leads.</div>
      ) : (
        <pre className="text-xs text-gray-400 max-h-[60vh] overflow-auto">{JSON.stringify(aggregated, null, 2)}</pre>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold uppercase",
        active ? "bg-[color:var(--brand-primary)]/30 text-[color:var(--brand-primary)]" : "bg-white/10 text-gray-300 hover:bg-white/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}