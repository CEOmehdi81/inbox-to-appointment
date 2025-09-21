// app/admin/documents/[id]/page.tsx
import prisma from '@/lib/prisma';
import { makeSecret } from '@/lib/documents';
import { revalidatePath } from 'next/cache';

type PageProps = {
  params: { id: string };
  searchParams?: {
    page?: string;
    q?: string;          // free text: email, IP, share id
    from?: string;       // YYYY-MM-DD
    to?: string;         // YYYY-MM-DD
    code?: string;       // NEW: rotating code filter
  };
};

const PAGE_SIZE = 25;

// ——— server actions ———
async function toggleShareDownload(formData: FormData) {
  'use server';
  const shareId = String(formData.get('shareId') || '');
  const allow = String(formData.get('allow') || '') === 'true';
  const docId = String(formData.get('docId') || '');
  if (!shareId) return;
  await prisma.documentShare.update({ where: { id: shareId }, data: { canDownload: allow } });
  revalidatePath(`/admin/documents/${docId}`);
}

async function revokeShare(formData: FormData) {
  'use server';
  const shareId = String(formData.get('shareId') || '');
  const docId = String(formData.get('docId') || '');
  if (!shareId) return;
  await prisma.documentShare.delete({ where: { id: shareId } });
  revalidatePath(`/admin/documents/${docId}`);
}

async function regenSecret(formData: FormData) {
  'use server';
  const docId = String(formData.get('docId') || '');
  if (!docId) return;
  await prisma.document.update({
    where: { id: docId },
    data: { totpSecret: makeSecret() },
  });
  revalidatePath(`/admin/documents/${docId}`);
}

export default async function DocumentLogPage({ params, searchParams }: PageProps) {
  const id = params.id;

  // ——— filters ———
  const page = Math.max(1, Number(searchParams?.page || 1));
  const q = (searchParams?.q || '').trim();
  const from = (searchParams?.from || '').trim(); // YYYY-MM-DD
  const to = (searchParams?.to || '').trim();     // YYYY-MM-DD
  const code = (searchParams?.code || '').trim(); // NEW
  const skip = (page - 1) * PAGE_SIZE;

  // Build where for views
  const where: any = { documentId: id };
  const and: any[] = [];

  if (q) {
    and.push({
      OR: [
        { viewerEmail: { contains: q, mode: 'insensitive' } },
        { ip:          { contains: q } },
        { shareId:     { contains: q } },
      ],
    });
  }

  // NEW: specific code filter (exact if 6 digits, otherwise contains)
  if (code) {
    if (/^\d{6}$/.test(code)) {
      and.push({ codeShown: code });
    } else {
      and.push({ codeShown: { contains: code } });
    }
  }

  if (from) {
    const gte = new Date(`${from}T00:00:00.000Z`);
    and.push({ viewedAt: { gte } });
  }
  if (to) {
    const nextDay = new Date(`${to}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    and.push({ viewedAt: { lt: nextDay } });
  }

  if (and.length) where.AND = and;

  // ——— fetch doc + shares + filtered/paginated views ———
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: { orderBy: { createdAt: 'desc' } } },
  });

  if (!doc) {
    return (
      <div className="rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold mb-2">Document not found</h2>
        <a href="/admin/documents" className="text-blue-400 hover:underline text-sm">← Back to documents</a>
      </div>
    );
  }

  const [views, total] = await Promise.all([
    prisma.documentView.findMany({
      where,
      orderBy: { viewedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.documentView.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Keep querystring for links (export, pagination)
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (code) qs.set('code', code); // NEW

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{doc.filename}</h2>
            <p className="text-xs text-gray-400">Created {new Date(doc.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/documents"
              className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              ← Back
            </a>
            <form action={regenSecret}>
              <input type="hidden" name="docId" value={doc.id} />
              <button className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                Regenerate rotating code secret
              </button>
            </form>
            <a
              href={`/admin/documents/${doc.id}/export?${qs.toString()}`}
              className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {/* Shares */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-5">
        <div className="mb-3 text-sm font-medium">Shares</div>

        {doc.shares.length === 0 ? (
          <div className="text-sm text-gray-400">No shares yet. Create one from the main Documents page.</div>
        ) : (
          <div className="space-y-2">
            {doc.shares.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-white/5 border border-white/10">{s.recipientEmail}</span>
                <span className="text-gray-500">• id</span>
                <code className="bg-white/5 px-2 py-1 rounded">{s.id.slice(0, 8)}…</code>
                <span className="text-gray-500">•</span>
                <a
                  href={`/doc/${s.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10"
                >
                  Open
                </a>
                {s.canDownload ? (
                  <a
                    href={`/doc/${s.id}/download?download=1`}
                    className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10"
                  >
                    Download (watermarked)
                  </a>
                ) : (
                  <span className="rounded-md bg-white/5 border border-white/10 px-2 py-1 opacity-60">
                    Download disabled
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Views log + Filters */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Views log</div>
          <div className="text-xs text-gray-400">
            Showing page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} • {total} result{total === 1 ? '' : 's'}
          </div>
        </div>

        {/* Filter form (GET) */}
        <form method="GET" className="grid grid-cols-1 md:grid-cols-[1fr,140px,140px,120px,auto] gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email, IP, share id…"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            name="code"
            defaultValue={code}
            placeholder="Code (e.g. 123456)"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
              Apply
            </button>
            <a
              href={`/admin/documents/${id}`}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              Reset
            </a>
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-gray-400">
                <th className="text-left font-medium px-4 py-3">When</th>
                <th className="text-left font-medium px-4 py-3">Share</th>
                <th className="text-left font-medium px-4 py-3">Code</th>
                <th className="text-left font-medium px-4 py-3">Viewer</th>
                <th className="text-left font-medium px-4 py-3">IP</th>
                <th className="text-left font-medium px-4 py-3">Agent</th>
              </tr>
            </thead>
            <tbody>
              {views.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No views match your filters.
                  </td>
                </tr>
              ) : (
                views.map((v, idx) => (
                  <tr
                    key={v.id}
                    className={[
                      'text-sm',
                      idx % 2 ? 'bg-white/[0.01]' : 'bg-transparent',
                      'hover:bg-white/[0.03] transition-colors',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(v.viewedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <code className="bg-white/5 px-2 py-1 rounded">{v.shareId.slice(0, 8)}…</code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="bg-white/5 px-2 py-1 rounded">{v.codeShown}</code>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{v.viewerEmail || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{v.ip || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {(v.userAgent || '').slice(0, 70)}
                      {(v.userAgent || '').length > 70 ? '…' : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>
              Page {page} of {totalPages} • {total} result{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <a
                href={`/admin/documents/${id}?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(Math.max(1, page - 1)) }).toString()}`}
                className={`rounded-md px-2 py-1 border border-white/10 bg-white/5 ${
                  page === 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-white/10'
                }`}
              >
                ← Prev
              </a>
              <a
                href={`/admin/documents/${id}?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(Math.min(totalPages, page + 1)) }).toString()}`}
                className={`rounded-md px-2 py-1 border border-white/10 bg-white/5 ${
                  page >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-white/10'
                }`}
              >
                Next →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}