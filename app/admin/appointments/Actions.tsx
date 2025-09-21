"use client";

type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export default function Actions({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: AppointmentStatus;
}) {
  // placeholder buttons – wire up to your actions/API later
  return (
    <div className="flex gap-2">
      <button className="btn-ghost text-xs px-2 py-1" title="Approve">Approve</button>
      <button className="btn-ghost text-xs px-2 py-1" title="Reject">Reject</button>
    </div>
  );
}