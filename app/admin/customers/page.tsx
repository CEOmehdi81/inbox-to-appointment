import { getAttributionRows } from '@/lib/queries/attribution';
import Link from 'next/link';

export default async function CustomersPage() {
  const rows = await getAttributionRows();

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Attribution</h1>
        <p className="text-sm text-gray-500">
          Lead-level view of where each enquiry came from.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-black/40">
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
            {rows.map((row) => {
              const listingHref = row.listing_id
                ? `/admin/listings/${encodeURIComponent(row.listing_id)}`
                : null;

              return (
                <tr
                  key={row.id}
                  className="border-t border-gray-800 hover:bg-gray-900/60 transition-colors"
                >
                  <td className="px-3 py-2">
                    {new Date(row.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  <td className="px-3 py-2">{row.portal ?? 'unknown'}</td>
                  <td className="px-3 py-2">{row.lead_source}</td>

                  <td className="px-3 py-2">
                    {listingHref ? (
                      <Link
                        href={listingHref}
                        className="text-blue-400 hover:underline"
                      >
                        {row.listing_title || 'View listing'}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </td>

                  <td className="px-3 py-2">
                    {row.listing_portal ?? 'unknown'}
                  </td>

                  <td className="px-3 py-2 text-right">
                    {row.listing_price != null
                      ? `${row.listing_price.toLocaleString('fr-FR')} €`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}