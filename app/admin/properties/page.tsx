// app/admin/properties/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { PropertyStatus } from "@prisma/client";

type StatusFilter = "all" | "active" | "pending" | "draft";

// The shape we select from Prisma so our .map() is strongly typed
type Row = {
  id: string;
  title: string;
  city: string | null;
  address: string | null;
  priceMonthly: number | null;
  status: PropertyStatus;
  updatedAt: Date;
};

function StatusBadge({ s }: { s: PropertyStatus }) {
  const map: Record<PropertyStatus, string> = {
    active:
      "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20",
    pending:
      "bg-yellow-500/15 text-yellow-300 ring-1 ring-inset ring-yellow-400/20",
    draft:
      "bg-gray-500/15 text-gray-300 ring-1 ring-inset ring-gray-400/20",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${map[s]}`}>
      {s}
    </span>
  );
}

function buildWhere(status: StatusFilter, q?: string) {
  const where: any = {};
  if (status !== "all") where.status = status as PropertyStatus;
  if (q && q.trim()) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams?: { status?: StatusFilter; q?: string };
}) {
  const status = (searchParams?.status as StatusFilter) ?? "all";
  const q = searchParams?.q ?? "";

  const items: Row[] = await prisma.property.findMany({
    where: buildWhere(status, q),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      city: true,
      address: true,
      priceMonthly: true,
      status: true,
      updatedAt: true,
    },
  });

  const buttons: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "draft", label: "Draft" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Properties</h2>

          <div className="flex items-center gap-2">
            {buttons.map(({ key, label }) => (
              <Link
                key={key}
                href={`/admin/properties?status=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border",
                  status === key
                    ? "bg-white/10 border-white/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}

            <form className="hidden md:block" method="GET" action="/admin/properties">
              <input type="hidden" name="status" value={status} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search for anything…"
                className="w-[260px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              />
            </form>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-gray-400">
                {["Listing", "City", "Price", "Status", "Updated", "Actions"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    No properties.
                  </td>
                </tr>
              )}

              {items.map((p: Row, idx: number) => (
                <tr
                  key={p.id}
                  className={[
                    "text-sm",
                    idx % 2 ? "bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-white/[0.03] transition-colors",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-400">{p.address}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.city || "-"}</td>
                  <td className="px-4 py-3">
                    {p.priceMonthly != null ? eur.format(p.priceMonthly) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge s={p.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(p.updatedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs hover:bg-white/10">
                        View
                      </button>
                      <button className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs hover:bg-white/10">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}