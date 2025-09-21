"use client";

import React, { useMemo, useState } from "react";

export type ClientListingRow = {
  id: string;
  client: string;       // Display name
  initials?: string;    // For the avatar circle
  listing: string;      // Title
  city: string;
  price: string;        // Already formatted (e.g. "€2,150")
  status: "active" | "pending" | "draft" | "archived";
};

type Props = {
  /** Pass real rows later; falls back to mock rows if omitted. */
  rows?: ClientListingRow[];
};

const MOCK_ROWS: ClientListingRow[] = [
  {
    id: "1",
    client: "Alex Martin",
    initials: "AM",
    listing: "2BR – Rivoli Apartment",
    city: "Paris",
    price: "€2,150",
    status: "active",
  },
  {
    id: "2",
    client: "Dana Roy",
    initials: "DR",
    listing: "Studio – Canal Saint-Martin",
    city: "Paris",
    price: "€1,250",
    status: "pending",
  },
  {
    id: "3",
    client: "John Test",
    initials: "JT",
    listing: "Loft – Belleville",
    city: "Paris",
    price: "€1,890",
    status: "draft",
  },
];

const STATUS_LABELS = {
  all: "All status",
  active: "active",
  pending: "pending",
  draft: "draft",
  archived: "archived",
} as const;

type StatusFilter = keyof typeof STATUS_LABELS;

function StatusPill({ s }: { s: ClientListingRow["status"] }) {
  const map: Record<ClientListingRow["status"], string> = {
    active:
      "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20",
    pending:
      "bg-yellow-500/15 text-yellow-300 ring-1 ring-inset ring-yellow-400/20",
    draft:
      "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-400/20",
    archived:
      "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-400/20",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${map[s]}`}>
      {s}
    </span>
  );
}

export default function ClientListingsCard({ rows }: Props) {
  const data = rows && rows.length ? rows : MOCK_ROWS;

  // --- Controls state ---
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  // --- Filtering ---
  const filtered = useMemo(() => {
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

    const tokens = norm(q).split(/\s+/).filter(Boolean);

    return data.filter((r) => {
      if (status !== "all" && r.status !== status) return false;

      if (tokens.length === 0) return true;

      const hay = norm(
        `${r.client} ${r.listing} ${r.city} ${r.price} ${r.status}`
      );

      return tokens.every((t) => hay.includes(t));
    });
  }, [data, q, status]);

  return (
    <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Client listings</div>

        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              aria-haspopup="listbox"
              aria-expanded={open}
              type="button"
            >
              <span className="text-gray-300">
                {STATUS_LABELS[status] as string}
              </span>
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-gray-400">
                <path fill="currentColor" d="M5 7l5 6 5-6H5z" />
              </svg>
            </button>

            {open && (
              <ul
                role="listbox"
                className="absolute right-0 mt-2 w-40 rounded-xl bg-[color:var(--brand-card)] border border-white/10 shadow-[var(--shadow-soft)] p-1 text-sm z-10"
              >
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
                  <li key={key}>
                    <button
                      role="option"
                      aria-selected={status === key}
                      className={[
                        "w-full text-left px-3 py-2 rounded-lg",
                        status === key
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5",
                      ].join(" ")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setStatus(key);
                        setOpen(false);
                      }}
                    >
                      {STATUS_LABELS[key]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Search */}
          <div className="hidden md:block">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for anything…"
              className="w-[260px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-white/[0.02] text-xs text-gray-400">
              {["Client", "Listing", "City", "Price", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="text-left font-medium px-4 py-3">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  No results.
                </td>
              </tr>
            )}

            {filtered.map((r, idx) => (
              <tr
                key={r.id}
                className={[
                  "text-sm",
                  idx % 2 ? "bg-white/[0.01]" : "bg-transparent",
                  "hover:bg-white/[0.03] transition-colors",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-white/5 border border-white/10 grid place-items-center text-xs text-gray-300">
                      {r.initials ?? r.client.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium">{r.client}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">{r.listing}</td>
                <td className="px-4 py-3 text-gray-300">{r.city}</td>
                <td className="px-4 py-3">{r.price}</td>
                <td className="px-4 py-3">
                  <StatusPill s={r.status} />
                </td>
                <td className="px-4 py-3">
                  <button className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs hover:bg-white/10">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}