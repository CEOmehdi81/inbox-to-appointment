'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const NAV = [
  { href: '/admin',              label: 'Dashboard' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/properties',   label: 'Properties' },
  { href: '/admin/listings',     label: 'Listings' },   // <-- already added
  { href: '/admin/market',       label: 'Market' },     // <-- NEW
  { href: '/admin/customers',    label: 'Customers' },
  { href: '/admin/settings',     label: 'Settings' },
  { href: '/admin/documents',    label: 'Documents' },
];

function NavItem({
  href, label, active, collapsed,
}: { href: string; label: string; active: boolean; collapsed: boolean }) {
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
      <span className={['h-2.5 w-2.5 rounded-full', active ? 'bg-[color:var(--brand-lime)]' : 'bg-white/40'].join(' ')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const gridStyle: CSSProperties = {
    ['--sidebar-w' as any]: collapsed ? '72px' : '240px',
  };

  return (
    <div className="min-h-screen">
      <div style={gridStyle} className="mx-auto max-w-[1400px] grid [grid-template-columns:var(--sidebar-w)_1fr] gap-6 p-6">
        <aside className="sticky top-6 h-[calc(100vh-3rem)] rounded-2xl bg-[color:var(--brand-card)] border border-white/10 p-4">
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

          <nav className="space-y-1">
            {NAV.map(item => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                active={item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </aside>

        <main className="rounded-2xl bg-[color:var(--brand-card)] border border-white/10 p-6 shadow">
          {children}
        </main>
      </div>
    </div>
  );
}