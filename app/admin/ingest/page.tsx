// app/admin/ingest/page.tsx
"use client";

import { useState } from "react";

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
}

type IngestResult = {
  ok: boolean;
  ts?: string;
  upserted?: { listings: number; leads: number; spend: number };
  skipped?: { leads_missing_listing: number };
  dbTotals?: { listings: number; leads: number; spend: number };
  error?: unknown;
};

export default function IngestPage() {
  const [token, setToken] = useState("dev-123"); // same as your .env
  const [payload, setPayload] = useState<string>(`{
  "listings": [
    { "id": "SL_999", "title": "Demo Flat", "portal": "SeLoger",
      "location": "Paris", "price": 320000, "status": "active",
      "listed_at": "2025-11-01T00:00:00Z" }
  ],
  "spend": [
    { "id": "SP_999", "portal": "SeLoger", "month": "2025-11", "amount": 200 }
  ],
  "leads": [
    { "id": "LD_999", "listing_id": "SL_999", "portal": "SeLoger",
      "lead_source": "portal", "created_at": "2025-11-08T12:00:00Z" }
  ]
}`);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onSend() {
    setSending(true);
    setErrorText(null);
    setResult(null);

    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch (e) {
      setSending(false);
      setErrorText("Payload is not valid JSON.");
      return;
    }

    try {
      const url = `${baseUrl()}/api/market/ingest?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // You can also pass via Authorization or x-ingest-token if you prefer:
          // "Authorization": `Bearer ${token}`,
          // "x-ingest-token": token,
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as IngestResult;
      if (!res.ok) {
        setErrorText(`HTTP ${res.status} — ${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setErrorText(String(e?.message || e));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Manual Ingest</h1>
      <p className="text-sm text-neutral-400">
        Paste or modify your JSON payload below and click <strong>Send</strong>. Data will be upserted into your Homi DB.
      </p>

      <div className="space-y-2">
        <label className="block text-sm">Ingest Token</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 text-sm"
          placeholder="dev-123"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Payload (JSON)</label>
        <textarea
          rows={18}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 p-2 font-mono text-sm"
        />
      </div>

      <button
        onClick={onSend}
        disabled={sending}
        className="rounded-md bg-white/10 hover:bg-white/20 px-4 py-2 text-sm"
      >
        {sending ? "Sending…" : "Send"}
      </button>

      {errorText && (
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-red-800 bg-red-950/40 p-3 text-xs text-red-200">
          {errorText}
        </pre>
      )}

      {result && (
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-900 p-3 text-xs">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}