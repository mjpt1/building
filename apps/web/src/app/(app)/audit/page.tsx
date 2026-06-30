'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/api';
import { PageHeader, Loading, EmptyState } from '@/components/ui';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'ایجاد', UPDATE: 'ویرایش', DELETE: 'حذف', LOGIN: 'ورود', LOGIN_OTP: 'ورود با کد',
  REGISTER: 'ثبت‌نام', PAYMENT: 'پرداخت', APPROVE: 'تایید', UPDATE_STATUS: 'تغییر وضعیت',
};

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await fetchData('/audit-logs', { limit: 100 })).data,
  });
  if (isLoading) return <Loading />;
  if (!data?.length) return <EmptyState text="لاگی ثبت نشده است." />;

  return (
    <div>
      <PageHeader title="لاگ فعالیت‌ها" subtitle="ردگیری عملیات حساس کاربران" />
      <div className="table-wrap">
        <table className="w-full">
          <thead><tr><th className="th">کاربر</th><th className="th">عملیات</th><th className="th">موجودیت</th><th className="th">IP</th><th className="th">زمان</th></tr></thead>
          <tbody>
            {data.map((l: any) => (
              <tr key={l.id}>
                <td className="td font-medium">{l.user}</td>
                <td className="td">{ACTION_LABELS[l.action] ?? l.action}</td>
                <td className="td">{l.entity}</td>
                <td className="td text-gray-400" dir="ltr">{l.ip ?? '—'}</td>
                <td className="td text-gray-500">{l.createdAt?.jalali}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
