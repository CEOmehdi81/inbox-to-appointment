'use client';

import { useEffect } from 'react';
import Link from 'next/link';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Card = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  href?: string;
  cta?: string;
};

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5">
      {children}
    </div>
  );
}

function LockBadge() {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-300">
      Coming soon
    </span>
  );
}

export default function ConnectChannelModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const cards: Card[] = [
    {
      key: 'instagram',
      title: 'Instagram',
      description: 'Automate Instagram DMs and capture leads.',
      comingSoon: true,
      icon: (
        <span className="text-lg">📸</span>
      ),
    },
    {
      key: 'tiktok',
      title: 'TikTok',
      description: 'Convert comments and DMs into conversations.',
      comingSoon: true,
      icon: <span className="text-lg">🎵</span>,
    },
    {
      key: 'whatsapp',
      title: 'WhatsApp',
      description: 'Chat with leads on the most popular messaging app.',
      comingSoon: true,
      icon: <span className="text-lg">💬</span>,
    },
    {
      key: 'facebook',
      title: 'Facebook',
      description: 'Connect Messenger and lead forms in one place.',
      comingSoon: true,
      icon: <span className="text-lg">👥</span>,
    },
    {
      key: 'sms',
      title: 'SMS',
      description: 'Collect phone numbers and re-engage via text.',
      comingSoon: true,
      icon: <span className="text-lg">📱</span>,
    },
    {
      key: 'telegram',
      title: 'Telegram',
      description: 'Run fast Telegram automations for inbound leads.',
      comingSoon: true,
      icon: <span className="text-lg">✈️</span>,
    },
    {
      key: 'email',
      title: 'Email',
      description: 'Connect an inbox and route leads automatically.',
      comingSoon: false,
      href: '/admin/settings/channels?connect=email',
      cta: 'Connect',
      icon: <span className="text-lg">✉️</span>,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-10 w-[min(1100px,calc(100%-2rem))] rounded-2xl border border-white/10 bg-[color:var(--brand-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Connect Channel</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {cards.slice(0, 4).map((c) => (
              <ChannelCard key={c.key} card={c} onClose={onClose} />
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {cards.slice(4).map((c) => (
              <ChannelCard key={c.key} card={c} onClose={onClose} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ card, onClose }: { card: Card; onClose: () => void }) {
  const disabled = !!card.comingSoon;

  const content = (
    <div
      className={[
        'rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center',
        disabled ? 'opacity-70' : 'hover:bg-white/[0.06] transition',
      ].join(' ')}
    >
      <div className="flex items-center justify-center">
        <IconWrap>{card.icon}</IconWrap>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="text-base font-semibold text-white">{card.title}</div>
        {disabled && <LockBadge />}
      </div>

      <p className="mx-auto mt-2 max-w-[26ch] text-sm text-gray-400">
        {card.description}
      </p>

      <div className="mt-5 flex justify-center">
        {disabled ? (
          <button
            disabled
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-gray-300"
          >
            Coming soon
          </button>
        ) : (
          <Link
            href={card.href ?? '#'}
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-100"
          >
            {card.cta ?? 'Connect'}
          </Link>
        )}
      </div>
    </div>
  );

  return content;
}