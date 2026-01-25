import { getListingHealthRows } from '@/lib/queries/listingHealth';
import { getPortalRoiRows } from '@/lib/queries/portalRoi';
import { getAttributionRows } from '@/lib/queries/attribution';
import { PortalRoiChart } from '@/components/PortalRoiChart';

export default async function DashboardPage() {
  const [listingRows, portalRows, leadRows] = await Promise.all([
    getListingHealthRows({ limit: 100 }),
    getPortalRoiRows({}),
    getAttributionRows({ daysBack: 7, limit: 500 }),
  ]);

  const newLeads7d = leadRows.length;
  const underperformingCount = listingRows.filter(
    (r) => r.flag_underperforming
  ).length;

  const avgCpl =
    (() => {
      const values = portalRows
        .map((r) => r.cpl)
        .filter((v): v is number => v != null && Number.isFinite(v));
      if (!values.length) return null;
      return values.reduce((a, b) => a + b, 0) / values.length;
    })() ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Here&apos;s what&apos;s happening with your listings today.
          </p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="New leads (7 days)"
          value={newLeads7d.toString()}
        />
        <StatCard
          title="Underperforming listings"
          value={underperformingCount.toString()}
        />
        <StatCard
          title="Avg CPL (this month)"
          value={avgCpl != null ? `${avgCpl.toFixed(0)} €` : '—'}
        />
      </div>

      {/* Lower cards: graph + summary */}
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
            Go to <span className="font-medium">Listings</span> to see which
            properties need attention first.
          </div>
        </div>
      </div>
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