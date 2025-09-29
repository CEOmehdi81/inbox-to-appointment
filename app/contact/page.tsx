// app/contact/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, FormEvent } from 'react';
import HomiTracker from '@/components/HomiTracker';

export default function ContactPage() {
  const sp = useSearchParams();
  const listingId = sp.get('listing') || '';

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ listingId, ...form }),
    });

    if (res.ok) {
      setStatus('done');
    } else {
      const j = await res.json().catch(() => ({} as any));
      setError(j?.error || 'Failed to submit lead');
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      {/* Track this page too */}
      {listingId && <HomiTracker listingId={listingId} channelId="website" />}

      <h1 className="text-2xl font-semibold">Book a viewing</h1>
      <p className="text-sm text-gray-500">We’ll get back to you shortly.</p>

      {!listingId && (
        <div className="text-sm text-red-500">
          Missing listing id in URL. Open this page as <code>/contact?listing=&lt;ID&gt;</code>.
        </div>
      )}

      {status === 'done' ? (
        <div className="rounded border p-4 bg-green-50 text-green-800">
          Thanks! Your request has been received.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded border p-2 bg-transparent"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full rounded border p-2 bg-transparent"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full rounded border p-2 bg-transparent"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <button
            disabled={status === 'sending' || !listingId}
            className="inline-flex items-center px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send'}
          </button>

          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="text-xs text-gray-500">Provide at least an email or phone.</div>
        </form>
      )}
    </div>
  );
}