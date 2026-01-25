"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const agencyId = params?.get("agencyId") ?? "";

  async function load() {
    const res = await fetch(`/api/integrations/email/status?agencyId=${encodeURIComponent(agencyId)}`, { cache: "no-store" });
    setState(await res.json());
  }

  useEffect(() => {
    if (!agencyId) return;
    load();
  }, [agencyId]);

  async function verify() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/integrations/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Verify failed");
    } finally {
      setBusy(false);
    }
  }

  const labelName = state?.labelName ?? "HOMI/Leads";
  const verified = state?.status === "VERIFIED";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-white/10 bg-[color:var(--brand-card)] p-6">
        <h1 className="text-xl font-semibold text-white">Verify your leads inbox</h1>
        <p className="mt-2 text-sm text-white/70">
          HOMI will only process emails tagged with <span className="font-medium text-white">{labelName}</span>.
          Create a Gmail filter that applies this label to inbound enquiries, then verify.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="font-medium text-white">What you do in Gmail (one time)</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Gmail Settings → Filters and blocked addresses</li>
            <li>Create a filter for your enquiries, example: To: <span className="text-white">contact@agency.com</span></li>
            <li>Action: Apply label <span className="text-white">{labelName}</span></li>
          </ol>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Status: <span className="text-white/80">{state?.status ?? "Loading..."}</span>
          </div>

          <button
            onClick={verify}
            disabled={busy || !agencyId || verified}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
          >
            {verified ? "Verified" : busy ? "Verifying..." : "Verify now"}
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}