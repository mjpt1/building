'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, LogOut } from 'lucide-react';
import { fetchData } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { toFaDigits } from '@/lib/jalali';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { data: unread } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: async () => (await fetchData('/notifications/unread-count')).data,
    refetchInterval: 60_000,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <button className="lg:hidden" onClick={onMenu}>
        <Menu size={22} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-50">
          <Bell size={20} />
          {unread?.count > 0 && (
            <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
              {toFaDigits(unread.count)}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 border-r border-gray-100 pr-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
            {user?.fullName?.charAt(0) ?? '؟'}
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-gray-800">{user?.fullName}</div>
            <div className="text-xs text-gray-400">{toFaDigits(user?.mobile ?? '')}</div>
          </div>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-gray-400 hover:bg-danger-light hover:text-danger" title="خروج">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
