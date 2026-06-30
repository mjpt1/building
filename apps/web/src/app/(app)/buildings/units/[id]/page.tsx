'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { fetchData } from '@/lib/api';
import { formatRial, faNumber } from '@/lib/format';
import { PageHeader, Loading, EmptyState, StatusBadge, StatCard } from '@/components/ui';
import { Home, Wallet } from 'lucide-react';

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: async () => (await fetchData(`/units/${id}`)).data,
  });
  const { data: charges } = useQuery({
    queryKey: ['unit-charges', id],
    queryFn: async () => (await fetchData(`/units/${id}/charges`)).data,
  });

  if (isLoading) return <Loading />;
  if (!unit) return <EmptyState />;

  return (
    <div>
      <PageHeader title={`واحد ${unit.code}`} subtitle={`${unit.building?.name} · ${unit.floor?.title ?? ''}`} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="متراژ" value={`${faNumber(Number(unit.area))} م²`} icon={<Home size={20} />} />
        <StatCard title="نفرات" value={faNumber(unit.residentsCount)} />
        <StatCard title="بدهی فعلی" value={formatRial(unit.totalDebt)} tone={unit.totalDebt > 0 ? 'danger' : 'success'} icon={<Wallet size={20} />} />
        <StatCard title="وضعیت" value={unit.occupancyStatus === 'OCCUPIED' ? 'سکونت' : 'خالی'} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold text-gray-800">اطلاعات واحد</h3>
          <dl className="space-y-2 text-sm">
            <Row k="مالک" v={unit.owner?.fullName} />
            <Row k="موبایل مالک" v={unit.owner?.mobile} />
            <Row k="ساکن فعلی" v={unit.currentResident?.fullName} />
            <Row k="پارکینگ" v={unit.hasParking ? `${faNumber(unit.parkingCount)} عدد` : 'ندارد'} />
            <Row k="انباری" v={unit.hasStorage ? 'دارد' : 'ندارد'} />
            <Row k="ضریب شارژ" v={faNumber(Number(unit.coefficient))} />
          </dl>
        </div>

        <div className="card">
          <h3 className="mb-3 font-bold text-gray-800">شارژها</h3>
          {!charges?.length ? <EmptyState text="شارژی ثبت نشده." /> : (
            <div className="space-y-2">
              {charges.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm">
                  <span>{c.period}</span>
                  <span className="font-medium">{formatRial(c.amount)}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <dt className="text-gray-500">{k}</dt>
      <dd className="font-medium text-gray-800">{v ?? '—'}</dd>
    </div>
  );
}
