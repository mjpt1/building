'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/api';
import { faNumber } from '@/lib/format';
import { PageHeader, Loading, EmptyState } from '@/components/ui';
import { ShieldCheck } from 'lucide-react';

export default function RolesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await fetchData('/rbac/roles')).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState />;

  return (
    <div>
      <PageHeader title="نقش‌ها و سطح دسترسی" subtitle="مدیریت نقش‌ها و مجوزهای سامانه" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.map((r: any) => (
          <div key={r.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-brand-600" />
                <h3 className="font-bold text-gray-800">{r.label}</h3>
              </div>
              <span className="text-xs text-gray-400">{faNumber(r.usersCount)} کاربر</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions.slice(0, 12).map((p: string) => (
                <span key={p} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{p}</span>
              ))}
              {r.permissions.length > 12 && <span className="text-[11px] text-gray-400">+{faNumber(r.permissions.length - 12)} مورد دیگر</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
