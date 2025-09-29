// app/admin/listings/page.tsx
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import LivePanel from './_live-panel';

export const dynamic = 'force-dynamic';

// Optional absolute base (NEXT_PUBLIC_APP_URL="https://your-domain.com")
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

/* ------------ server actions ------------ */
async function createListing(formData: FormData) {
  'use server';
  try {
    const title = String(formData.get('title') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const url = String(formData.get('url') || '').trim();
    const priceMonthlyRaw = String(formData.get('priceMonthly') || '').trim();
    const priceMonthly = priceMonthlyRaw ? Number(priceMonthlyRaw) : null;

    if (!title) return;

    await prisma.listing.create({
      data: {
        title,
        city: city || null,
        address: address || null,
        url: url || null,
        priceMonthly,
      },
    });
  } catch (err) {
    console.error('createListing failed:', err);
  } finally {
    revalidatePath('/admin/listings');
  }
}

async function addChannel(formData: FormData) {
  'use server';
  try {
    const listingId = String(formData.get('listingId') || '');
    const platform = String(formData.get('platform') || '').trim();
    const url = String(formData.get('channelUrl') || '').trim();
    const externalId = String(formData.get('externalId') || '').trim();

    if (!listingId || !platform || !url) return;

    await prisma.listingChannel.create({
      data: {
        listingId,
        platform,
        url,
        externalId: externalId || null,
      },
    });
  } catch (err) {
    console.error('addChannel failed:', err);
  } finally {
    revalidatePath('/admin/listings');
  }
}

async function setStatus(formData: FormData) {
  'use server';
  try {
    const listingId = String(formData.get('listingId') || '');
    const status = String(formData.get('status') || 'published') as any;
    if (!listingId) return;

    await prisma.listing.update({
      where: { id: listingId },
      data: { status },
    });
  } catch (err) {
    console.error('setStatus failed:', err);
  } finally {
    revalidatePath('/admin/listings');
  }
}

/* ------------ page ------------ */
export default async function ListingsPage() {
  let listings:
    | Array<Awaited<ReturnType<typeof prisma.listing.findFirst>>>
    = [];

  let dbReady = true;

  try {
    listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        channels: true,
        _count: { select: { events: true, leads: true, channels: true } },
      },
    });
  } catch (e) {
    dbReady = false;
    console.error('Listings table not found yet (did you run migrations?)', e);
  }

  return (
    <div className="space-y-6">
      {/* Globe + cards */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <LivePanel />
      </div>

      {/* Create */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">Create listing</h2>
        <form action={createListing} className="grid md:grid-cols-6 gap-3">
          <input name="title" placeholder="Title *" required className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-2" />
          <input name="city" placeholder="City" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <input name="address" placeholder="Address" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-2" />
          <input name="priceMonthly" type="number" min="0" placeholder="Price / month" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <input name="url" placeholder="Canonical URL (optional)" className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-5" />
          <button className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10 md:col-span-1">Create</button>
        </form>
      </div>

      {/* List */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">Listings</h2>
        </div>

        {!dbReady ? (
          <div className="p-4 text-sm text-amber-300">
            The database doesn’t have the <code>Listing</code> tables yet. Run your migrations, then refresh:
            <pre className="mt-2 rounded bg-white/5 p-2 text-xs">
              npx prisma generate{'\n'}npx prisma migrate dev -n init_listings
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">City</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Channels</th>
                  <th className="text-left px-4 py-3">Events</th>
                  <th className="text-left px-4 py-3">Leads</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No listings yet.</td>
                  </tr>
                )}

                {listings.map((l: any, i: number) => (
                  <tr key={l.id} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-4 py-3">
                      <a href={`/admin/listings/${l.id}`} className="text-blue-400 hover:underline">{l.title}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{l.city || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'px-2 py-0.5 rounded border text-xs',
                          l.status === 'published'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : l.status === 'draft'
                            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/10 border-gray-500/20 text-gray-300',
                        ].join(' ')}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{l._count?.channels ?? 0}</td>
                    <td className="px-4 py-3">{l._count?.events ?? 0}</td>
                    <td className="px-4 py-3">{l._count?.leads ?? 0}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(l.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-3">
                        <form action={addChannel} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="listingId" value={l.id} />
                          <input name="platform" placeholder="Platform" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs" />
                          <input name="externalId" placeholder="External ID (opt.)" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs" />
                          <input name="channelUrl" placeholder="Channel URL" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs w-64" />
                          <button className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                            Add channel
                          </button>
                        </form>

                        {Array.isArray(l.channels) && l.channels.length > 0 && (
                          <div className="space-y-1">
                            {l.channels.map((s: any) => (
                              <div key={s.id} className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{s.platform}</span>
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="rounded bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10">Source</a>
                                <code className="bg-white/5 border border-white/10 rounded px-2 py-1">/r/{s.id}</code>
                                {BASE_URL && <code className="bg-white/5 border border-white/10 rounded px-2 py-1">{BASE_URL}/r/{s.id}</code>}
                                <a href={`/r/${s.id}`} target="_blank" rel="noopener noreferrer" className="rounded bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10">Test redirect</a>
                              </div>
                            ))}
                          </div>
                        )}

                        <form action={setStatus} className="inline">
                          <input type="hidden" name="listingId" value={l.id} />
                          <input type="hidden" name="status" value={l.status === 'archived' ? 'published' : 'archived'} />
                          <button className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                            {l.status === 'archived' ? 'Unarchive' : 'Archive'}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}