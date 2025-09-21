// app/admin/customers/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";

// Reuse appointment statuses for filtering customers by the status
// of at least one of their appointments.
type StatusFilter = "all" | "confirmed" | "pending" | "cancelled";

function buildWhere(status: StatusFilter, q?: string) {
  const where: any = {};
  if (status !== "all") where.status = status;
  if (q && q.trim()) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: { status?: StatusFilter; q?: string };
}) {
  const status = (searchParams?.status as StatusFilter) ?? "all";
  const q = searchParams?.q ?? "";

  // Group appointments by customer to derive a customers list
  const groups = await prisma.appointment.groupBy({
    by: ["customerEmail", "customerName"],
    where: buildWhere(status, q),
    _count: { _all: true },
    _max: { createdAt: true, requestedStart: true },
    orderBy: {
      // recent activity first
      _max: { createdAt: "desc" },
    },
  });

  const items = groups.map((g) => ({
    email: g.customerEmail,
    name: g.customerName,
    count: g._count._all,
    lastCreatedAt: g._max.createdAt,
    lastRequestedStart: g._max.requestedStart,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Customers</h2>

          <div className="flex items-center gap-2">
            {(["all", "confirmed", "pending", "cancelled"] as StatusFilter[]).map(
              (s) => (
                <Link
                  key={s}
                  href={`/admin/customers?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={[
                    "px-3 py-1.5 rounded-lg text-sm border",
                    s === status
                      ? "bg-white/10 border-white/10"
                      : "bg-white/5 border-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  {s === "all"
                    ? "All"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </Link>
              )
            )}

            {/* Simple GET search (press Enter) */}
            <form className="ml-2" method="get" action="/admin/customers">
              {/* keep the status when searching */}
              <input type="hidden" name="status" value={status} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name or email…"
                className="w-[220px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              />
            </form>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-gray-400">
                {["Customer", "Email", "Appointments", "Last activity", "Actions"].map(
                  (h) => (
                    <th key={h} className="text-left font-medium px-4 py-3">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No customers.
                  </td>
                </tr>
              )}

              {items.map((c, idx) => (
                <tr
                  key={c.email}
                  className={[
                    "text-sm",
                    idx % 2 ? "bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-white/[0.03] transition-colors",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="text-blue-400 hover:underline"
                      href={`mailto:${c.email}`}
                    >
                      {c.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.count}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {c.lastCreatedAt
                      ? new Date(c.lastCreatedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/appointments?date=all&q=${encodeURIComponent(
                          c.email
                        )}`}
                        className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs hover:bg-white/10"
                      >
                        View appointments
                      </Link>
                      <a
                        href={`mailto:${c.email}`}
                        className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs hover:bg-white/10"
                      >
                        Message
                      </a>
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