// app/admin/page.tsx
import RevenueChart from "@/components/RevenueChart";
import ActivityDonut from "@/components/ActivityDonut";
import ClientListingsCard from "@/components/ClientListingsCard";

// If you want to feed real rows later, you'll pass them like:
// <ClientListingsCard rows={rowsFromDB} />

export default async function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Top greeting / intro */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Welcome back 👋</h1>
          <p className="text-sm text-gray-400">
            Here’s what’s happening with your listings today.
          </p>
        </div>

        {/* (Optional) search placeholder – wire up later */}
        <div className="hidden md:block">
          <input
            placeholder="Search anything…"
            className="w-[260px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
          <div className="text-xs text-gray-400">New leads</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-2xl font-semibold">24</div>
            <div className="text-emerald-400 text-xs">+3.2%</div>
          </div>
        </div>

        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
          <div className="text-xs text-gray-400">Viewings scheduled</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-2xl font-semibold">12</div>
            <div className="text-rose-400 text-xs">-1.1%</div>
          </div>
        </div>

        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
          <div className="text-xs text-gray-400">Applications</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-2xl font-semibold">7</div>
            <div className="text-emerald-400 text-xs">+0.8%</div>
          </div>
        </div>
      </div>

      {/* Analytics + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analytics (2/3 width) */}
        <div className="lg:col-span-2 bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Analytics</div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[color:var(--brand-primary)]" /> Income
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[color:var(--brand-lime)]" /> Outcome
              </span>
            </div>
          </div>

          <RevenueChart />
        </div>

        {/* Activity (1/3 width) */}
        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
          <div className="text-sm font-medium mb-3">Activity</div>
          <ActivityDonut />
        </div>
      </div>

      {/* Client listings */}
      <ClientListingsCard />
    </div>
  );
}