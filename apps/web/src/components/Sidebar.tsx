'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Building2, Users, Receipt, Wallet, Wrench,
  Megaphone, BarChart3, Settings, Sparkles, ShieldCheck, ScrollText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  perm?: string;
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/buildings', label: 'ساختمان‌ها و واحدها', icon: Building2, perm: 'building:read' },
  { href: '/residents', label: 'ساکنین و مالکین', icon: Users, perm: 'resident:read' },
  { href: '/charges', label: 'شارژ و بدهی', icon: Receipt, perm: 'charge:read' },
  { href: '/accounting', label: 'حسابداری', icon: Wallet, perm: 'accounting:read' },
  { href: '/maintenance', label: 'تعمیرات', icon: Wrench, perm: 'maintenance:read' },
  { href: '/announcements', label: 'اطلاعیه‌ها', icon: Megaphone, perm: 'announcement:read' },
  { href: '/reports', label: 'گزارش‌ها', icon: BarChart3, perm: 'report:read' },
  { href: '/analytics', label: 'تحلیل هوشمند', icon: Sparkles, perm: 'analytics:query' },
  { href: '/roles', label: 'نقش‌ها و دسترسی', icon: ShieldCheck, perm: 'role:read' },
  { href: '/audit', label: 'لاگ فعالیت‌ها', icon: ScrollText, perm: 'audit:read' },
  { href: '/settings', label: 'تنظیمات', icon: Settings },
];

export function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const { hasPerm } = useAuth();

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 right-0 z-40 w-64 transform border-l border-gray-200 bg-white transition-transform lg:translate-x-0 lg:static',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">🏢</div>
        <span className="text-lg font-bold text-brand-900">سامان</span>
      </div>
      <nav className="space-y-1 p-3">
        {NAV.filter((n) => !n.perm || hasPerm(n.perm)).map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + '/');
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Icon size={18} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
