'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Home, AlertTriangle, Wrench } from 'lucide-react';
import { fetchData } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial, faNumber } from '@/lib/format';
import { StatCard, StatusBadge, Loading, EmptyState, PageHeader } from '@/components/ui';

export default function DashboardPage() {
  const { buildingId, hasPerm, user } = useAuth();
  const isManager = hasPerm('report:read') && !!buildingId;

  if (isManager) return <ManagerDashboard buildingId={buildingId!} />;
  return <ResidentDashboard name={user?.fullName ?? ''} />;
}

function ManagerDashboard({ buildingId }: { buildingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', buildingId],
    queryFn: async () => (await fetchData(`/dashboard/manager/${buildingId}`)).data,
  });

  if (isLoading) return <Loading />;
  if (!data) return <EmptyState />;

  const c = data.cards;
  return (
    <div>
      <PageHeader title="داشبورد مدیریت" subtitle="نمای کلی وضعیت ساختمان در یک نگاه" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="موجودی صندوق" value={formatRial(c.cashboxBalance)} icon={<Wallet size={22} />} tone="brand" />
        <StatCard title="درآمد این ماه" value={formatRial(c.monthIncome)} icon={<TrendingUp size={22} />} tone="success" />
        <StatCard title="هزینه این ماه" value={formatRial(c.monthExpense)} icon={<TrendingDown size={22} />} tone="warning" />
        <StatCard title="واحدهای بدهکار" value={`${faNumber(c.debtorUnitsCount)} واحد`} hint={`بدهی کل: ${formatRial(c.totalDebt)}`} icon={<AlertTriangle size={22} />} tone="danger" />
        <StatCard title="تعداد واحدها" value={`${faNumber(c.unitsCount)} واحد`} icon={<Home size={22} />} tone="brand" />
        <StatCard title="تعمیرات باز" value={`${faNumber(c.openMaintenance)} مورد`} icon={<Wrench size={22} />} tone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-4 font-bold text-gray-800">روند درآمد و هزینه (۶ ماه اخیر)</h3>
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'Vazirmatn' }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1e6)}م`} />
                <Tooltip formatter={(v: any) => formatRial(Number(v))} labelStyle={{ fontFamily: 'Vazirmatn' }} />
                <Area type="monotone" dataKey="income" name="درآمد" stroke="#16a34a" fill="url(#inc)" />
                <Area type="monotone" dataKey="expense" name="هزینه" stroke="#ea580c" fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-bold text-gray-800">هشدارها</h3>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-gray-400">هشداری وجود ندارد. ✅</p>
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((a: any, i: number) => (
                <li key={i} className={`rounded-lg px-3 py-2 text-sm ${
                  a.level === 'danger' ? 'bg-danger-light text-danger-dark'
                    : a.level === 'warning' ? 'bg-warning-light text-warning-dark'
                    : 'bg-brand-50 text-brand-700'}`}>
                  {a.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="mb-4 font-bold text-gray-800">آخرین پرداخت‌ها</h3>
        {data.recentPayments.length === 0 ? (
          <EmptyState text="پرداختی ثبت نشده است." />
        ) : (
          <div className="table-wrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">واحد</th><th className="th">پرداخت‌کننده</th>
                  <th className="th">مبلغ</th><th className="th">روش</th><th className="th">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="td">واحد {p.unitCode}</td>
                    <td className="td">{p.payer ?? '—'}</td>
                    <td className="td font-medium">{formatRial(p.amount)}</td>
                    <td className="td"><StatusBadge status={p.method === 'ONLINE' ? 'PAID' : 'APPROVED'} /></td>
                    <td className="td text-gray-500">{p.paidAt?.jalali ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ResidentDashboard({ name }: { name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-resident'],
    queryFn: async () => (await fetchData('/dashboard/resident')).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.hasUnit) return <EmptyState text="واحدی به حساب شما متصل نیست. با مدیر ساختمان تماس بگیرید." />;

  return (
    <div>
      <PageHeader title={`سلام ${name} 👋`} subtitle={`واحد(های) شما: ${data.units.join('، ')}`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="بدهی فعلی" value={formatRial(data.totalDebt)} tone={data.totalDebt > 0 ? 'danger' : 'success'} icon={<Wallet size={22} />} />
        <StatCard title="تعمیرات باز" value={`${faNumber(data.openMaintenance)} مورد`} tone="warning" icon={<Wrench size={22} />} />
        <StatCard title="واحدها" value={data.units.join('، ')} tone="brand" icon={<Home size={22} />} />
      </div>

      <div className="card mt-6">
        <h3 className="mb-4 font-bold text-gray-800">شارژهای اخیر</h3>
        {data.charges.length === 0 ? <EmptyState text="شارژی ثبت نشده است." /> : (
          <div className="table-wrap">
            <table className="w-full">
              <thead><tr><th className="th">دوره</th><th className="th">مبلغ</th><th className="th">مانده</th><th className="th">وضعیت</th><th className="th"></th></tr></thead>
              <tbody>
                {data.charges.map((ch: any) => (
                  <tr key={ch.id}>
                    <td className="td">{ch.period}</td>
                    <td className="td">{formatRial(ch.amount)}</td>
                    <td className="td font-medium">{formatRial(ch.remaining)}</td>
                    <td className="td"><StatusBadge status={ch.status} /></td>
                    <td className="td">
                      {ch.remaining > 0 && <PayButton chargeId={ch.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PayButton({ chargeId }: { chargeId: string }) {
  async function pay() {
    const { api } = await import('@/lib/api');
    const res = await api.post('/payments/online/initiate', { chargeId });
    window.location.href = res.data.data.redirectUrl;
  }
  return <button onClick={pay} className="btn-primary !py-1 !px-3 text-xs">پرداخت آنلاین</button>;
}
