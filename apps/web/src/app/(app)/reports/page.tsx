'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { fetchData } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatRial } from '@/lib/format';
import { PageHeader, Loading, EmptyState } from '@/components/ui';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04'];

export default function ReportsPage() {
  const { buildingId } = useAuth();

  const { data: chart, isLoading } = useQuery({
    queryKey: ['report-chart', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/reports/income-expense-chart`, { months: 12 })).data,
    enabled: !!buildingId,
  });
  const { data: byCat } = useQuery({
    queryKey: ['report-cat', buildingId],
    queryFn: async () => (await fetchData(`/buildings/${buildingId}/reports/expense-by-category`)).data,
    enabled: !!buildingId,
  });

  if (!buildingId) return <EmptyState text="ابتدا یک ساختمان انتخاب کنید." />;
  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader title="گزارش‌ها" subtitle="تحلیل مالی و عملیاتی ساختمان" />

      <div className="card mb-6">
        <h3 className="mb-4 font-bold text-gray-800">درآمد و هزینه (۱۲ ماه اخیر)</h3>
        <div className="h-80" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1e6)}م`} />
              <Tooltip formatter={(v: any) => formatRial(Number(v))} labelStyle={{ fontFamily: 'Vazirmatn' }} />
              <Legend wrapperStyle={{ fontFamily: 'Vazirmatn' }} />
              <Bar dataKey="income" name="درآمد" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="هزینه" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 font-bold text-gray-800">هزینه‌ها به تفکیک دسته</h3>
        {!byCat?.length ? <EmptyState text="داده‌ای موجود نیست." /> : (
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCat} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.category}>
                    {byCat.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatRial(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {byCat.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.category}
                  </span>
                  <span className="font-medium">{formatRial(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
