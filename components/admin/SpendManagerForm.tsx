'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  /** Optional: prefill portal dropdown from current portals */
  portals: string[];
};

export function SpendManagerForm({ portals }: Props) {
  const router = useRouter();

  const [portal, setPortal] = useState<string>(portals[0] ?? '');
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function getNumericAmount() {
    const n = Number(amount);
    return Number.isFinite(n) ? n : NaN;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const numericAmount = getNumericAmount();
    if (!portal || !month || !Number.isFinite(numericAmount)) {
      setMessage('Please fill portal, month and a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/market/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal,
          month,
          amount: numericAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? 'Failed to save spend.');
        return;
      }

      setMessage('Saved ✔');
      setAmount(''); // clear field

      // Reload server data (Portal ROI + Spend manager table)
      router.refresh();
    } catch (err) {
      console.error('Error saving spend', err);
      setMessage('Unexpected error.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 bg-black/40 p-4"
    >
      <div className="flex flex-col">
        <label className="text-xs text-gray-400 mb-1">Portal</label>
        <select
          className="rounded-md border border-gray-700 bg-black/60 px-2 py-1 text-sm"
          value={portal}
          onChange={(e) => setPortal(e.target.value)}
        >
          {portals.length === 0 && <option value="">Select…</option>}
          {portals.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-400 mb-1">Month</label>
        <input
          type="month"
          className="rounded-md border border-gray-700 bg-black/60 px-2 py-1 text-sm"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-gray-400 mb-1">Amount (€)</label>
        <input
          type="number"
          min={0}
          className="rounded-md border border-gray-700 bg-black/60 px-2 py-1 text-sm"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="3000"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-indigo-500 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? 'Saving…' : 'Save spend'}
      </button>

      {message && (
        <p className="text-xs text-gray-400 ml-2">
          {message}
        </p>
      )}
    </form>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}