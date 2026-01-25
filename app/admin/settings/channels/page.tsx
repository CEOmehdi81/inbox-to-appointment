"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Channel = {
  id: string;
  name: string;
  type: "WHATSAPP" | "EMAIL" | "PORTAL" | "WEBFORM" | "CALL_TRACKING";
  isActive: boolean;
  createdAt: string;
  config?: any;
};

type CardKey =
  | "email"
  | "instagram"
  | "tiktok"
  | "whatsapp"
  | "facebook"
  | "sms"
  | "telegram";

type Card = {
  key: CardKey;
  title: string;
  enabled: boolean;
};

function isValidEmail(value: string) {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function readJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  if (!text) return ([] as unknown) as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("API did not return valid JSON.");
  }
}

function BrandIcon({ k }: { k: CardKey }) {
  const ring =
    "grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5";
  const glyph =
    "grid h-6 w-6 place-items-center rounded-xl text-[10px] font-semibold text-white";

  switch (k) {
    case "instagram":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400`}>
            in
          </div>
        </div>
      );
    case "tiktok":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-neutral-900 border border-white/10`}>tt</div>
        </div>
      );
    case "whatsapp":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-emerald-500`}>wa</div>
        </div>
      );
    case "facebook":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-blue-500`}>fb</div>
        </div>
      );
    case "sms":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-emerald-400`}>sms</div>
        </div>
      );
    case "telegram":
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-sky-500`}>tg</div>
        </div>
      );
    case "email":
    default:
      return (
        <div className={ring} aria-hidden>
          <div className={`${glyph} bg-indigo-500`}>@</div>
        </div>
      );
  }
}

