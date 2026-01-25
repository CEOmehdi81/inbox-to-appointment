import Link from 'next/link';
import { getListingHealthRows } from '@/lib/queries/listingHealth';

type ListingsPageProps = {
  searchParams?: {
    underperformingOnly?: string;
  };
};

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const underperformingOnly =
    (searchParams?.underperformingOnly || '').toLowerCase() === 'true';

  const rows = await getListingHealthRows({
    underperformingOnly,
    limit: 100,
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Listing Health</h1>
          <p className="text-sm text-gray-500">
            Prioritized view of listings that need attention.
          </p>
        </div>

        {/* Simple filter toggle */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">View:</span>
          <Link
            href="/listings"
            className={`px-2 py-1 rounded-full border ${
              !underperformingOnly
                ? 'border-blue-500 text-blue-300'
                : 'border-gray-700 text-gray-300'
            }`}
          >
            All
          </Link>
          <Link
            href="/listings?underperformingOnly=true"
            className={`px-2 py-1 rounded-full border ${
              underperformingOnly
                ? 'border-blue-500 text-blue-300'
                : 'border-gray-700 text-gray-300'
            }`}
          >
            Underperforming only
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="border border-gray-800 rounded-lg p-6 text-sm text-gray-400">
          No listings found yet. Once leads start flowing into HOMI, you’ll see
          them here with their health scores.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Portal</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Leads (7d)</th>
                <th className="px-3 py-2 text-right font-medium">
                  Days since listed
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  Days since last lead
                </th>
                <th className="px-3 py-2 text-center font-medium">Health</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.portal}</td>
                  <td className="px-3 py-2 text-right">
                    {row.price != null
                      ? row.price.toLocaleString('fr-FR') + ' €'
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">{row.leads_7d}</td>
                  <td className="px-3 py-2 text-right">
                    {row.days_since_listed}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.days_since_last_lead ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HealthScoreBadge score={row.health_score} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.flag_underperforming ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        Underperforming
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button className="px-2 py-1 text-xs border border-gray-700 rounded-full">
                        Improve photos
                      </button>
                      <button className="px-2 py-1 text-xs border border-gray-700 rounded-full">
                        Adjust price
                      </button>
                      <button className="px-2 py-1 text-xs border border-gray-700 rounded-full">
                        Reduce days-on-market
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HealthScoreBadge({ score }: { score: number }) {
  let label = 'Healthy';
  let className = 'bg-green-100 text-green-800';

  if (score < 40) {
    label = 'Critical';
    className = 'bg-red-100 text-red-800';
  } else if (score < 70) {
    label = 'Watch';
    className = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}
    >
      {score} · {label}
    </span>
  );
}