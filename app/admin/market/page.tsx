import { getPortalRoiRows } from '@/lib/queries/portalRoi';
import { getSpendRows } from '@/lib/queries/spend';
import { PortalRoiChart } from '@/components/PortalRoiChart';
import { SpendManagerForm } from '@/components/admin/SpendManagerForm';

export default async function MarketPage() {
  const [portalRows, spendRows] = await Promise.all([
    getPortalRoiRows({}),
    getSpendRows(),
  ]);

  // Unique list of portals for the Spend form dropdown
  const portals = Array.from(
    new Set(portalRows.map((r) => r.portal).filter(Boolean))
  );

  // For dashboard text (optional)
  const totalSpend = portalRows.reduce((sum, r) => sum + r.spend, 0);
  const totalLeads = portalRows.reduce((sum, r) => sum + r.leads, 0);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Portal ROI</h1>
          <p className="text-sm text-gray-500">
            Cost per lead and performance trends by portal.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            This month: {totalSpend.toLocaleString('fr-FR')} € for{' '}
            {totalLeads} leads.
          </p>
        </div>
        <div className="w-80">
          <PortalRoiChart rows={portalRows} />
        </div>
      </header>

      {/* ROI table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-black/40">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left">Portal</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-right">Leads</th>
              <th className="px-3 py-2 text-right">CPL</th>
              <th className="px-3 py-2 text-right">Prev CPL</th>
              <th className="px-3 py-2 text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {portalRows.map((row) => (
              <tr key={row.portal} className="border-t border-gray-800">
                <td className="px-3 py-2">{row.portal}</td>

                <td className="px-3 py-2 text-right">
                  {row.spend.toLocaleString('fr-FR')} €
                </td>

                <td className="px-3 py-2 text-right">{row.leads}</td>

                <td className="px-3 py-2 text-right">
                  {row.cpl != null ? `${row.cpl.toFixed(0)} €` : '—'}
                </td>

                <td className="px-3 py-2 text-right">
                  {row.prev_cpl != null ? `${row.prev_cpl.toFixed(0)} €` : '—'}
                </td>

                <td className="px-3 py-2 text-right">
                  <TrendCell pct={row.cpl_change_pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spend manager section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Spend manager</h2>
          <p className="text-sm text-gray-500">
            Current monthly spend entries by portal. Updating here will
            immediately refresh ROI metrics.
          </p>
        </div>

        {/* 🔹 New form */}
        <SpendManagerForm portals={portals} />

        {/* Existing spend table */}
        <div className="overflow-x-auto rounded-lg border border-gray-800 bg-black/40">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left">Portal</th>
                <th className="px-3 py-2 text-left">Month</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {spendRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{row.portal}</td>
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2 text-right">
                    {row.amount.toLocaleString('fr-FR')} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TrendCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-gray-400">—</span>;

  const isBetter = pct < 0;
  const color = isBetter ? 'text-green-400' : 'text-red-400';
  const sign = isBetter ? '' : '+';

  return <span className={color}>{sign}{pct.toFixed(1)}%</span>;
}