'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';

type NavLink = {
  href: string;
  label: string;
};

type NavSection = {
  title?: string;
  items: NavLink[];
};

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/leads', label: 'Leads' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Overview' },
      { href: '/admin/settings/channels', label: 'Channels' },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

function NavItem(props: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const { href, label, active, collapsed } = props;

  return (
    <Link
      href={href}
      title={label}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
        collapsed ? 'justify-center px-2' : '',
        active
          ? 'bg-[color:var(--brand-primary)]/20 text-white'
          : 'text-gray-300 hover:text-white hover:bg-white/5',
      ].join(' ')}
    >
      <span
        className={[
          'h-2.5 w-2.5 rounded-full',
          active ? 'bg-[color:var(--brand-lime)]' : 'bg-white/40',
        ].join(' ')}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function AdminLayout(props: { children: ReactNode }) {
  const { children } = props;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const gridStyle: CSSProperties = {
    ['--sidebar-w' as any]: collapsed ? '72px' : '240px',
  };

  return (
    <div className="min-h-screen">
      <div
        style={gridStyle}
        className="mx-auto grid max-w-[1400px] gap-6 p-6 [grid-template-columns:var(--sidebar-w)_1fr]"
      >
        <aside className="relative top-6 h-[calc(100vh-3rem)] rounded-2xl border border-white/10 bg-[color:var(--brand-card)] p-4">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="absolute -right-3 top-4 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[color:var(--brand-card)] text-xs text-gray-300 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>

          <div className="mb-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--brand-lime)]" />
            {!collapsed && (
              <>
                <span className="font-semibold">HOMI</span>
                <span className="text-xs text-gray-400">Admin</span>
                <span className="ml-auto text-[10px] text-gray-500">v0.1</span>
              </>
            )}
          </div>

          <nav className="space-y-4">
            {SECTIONS.map((section, idx) => (
              <div key={idx}>
                {!collapsed && section.title && (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {section.title}
                  </div>
                )}

                <div className="space-y-1">
                  {section.items.map(item => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(pathname, item.href)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="rounded-2xl border border-white/10 bg-[color:var(--brand-card)] p-6 shadow">
          {children}
        </main>
      </div>
    </div>
  );
}