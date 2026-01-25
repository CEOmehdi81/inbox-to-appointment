import { getListingHealthRows } from '@/lib/queries/listingHealth';
import { getPortalRoiRows } from '@/lib/queries/portalRoi';
import { getAttributionRows } from '@/lib/queries/attribution';
import { PortalRoiChart } from '@/components/PortalRoiChart';

export default async function AdminDashboardPage() {
  const [listingRows, portalRows, leadRows] = await Promise.all([
    getListingHealthRows({ limit: 200 }),
    getPortalRoiRows({}),
    getAttributionRows({ daysBack: 7, limit: 500 }),
  ]);

  const totalListings = listingRows.length;
  const newLeads7d = leadRows.length;
  const underperformingCount = listingRows.filter(
    (r) => r.flag_underperforming
  ).length;

  const totalSpend = portalRows.reduce((sum, r) => sum + r.spend, 0);

  const avgCpl =
    (() => {
      const values = portalRows
        .map((r) => r.cpl)
        .filter((v): v is number => v != null && Number.isFinite(v));
      if (!values.length) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    })() ?? null;

  // --- NEW: build simple monthly avg CPL trend for ROI graph ---
  const monthlyAvgCpl = (() => {
    const byMonth = new Map<string, { sum: number; count: number }>();
    portalRows.forEach((r) => {
      if (r.cpl != null && Number.isFinite(r.cpl)) {
        const key = r.month; // "YYYY-MM"
        const current = byMonth.get(key) ?? { sum: 0, count: 0 };
        current.sum += r.cpl;
        current.count += 1;
        byMonth.set(key, current);
      }
    });

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({
        month,
        avgCpl: count > 0 ? sum / count : 0,
      }));
  })();

  const maxAvgCpl =
    monthlyAvgCpl.length > 0
      ? Math.max(...monthlyAvgCpl.map((m) => m.avgCpl))
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your listings and portals.
          </p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Listings" value={totalListings.toString()} />
        <StatCard
          title="New leads (7 days)"
          value={newLeads7d.toString()}
        />
        <StatCard
          title="Total spend (this month)"
          value={
            totalSpend ? `${totalSpend.toLocaleString('fr-FR')} €` : '—'
          }
        />
        <StatCard
          title="Avg CPL (this month)"
          value={avgCpl != null ? `${avgCpl.toFixed(0)} €` : '—'}
        />
      </div>

      {/* CPL by portal + health summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-medium mb-2">CPL by portal</h2>
          <p className="text-xs text-gray-500 mb-4">
            Visual view of cost per lead across your active portals.
          </p>
          <PortalRoiChart rows={portalRows} />
        </div>

        <div className="border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-medium mb-2">Listing health summary</h2>
            <p className="text-xs text-gray-400">
              {underperformingCount} listing
              {underperformingCount === 1 ? '' : 's'} are currently flagged as
              underperforming based on leads and days-on-market.
            </p>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Go to <span className="font-medium">Listings</span> in the sidebar
            to see which properties need attention first.
          </div>
        </div>
      </div>

      {/* NEW: ROI trend graph (avg CPL by month) */}
      {monthlyAvgCpl.length > 0 && (
        <div className="border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-medium mb-2">
            ROI trend (avg CPL by month)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            How your average cost per lead is evolving across all portals.
          </p>

          <div className="space-y-3">
            {monthlyAvgCpl.map((row) => {
              const width =
                maxAvgCpl > 0 ? Math.max(5, (row.avgCpl / maxAvgCpl) * 100) : 0;

              return (
                <div
                  key={row.month}
                  className="flex items-center gap-3 text-xs"
                >
                  <div className="w-20 text-gray-400">{row.month}</div>
                  <div className="flex-1 h-2 bg-gray-800 rounded">
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-gray-200">
                    {row.avgCpl.toFixed(0)} €
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-400">{title}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {subtitle && (
        <span className="text-xs text-gray-500">{subtitle}</span>
      )}
    </div>
  );
}