'use client';

type Card = {
  id: string;
  title: string;
  city: string | null;
  priceMonthly: number | null;
  url: string | null;
  imageUrl: string | null;
  portalsCount: number;
  platforms: string[];
};

export default function ListingCard({ c }: { c: Card }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div className="aspect-[4/3] bg-black/20">
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">
            No image
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="font-medium truncate">{c.title}</div>
        <div className="text-xs opacity-70 mt-0.5 truncate">{c.city ?? '—'}</div>

        <div className="text-xs mt-2 flex items-center justify-between">
          <span className="opacity-80">
            {c.portalsCount} portal{c.portalsCount === 1 ? '' : 's'}
          </span>
          <span className="opacity-60">{c.priceMonthly ? `${c.priceMonthly.toLocaleString()} €/mo` : ''}</span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {c.platforms.slice(0, 4).map(p => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
              {p}
            </span>
          ))}
          {c.platforms.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
              +{c.platforms.length - 4}
            </span>
          )}
        </div>

        {c.url && (
          <a
            href={c.url}
            target="_blank"
            className="text-xs mt-2 inline-block text-blue-400 hover:underline"
            rel="noreferrer"
          >
            Open listing
          </a>
        )}
      </div>
    </div>
  );
}