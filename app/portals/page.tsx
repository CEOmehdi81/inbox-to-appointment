import { getPortalRoiRows } from '@/lib/queries/portalRoi';
import { getSpendRows } from '@/lib/queries/spend';
import { PortalRoiChart } from '@/components/PortalRoiChart';

type PortalsPageProps = {
  searchParams?: {
    month?: string;
  };
};

export default async function PortalsPage({ searchParams }: PortalsPageProps) {
  const month = searchParams?.month;

  // Fetch ROI rows + raw spend rows in parallel
  const [rows, spendRows] = await Promise.all([
    getPortalRoiRows({ month }),
    getSpendRows(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Portal ROI</h1>
          <p className="text-sm text-gray-500">
            Cost per lead and performance trends by portal.
          </p>
        </div>
        <PortalRoiChart rows={rows} />
        {/* (Optional) month selector will be added later */}
      </header>

      <div className="overflow-x-auto border border-gray-800 rounded-lg">
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
            {rows.map((row) => (
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
      <section className="mt-8 space-y-2">
        <h2 className="text-lg font-semibold">Spend manager</h2>
        <p className="text-xs text-gray-500">
          Current monthly spend entries by portal (from the Spend table).
        </p>

        <div className="overflow-x-auto border border-gray-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left">Portal</th>
                <th className="px-3 py-2 text-left">Month</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {spendRows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-sm text-gray-400"
                  >
                    No spend data yet. You&apos;ll be able to add it here.
                  </td>
                </tr>
              )}

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
      {/* TEMP: debug output of spend rows – we'll replace this with real UI */}
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