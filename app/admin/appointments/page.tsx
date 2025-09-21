// app/admin/appointments/page.tsx
import Link from "next/link";

type DateFilter = "today" | "week" | "all";
type AppointmentStatus = "confirmed" | "pending" | "cancelled";

type Item = {
  id: string;
  customerName: string;
  customerEmail: string;
  requestedStart: string; // ISO
  status: AppointmentStatus;
  createdAt: string;      // ISO
  locale?: string;
};

// --- mock data just to see the styling (delete later) ---
const MOCK: Item[] = [
  {
    id: "a1",
    customerName: "Alex Martin",
    customerEmail: "alex@example.com",
    requestedStart: new Date().toISOString(),
    status: "confirmed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "a2",
    customerName: "Fatou Ndiaye",
    customerEmail: "fatou@example.com",
    requestedStart: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "a3",
    customerName: "Leo Fischer",
    customerEmail: "leo@example.com",
    requestedStart: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: "cancelled",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

// little pill for status
function StatusPill({ s }: { s: AppointmentStatus }) {
  const map: Record<AppointmentStatus, string> = {
    confirmed:
      "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20",
    pending:
      "bg-yellow-500/15 text-yellow-300 ring-1 ring-inset ring-yellow-400/20",
    cancelled:
      "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-400/20",
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${map[s]}`}>
      {s}
    </span>
  );
}

export default function AppointmentsPage({
  searchParams,
}: {
  searchParams?: { date?: DateFilter };
}) {
  const date = (searchParams?.date as DateFilter) ?? "today";

  // simple filter just so the buttons do something in mock mode
  const now = Date.now();
  const filtered =
    date === "all"
      ? MOCK
      : date === "week"
      ? MOCK.filter(
          (i) => now - new Date(i.createdAt).getTime() < 1000 * 60 * 60 * 24 * 7
        )
      : MOCK.filter(
          (i) => now - new Date(i.createdAt).getTime() < 1000 * 60 * 60 * 24
        );

  return (
    <div className="space-y-4">
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Appointments</h2>

          <div className="flex gap-2">
            {(["today", "week", "all"] as DateFilter[]).map((d) => (
              <Link
                key={d}
                href={`/admin/appointments?date=${d === "week" ? "week" : d}`}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border",
                  d === date
                    ? "bg-white/10 border-white/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10",
                ].join(" ")}
              >
                {d === "week" ? "This week" : d === "all" ? "All" : "Today"}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-gray-400">
                {["Customer", "Email", "Local time", "Status", "Created", "Actions"].map(
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
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No appointments.
                  </td>
                </tr>
              )}

              {filtered.map((a, idx) => (
                <tr
                  key={a.id}
                  className={[
                    "text-sm",
                    idx % 2 ? "bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-white/[0.03] transition-colors",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.customerName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="text-blue-400 hover:underline"
                      href={`mailto:${a.customerEmail}`}
                    >
                      {a.customerEmail}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {new Date(a.requestedStart).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill s={a.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(a.createdAt).toLocaleString(undefined, {
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
                        Message
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