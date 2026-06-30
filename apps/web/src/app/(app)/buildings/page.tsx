'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Home } from 'lucide-react';
import { fetchData } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { faNumber } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge } from '@/components/ui';

export default function BuildingsPage() {
  const { buildingId } = useAuth();
  const [selected, setSelected] = useState<string | null>(buildingId);

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => (await fetchData('/buildings')).data,
  });

  const activeId = selected ?? buildings?.[0]?.id;

  return (
    <div>
      <PageHeader title="ساختمان‌ها و واحدها" subtitle="مدیریت ساختمان‌ها، طبقات و واحدها" />
      {isLoading ? <Loading /> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            {buildings?.map((b: any) => (
              <button key={b.id} onClick={() => setSelected(b.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-right transition ${
                  activeId === b.id ? 'border-brand-300 bg-brand-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                <Building2 size={20} className="text-brand-600" />
                <div>
                  <div className="text-sm font-medium text-gray-800">{b.name}</div>
                  <div className="text-xs text-gray-400">{faNumber(b.unitsCount)} واحد · {b.city}</div>
                </div>
              </button>
            ))}
            {buildings?.length === 0 && <EmptyState text="ساختمانی ثبت نشده." />}
          </div>
          <div className="lg:col-span-3">{activeId && <UnitsTable buildingId={activeId} />}</div>
        </div>
      )}
    </div>
  );
}

function UnitsTable({ buildingId }: { buildingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/units`, { limit: 100 })),
  });
  if (isLoading) return <Loading />;
  const units = data?.data ?? [];

  return (
    <div className="card">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800"><Home size={18} /> واحدها</h3>
      {units.length === 0 ? <EmptyState text="واحدی ثبت نشده." /> : (
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">واحد</th><th className="th">طبقه</th><th className="th">متراژ</th>
                <th className="th">نفرات</th><th className="th">مالک</th><th className="th">ساکن</th>
                <th className="th">وضعیت</th><th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u: any) => (
                <tr key={u.id}>
                  <td className="td font-medium">واحد {u.code}</td>
                  <td className="td">{u.floor?.title ?? '—'}</td>
                  <td className="td">{faNumber(Number(u.area))} م²</td>
                  <td className="td">{faNumber(u.residentsCount)}</td>
                  <td className="td">{u.owner?.fullName ?? '—'}</td>
                  <td className="td">{u.currentResident?.fullName ?? '—'}</td>
                  <td className="td"><StatusBadge status={u.occupancyStatus === 'OCCUPIED' ? 'PAID' : 'PENDING'} /></td>
                  <td className="td"><Link href={`/buildings/units/${u.id}`} className="text-brand-600 hover:underline">جزئیات</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
