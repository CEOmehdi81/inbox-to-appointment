import { getAttributionRows } from '@/lib/queries/attribution';

type AttributionPageProps = {
  searchParams?: {
    portal?: string;
  };
};

export default async function AttributionPage({
  searchParams,
}: AttributionPageProps) {
  const portal = searchParams?.portal;
  const rows = await getAttributionRows({
    portal,
    daysBack: 30,
    limit: 200,
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attribution</h1>
          <p className="text-sm text-gray-500">
            Lead-level view of where each enquiry came from.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="border border-gray-800 rounded-lg p-6 text-sm text-gray-400">
          No leads found in the last 30 days.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Lead portal</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Listing</th>
                <th className="px-3 py-2 text-left">Listing portal</th>
                <th className="px-3 py-2 text-right">Listing price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">
                    {new Date(row.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2">{row.portal}</td>
                  <td className="px-3 py-2">{row.lead_source}</td>
                  <td className="px-3 py-2">{row.listing_title}</td>
                  <td className="px-3 py-2">{row.listing_portal}</td>
                  <td className="px-3 py-2 text-right">
                    {row.listing_price != null
                      ? `${row.listing_price.toLocaleString('fr-FR')} €`
                      : '—'}
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