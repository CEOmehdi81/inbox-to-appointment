// app/admin/leads/[leadId]/page.tsx
import { prisma } from "@/lib/db"; // same path as above
import Link from "next/link";

type Props = {
  params: { leadId: string };
};

export default async function LeadDetailPage({ params }: Props) {
  const leadDetail = await prisma.leadDetails.findUnique({
    where: { lead_id: params.leadId },
    include: { lead: true },
  });

  if (!leadDetail) {
    return (
      <div className="p-6">
        <Link href="/admin/leads" className="text-blue-400 hover:underline">
          ← Back to leads
        </Link>
        <p className="mt-4 text-red-400">Lead not found.</p>
      </div>
    );
  }

  const l = leadDetail;

  return (
    <div className="p-6 space-y-6">
      <Link href="/admin/leads" className="text-blue-400 hover:underline">
        ← Back to leads
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">
          {l.contact_name ?? "Lead"}{" "}
          <span className="text-sm text-zinc-400">
            ({l.lead?.portal ?? "unknown portal"})
          </span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Received:{" "}
          {l.lead?.created_at
            ? new Date(l.lead.created_at).toLocaleString()
            : "unknown"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card label="Language" value={l.language} />
        <Card label="Age" value={l.age?.toString()} />
        <Card label="Profile" value={l.profile} />
        <Card
          label="Budget monthly"
          value={l.budget_monthly != null ? `${l.budget_monthly} €` : ""}
        />
        <Card label="City / Area" value={l.city_or_area} />
        <Card label="Move-in timing" value={l.move_in_timing} />
        <Card label="Has guarantor" value={l.has_guarantor?.toString()} />
        <Card label="Phone" value={l.contact_phone} />
        <Card label="Email" value={l.contact_email} />
        <Card label="Listing ref" value={l.listing_reference} />
        <Card label="Listing URL" value={l.listing_url} />
        <Card label="Motivation level" value={l.motivation_level?.toString()} />
        <Card label="Motivation bucket" value={l.motivation_bucket} />
      </div>

      {l.summary && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Summary</h2>
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">
            {l.summary}
          </p>
        </div>
      )}

      {l.raw_text && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Original message</h2>
          <pre className="text-sm bg-zinc-900/70 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {l.raw_text}
          </pre>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-zinc-100">
        {value && value.length > 0 ? value : "—"}
      </div>
    </div>
  );
}