'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';

// ───────── کارت آمار ─────────
export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  title: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-light text-success-dark',
    warning: 'bg-warning-light text-warning-dark',
    danger: 'bg-danger-light text-danger-dark',
  };
  return (
    <div className="card flex items-center gap-4">
      {icon && <div className={clsx('rounded-xl p-3', tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="mt-1 text-lg font-bold text-gray-800 truncate">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-gray-400">{hint}</div>}
      </div>
    </div>
  );
}

// ───────── نشان وضعیت ─────────
const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-success-light text-success-dark',
  PENDING: 'bg-gray-100 text-gray-600',
  PARTIAL: 'bg-warning-light text-warning-dark',
  OVERDUE: 'bg-danger-light text-danger-dark',
  SUBMITTED: 'bg-gray-100 text-gray-600',
  REVIEWING: 'bg-brand-50 text-brand-700',
  APPROVED: 'bg-brand-100 text-brand-800',
  IN_PROGRESS: 'bg-warning-light text-warning-dark',
  DONE: 'bg-success-light text-success-dark',
  CANCELED: 'bg-danger-light text-danger-dark',
  URGENT: 'bg-danger-light text-danger-dark',
  IMPORTANT: 'bg-warning-light text-warning-dark',
  NORMAL: 'bg-gray-100 text-gray-600',
};
const STATUS_LABELS: Record<string, string> = {
  PAID: 'پرداخت‌شده', PENDING: 'پرداخت‌نشده', PARTIAL: 'نیمه‌پرداخت', OVERDUE: 'معوق',
  SUBMITTED: 'ثبت‌شده', REVIEWING: 'بررسی', APPROVED: 'تاییدشده', IN_PROGRESS: 'در حال انجام',
  DONE: 'انجام‌شده', CANCELED: 'لغوشده', DRAFT: 'پیش‌نویس', CLOSED: 'بسته',
  URGENT: 'فوری', IMPORTANT: 'مهم', NORMAL: 'عادی',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('badge', STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ───────── حالت‌های صفحه ─────────
export function Loading({ text = 'در حال بارگذاری…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span className="mr-3 text-sm">{text}</span>
    </div>
  );
}

export function EmptyState({ text = 'موردی یافت نشد.', icon }: { text?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {icon && <div className="mb-3 opacity-60">{icon}</div>}
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger-dark">{text}</div>
    </div>
  );
}

// ───────── عنوان صفحه ─────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ───────── مودال ساده ─────────
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
