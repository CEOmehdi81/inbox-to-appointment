// app/listings/[id]/page.tsx
import prisma from '@/lib/prisma';
import HomiTracker from '@/components/HomiTracker';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const revalidate = 60;

type PageProps = { params: { id: string } };

async function getListing(id: string) {
  return prisma.listing.findUnique({ where: { id } });
}

// safe getter: tries several keys and returns the first non-null value
function first<T = any>(obj: any, keys: string[], fallback?: T): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return fallback;
}

function formatPrice(n?: number | null) {
  if (typeof n !== 'number') return '';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const l: any = await getListing(params.id);
  if (!l) return { title: 'Listing not found' };

  const title = first<string>(l, ['title', 'name', 'headline'], 'Listing');
  const city = first<string>(l, ['city', 'town', 'locality']);
  const price = first<number>(l, ['price', 'askingPrice', 'rent', 'amount']);
  const images = (first<string[]>(l, ['images', 'photos', 'mediaUrls', 'pictures'], []) || []) as string[];

  return {
    title: [title, city, price ? formatPrice(price) : null].filter(Boolean).join(' • '),
    description: first<string>(l, ['description', 'summary', 'excerpt'])?.slice(0, 160),
    openGraph: { images: images[0] ? [images[0]] : [] },
  };
}

export default async function Page({ params }: PageProps) {
  const l: any = await getListing(params.id);
  if (!l) return notFound();

  const title = first<string>(l, ['title', 'name', 'headline'], 'Listing');
  const safeTitle = title ?? 'Listing';
  const city = first<string>(l, ['city', 'town', 'locality']);
  const address = first<string>(l, ['address', 'addr', 'street']);
  const price = first<number>(l, ['price', 'askingPrice', 'rent', 'amount']);
  const surface = first<number>(l, ['surfaceM2', 'area', 'areaM2', 'size']);
  const rooms = first<number>(l, ['rooms', 'bedrooms', 'beds']);
  const desc = first<string>(l, ['description', 'summary', 'details']);
  const images = (first<string[]>(l, ['images', 'photos', 'mediaUrls', 'pictures'], []) || []) as string[];
  const phone = first<string>(l, ['phone', 'tel', 'contactPhone']);
  const email = first<string>(l, ['email', 'contactEmail']);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <HomiTracker listingId={String(l.id)} channelId="website" />

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{safeTitle}</h1>
        <p className="text-sm text-gray-600">{[address, city].filter(Boolean).join(' • ')}</p>
      </header>

      {images.length ? (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-8 relative aspect-[4/3] bg-gray-100 rounded">
            <Image
              src={images[0]!}
              alt={safeTitle}
              fill
              className="object-cover rounded"
              sizes="(max-width:768px) 100vw, 66vw"
              priority
            />
          </div>
          <div className="col-span-12 md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3">
            {images.slice(1, 5).map((src, i) => (
              <div key={i} className="relative aspect-[4/3] bg-gray-100 rounded">
                <Image
                  src={src}
                  alt={`Photo ${i + 2}`}
                  fill
                  className="object-cover rounded"
                  sizes="(max-width:768px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-64 rounded bg-gray-100 grid place-items-center text-gray-500">
          No photos yet
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Fact label="Price" value={price ? formatPrice(price) : '—'} />
        <Fact label="Rooms" value={rooms ?? '—'} />
        <Fact label="Surface" value={surface ? `${surface} m²` : '—'} />
        <Fact label="City" value={city ?? '—'} />
      </section>

      {desc && (
        <section>
          <h2 className="text-lg font-medium mb-2">Description</h2>
          <p className="whitespace-pre-line text-gray-800">{desc}</p>
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            data-homi="contact_click"
            className="inline-flex items-center px-4 py-2 rounded bg-black text-white"
          >
            Call
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(safeTitle ?? 'Property enquiry')}`}
            data-homi="lead_click"
            className="inline-flex items-center px-4 py-2 rounded border"
          >
            Email
          </a>
        )}
        <a
          href={`/contact?listing=${encodeURIComponent(String(l.id))}`}
          data-homi="lead_click"
          className="inline-flex items-center px-4 py-2 rounded border"
        >
          Book a viewing
        </a>
        <a
          href={`/brochure/${encodeURIComponent(String(l.id))}`}
          data-homi="download"
          className="inline-flex items-center px-4 py-2 rounded border"
        >
          Download brochure
        </a>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}