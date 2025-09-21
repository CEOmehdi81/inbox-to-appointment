// app/admin/listings/[id]/page.tsx
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

/* ------------ server actions ------------ */
async function updateListing(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;

  await prisma.listing.update({
    where: { id },
    data: {
      title: String(formData.get('title') || '').trim(),
      city: String(formData.get('city') || '').trim() || null,
      address: String(formData.get('address') || '').trim() || null,
      url: String(formData.get('url') || '').trim() || null,
      priceMonthly: Number(formData.get('priceMonthly') || '') || null,
      status: String(formData.get('status') || 'published') as any,
    },
  });

  revalidatePath(`/admin/listings/${id}`);
}

async function addChannel(formData: FormData) {
  'use server';
  const listingId = String(formData.get('listingId') || '');
  const platform = String(formData.get('platform') || '').trim();
  const url = String(formData.get('channelUrl') || '').trim();
  const externalId = String(formData.get('externalId') || '').trim();

  if (!listingId || !platform || !url) return;
  await prisma.listingChannel.create({
    data: { listingId, platform, url, externalId: externalId || null },
  });
  revalidatePath(`/admin/listings/${listingId}`);
}

async function removeChannel(formData: FormData) {
  'use server';
  const listingId = String(formData.get('listingId') || '');
  const channelId = String(formData.get('channelId') || '');
  if (!channelId) return;

  await prisma.listingChannel.delete({ where: { id: channelId } });
  revalidatePath(`/admin/listings/${listingId}`);
}

async function deleteListing(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) return;
  await prisma.listing.delete({ where: { id } });
  redirect('/admin/listings');
}

/* ------------ page ------------ */
export default async function ListingDetail({
  params,
}: {
  params: { id: string };
}) {
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: {
      channels: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { occurredAt: 'desc' }, take: 50 },
      leads: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });

  if (!listing) return notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href="/admin/listings" className="text-xs text-gray-400 hover:text-white">← Back to listings</a>
        <h1 className="text-lg font-semibold">{listing.title}</h1>
        <span className="ml-auto text-xs text-gray-400">
          Created {new Date(listing.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      </div>

      {/* Edit form */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-base font-semibold mb-3">Listing details</h2>
        <form action={updateListing} className="grid md:grid-cols-6 gap-3">
          <input type="hidden" name="id" value={listing.id} />
          <input name="title" defaultValue={listing.title} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-2" />
          <input name="city" defaultValue={listing.city || ''} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <input name="address" defaultValue={listing.address || ''} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-2" />
          <input name="priceMonthly" type="number" min="0" defaultValue={listing.priceMonthly ?? ''} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <input name="url" defaultValue={listing.url || ''} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm md:col-span-5" />
          <select name="status" defaultValue={listing.status} className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm">
            <option value="published">published</option>
            <option value="draft">draft</option>
            <option value="archived">archived</option>
          </select>
          <button className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10">Save changes</button>
        </form>

        <form action={deleteListing} className="mt-3">
          <input type="hidden" name="id" value={listing.id} />
          <button className="rounded border border-rose-400/30 bg-rose-500/15 text-rose-300 px-3 py-2 text-sm hover:bg-rose-500/25">
            Delete listing
          </button>
        </form>
      </div>

      {/* Channels */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-base font-semibold mb-3">Channels</h2>

        <form action={addChannel} className="flex flex-wrap items-center gap-2 mb-4">
          <input type="hidden" name="listingId" value={listing.id} />
          <input name="platform" placeholder="Platform (Zillow, SeLoger, FB…)" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm" />
          <input name="externalId" placeholder="External ID (optional)" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm" />
          <input name="channelUrl" placeholder="URL" className="rounded bg-white/5 border border-white/10 px-2 py-1 text-sm w-80" />
          <button className="rounded bg-white/5 border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10">Add channel</button>
        </form>

        <div className="space-y-2">
          {listing.channels.length === 0 && (
            <div className="text-sm text-gray-400">No channels yet.</div>
          )}

          {listing.channels.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
              {/* Platform & source */}
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{c.platform}</span>
              {c.externalId && <code className="bg-white/5 px-1.5 py-0.5 rounded">{c.externalId}</code>}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Source
              </a>

              {/* Short link (relative + absolute) */}
              <code className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs">/r/{c.id}</code>
              {BASE_URL && (
                <code className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs">
                  {BASE_URL}/r/{c.id}
                </code>
              )}

              {/* Quick test redirect */}
              <a
                href={`/r/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
              >
                Test redirect
              </a>

              {/* Remove */}
              <form action={removeChannel} className="ml-auto">
                <input type="hidden" name="listingId" value={listing.id} />
                <input type="hidden" name="channelId" value={c.id} />
                <button className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">Remove</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Recent events</h3>
          <div className="space-y-1">
            {listing.events.length === 0 && (
              <div className="text-sm text-gray-400">No events yet.</div>
            )}
            {listing.events.map((e) => (
              <div key={e.id} className="text-sm text-gray-300">
                <span className="text-gray-400">{new Date(e.occurredAt).toLocaleString()}</span>{' '}
                • <span className="uppercase">{e.type}</span>{' '}
                {e.channelId && <span className="text-gray-400">• channel {e.channelId.slice(0, 6)}…</span>}
                {e.utmSource && <span className="text-gray-400"> • utm_source={e.utmSource}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3">Recent leads</h3>
          <div className="space-y-1">
            {listing.leads.length === 0 && (
              <div className="text-sm text-gray-400">No leads yet.</div>
            )}
            {listing.leads.map((l) => (
              <div key={l.id} className="text-sm text-gray-300">
                <span className="text-gray-400">{new Date(l.createdAt).toLocaleString()}</span>{' '}
                • {l.name || 'Anonymous'} {l.email ? `• ${l.email}` : ''} {l.phone ? `• ${l.phone}` : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tracker snippet (we'll wire endpoint next) */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold mb-2">Tracker embed (coming next)</h3>
        <p className="text-xs text-gray-400 mb-2">
          We’ll expose <code>/api/track</code> next. You’ll paste this snippet on your public listing page(s) to record real views and clicks:
        </p>
        <pre className="text-xs bg-black/30 p-3 rounded overflow-x-auto">
{`<script async src="/api/track.js?listing=${listing.id}"></script>`}
        </pre>
      </div>
    </div>
  );
}