function ChannelCard(props: {
  card: Card;
  comingSoon: boolean;
  connectedLabel?: string;
  busy: boolean;
  onConnect: () => void;
  connectLabel?: string;
}) {
  const { card, comingSoon, connectedLabel, busy, onConnect, connectLabel } = props;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandIcon k={card.key} />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">
                {card.title}
              </div>
              {!comingSoon && (
                <div className="mt-0.5 text-xs text-white/60">
                  {connectedLabel ?? "Ready to connect"}
                </div>
              )}
            </div>
          </div>

          {comingSoon && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              Coming soon
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onConnect}
            disabled={comingSoon || busy}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              comingSoon
                ? "bg-white/10 text-white/50"
                : "bg-white text-neutral-900 hover:bg-neutral-100",
              "disabled:cursor-not-allowed disabled:opacity-80",
            ].join(" ")}
          >
            {busy ? "Saving..." : (connectLabel ?? "Connect")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailConnectModal(props: {
  open: boolean;
  initialEmail?: string;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSaveAndConnect: (email: string) => void;
}) {
  const { open, initialEmail, saving, error, onClose, onSaveAndConnect } = props;
  const [email, setEmail] = useState(initialEmail ?? "");

  useEffect(() => {
    if (open) setEmail(initialEmail ?? "");
  }, [open, initialEmail]);

  if (!open) return null;

  const canSave = isValidEmail(email) && !saving;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={saving ? undefined : onClose}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-base font-semibold text-white">Connect Email</div>
              <div className="mt-1 text-sm text-white/60">
                This will start Gmail OAuth after saving.
              </div>
            </div>
            <button
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/70 hover:bg-white/10"
              onClick={saving ? undefined : onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-5 py-4">
            <label className="block text-xs text-white/60 mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@agency.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-fuchsia-500/60"
              autoFocus
            />

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={saving ? undefined : onClose}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => onSaveAndConnect(email)}
                disabled={!canSave}
              >
                {saving ? "Saving..." : "Save and connect Gmail"}
              </button>
            </div>

            <div className="mt-3 text-xs text-white/40">
              Use a shared inbox for the agency, not a personal email.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // MVP fallback: if missing, force agencyId=test into URL so everything works.
  const agencyId = searchParams.get("agencyId") || "test";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const cards: Card[] = useMemo(
    () => [
      { key: "email", title: "Email", enabled: true },
      { key: "instagram", title: "Instagram", enabled: false },
      { key: "tiktok", title: "TikTok", enabled: false },
      { key: "whatsapp", title: "WhatsApp", enabled: false },
      { key: "facebook", title: "Facebook", enabled: false },
      { key: "sms", title: "SMS", enabled: false },
      { key: "telegram", title: "Telegram", enabled: false },
    ],
    []
  );

  const emailChannel = useMemo(
    () => channels.find((c) => c.type === "EMAIL"),
    [channels]
  );

  const workflowEmail = useMemo(() => {
    const v = emailChannel?.config?.workflowEmail;
    return typeof v === "string" ? v : "";
  }, [emailChannel]);

  useEffect(() => {
    // keep URL consistent
    const url = new URL(window.location.href);
    if (!url.searchParams.get("agencyId")) {
      url.searchParams.set("agencyId", agencyId);
      router.replace(url.pathname + "?" + url.searchParams.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels?agencyId=${encodeURIComponent(agencyId)}`, {
        cache: "no-store",
      });
      const data = await readJsonSafe<any>(res);
      setChannels(Array.isArray(data) ? (data as Channel[]) : []);
    } catch (e) {
      console.error("refresh() failed", e);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  async function ensureEmailChannel(): Promise<Channel> {
    if (emailChannel) return emailChannel;

    const createRes = await fetch(`/api/channels?agencyId=${encodeURIComponent(agencyId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Email", type: "EMAIL" }),
    });

    const created = await readJsonSafe<Channel>(createRes);
    return created;
  }

  async function saveEmailAndConnectGmail(email: string) {
    setEmailError(undefined);

    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setSavingEmail(true);
    try {
      const ch = await ensureEmailChannel();

      const nextConfig = {
        ...(ch.config ?? {}),
        workflowEmail: email.trim(),
      };

      const patchRes = await fetch(
        `/api/channels/${ch.id}?agencyId=${encodeURIComponent(agencyId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: true,
            config: nextConfig,
          }),
        }
      );

      await readJsonSafe<any>(patchRes);
      await refresh();

      // redirect to OAuth start
      window.location.href =
        `/api/oauth/gmail/start?agencyId=${encodeURIComponent(agencyId)}` +
        `&email=${encodeURIComponent(email.trim())}`;
    } catch (e: any) {
      setEmailError(e?.message ? `Could not connect email: ${e.message}` : "Could not connect email.");
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <EmailConnectModal
        open={emailModalOpen}
        initialEmail={workflowEmail}
        saving={savingEmail}
        error={emailError}
        onClose={() => setEmailModalOpen(false)}
        onSaveAndConnect={saveEmailAndConnectGmail}
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative border-b border-white/10 px-8 py-7">
          <h1 className="text-2xl font-semibold text-white">Connect Channel</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Connect channels so HOMI can attribute leads, de-duplicate sources, and measure real outcomes.
          </p>
          <p className="mt-1 text-xs text-white/40">
            {loading
              ? "Loading..."
              : workflowEmail
              ? `Workflow email: ${workflowEmail}`
              : "No workflow email connected yet."}
          </p>
          <p className="mt-1 text-xs text-white/30">
            agencyId: {agencyId}
          </p>
        </div>

        <div className="relative px-8 py-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const isEmail = card.key === "email";
              const comingSoon = !card.enabled;

              return (
                <ChannelCard
                  key={card.key}
                  card={card}
                  comingSoon={comingSoon}
                  busy={isEmail ? savingEmail : false}
                  connectLabel={isEmail ? "Connect Gmail" : "Connect"}
                  connectedLabel={
                    isEmail
                      ? workflowEmail
                        ? `Connected: ${workflowEmail}`
                        : "Ready to connect"
                      : undefined
                  }
                  onConnect={() => {
                    if (!isEmail) return;
                    setEmailError(undefined);
                    setEmailModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}