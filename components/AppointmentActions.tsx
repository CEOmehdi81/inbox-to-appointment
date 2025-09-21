'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  initialStatus: 'pending' | 'approved' | 'rejected';
};

export default function AppointmentActions({ id, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function update(to: 'approved' | 'rejected') {
    try {
      setBusy(true);
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(to);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      alert('Update failed');
    } finally {
      setBusy(false);
    }
  }

  const disabledApprove = busy || status === 'approved' || isPending;
  const disabledReject = busy || status === 'rejected' || isPending;

  const baseBtn: React.CSSProperties = {
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #e5e7eb',
    color: 'white',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        disabled={disabledApprove}
        onClick={() => update('approved')}
        style={{
          ...baseBtn,
          background: '#16a34a', // green-600
          opacity: disabledApprove ? 0.4 : 1,
        }}
        title="Approve"
        aria-label="Approve"
      >
        Approve
      </button>

      <button
        disabled={disabledReject}
        onClick={() => update('rejected')}
        style={{
          ...baseBtn,
          background: '#dc2626', // red-600
          opacity: disabledReject ? 0.4 : 1,
        }}
        title="Reject"
        aria-label="Reject"
      >
        Reject
      </button>
    </div>
  );
}