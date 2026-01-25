"use client";

import { useState } from "react";

type Props = {
  agencyId: string;
  onDone?: () => Promise<void> | void;
};

type RunOnceResponse = {
  ok?: boolean;
  error?: string;
  result?: {
    scanned?: number;
    forwarded?: number;
    skipped?: number;
    inboxes?: number;
    forwardFailures?: number;
    forwardFailureSamples?: string[];
    note?: string;
  };
};

export default function RunInboxButton({ agencyId, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    const aid = (agencyId || "").trim();
    if (!aid) {
      setMsg("Missing agencyId. Save it first.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/integrations/email/run-once", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agencyId: aid }),
      });

      const data = (await res.json().catch(() => ({}))) as RunOnceResponse;

      if (!res.ok || data.ok !== true) {
        setMsg(`Failed: ${data.error || `HTTP ${res.status}`}`);
        return;
      }

      const r = data.result || {};
      const parts: string[] = [];
      if (typeof r.scanned === "number") parts.push(`scanned ${r.scanned}`);
      if (typeof r.forwarded === "number") parts.push(`forwarded ${r.forwarded}`);
      if (typeof r.skipped === "number") parts.push(`skipped ${r.skipped}`);

      setMsg(parts.length ? `Done (${parts.join(", ")}).` : "Done.");

      if (onDone) await onDone();
    } catch (e: any) {
      setMsg(e?.message || "Failed to run inbox");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {msg && <div className="text-[11px] text-gray-400">{msg}</div>}

      <button
        type="button"
        onClick={run}
        disabled={busy || !(agencyId || "").trim()}
        className={[
          "h-9 rounded-xl border px-3 text-xs font-semibold transition",
          busy || !(agencyId || "").trim()
            ? "border-white/10 bg-white/5 text-gray-500 cursor-not-allowed"
            : "border-[color:var(--brand-primary)]/40 bg-[color:var(--brand-primary)]/20 text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary)]/30",
        ].join(" ")}
        title={!(agencyId || "").trim() ? "Set agencyId first" : "Process last 30 days"}
      >
        {busy ? "Processing last 30 days..." : "Process last 30 days"}
      </button>
    </div>
  );
}