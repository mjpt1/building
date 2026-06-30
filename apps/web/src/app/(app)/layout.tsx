'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { useAuth } from '@/lib/auth-store';
import { tokenStore } from '@/lib/api';
import { Loading } from '@/components/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, loadMe } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!tokenStore.getAccess()) {
      router.replace('/login');
      return;
    }
    loadMe();
  }, [loadMe, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading text="در حال آماده‌سازی…" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
