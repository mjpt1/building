# سامانه جامع مدیریت ساختمان (Saman)

پلتفرم production مدیریت ساختمان برای بازار ایران؛ کاملاً فارسی، راست‌چین (RTL) و با تقویم شمسی (جلالی).

این مخزن یک **monorepo** است که شامل بک‌اند (NestJS) و فرانت‌اند (Next.js) و مستندات و زیرساخت Docker می‌باشد.

---

## فهرست امکانات

- مدیریت چند ساختمان، طبقات و واحدها
- مدیریت ساکنین و مالکین و قراردادها (اجاره/مالکیت)
- محاسبه شارژ دوره‌ای با روش‌های متعدد (مساوی، متراژی، نفری، ترکیبی، ثابت، ضریبی، فرمول سفارشی)
- جریمه دیرکرد، وضعیت بدهی، پرداخت دستی و آنلاین
- درگاه پرداخت ایرانی (زرین‌پال) + رسید PDF
- حسابداری کامل: درآمد، هزینه، صندوق‌ها، دفاتر، گزارش جریان نقدی و سود/زیان داخلی
- تعمیرات و نگهداری با گردش‌کار وضعیت، اولویت، پیوست و هزینه
- اطلاعیه‌ها، اعلان درون‌برنامه‌ای و پیامک (کاوه‌نگار)
- داشبورد مدیریتی و داشبورد ساکن
- تحلیل هوشمند فارسی (پرسش به زبان طبیعی روی داده واقعی)
- گزارش‌های مالی/عملیاتی با خروجی PDF و Excel/CSV
- احراز هویت امن (پسورد + OTP پیامکی + Refresh Token)
- کنترل دسترسی مبتنی بر نقش (RBAC) و ثبت لاگ فعالیت (Audit Log)

## نقش‌ها

`Super Admin` · `Building Manager` · `Accountant` · `Resident` · `Owner` · `Maintenance Technician`

---

## معماری در یک نگاه

```
building/
├── apps/
│   ├── api/      → بک‌اند NestJS + Prisma + PostgreSQL
│   └── web/      → فرانت‌اند Next.js 14 (App Router) + Tailwind + shadcn/ui
├── packages/
│   └── shared/   → تایپ‌ها و قراردادهای مشترک (DTO/enum)
├── docs/         → مستندات معماری، دیتابیس، API، راه‌اندازی، راهنمای کاربری
├── docker-compose.yml
└── .env.example
```

استک فنی:

| لایه | فناوری |
|------|--------|
| Backend | NestJS 10، TypeScript، Prisma 5 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14، React 18، TypeScript، TailwindCSS، shadcn/ui |
| Auth | JWT + Refresh Token + RBAC |
| تاریخ شمسی | `dayjs-jalali` (UI) + ذخیره UTC در دیتابیس |
| نمودار | Recharts |
| Validation | Zod / class-validator |
| Storage | S3-compatible (MinIO) |
| Test | Jest (unit/integration) + Supertest (e2e) |
| Deploy | Docker + docker-compose |

---

## راه‌اندازی سریع (Local Development)

پیش‌نیازها: Node.js 20+، Docker، pnpm 9+

```bash
# ۱) کلون و نصب وابستگی‌ها
pnpm install

# ۲) بالا آوردن زیرساخت (PostgreSQL + MinIO)
cp .env.example .env
docker compose up -d db minio

# ۳) آماده‌سازی دیتابیس
pnpm --filter @saman/api prisma:generate
pnpm --filter @saman/api prisma:migrate
pnpm --filter @saman/api seed

# ۴) اجرای بک‌اند و فرانت‌اند
pnpm --filter @saman/api dev      # http://localhost:4000
pnpm --filter @saman/web dev      # http://localhost:3000
```

اجرای کامل با Docker:

```bash
docker compose up --build
```

جزئیات کامل در [docs/setup.md](docs/setup.md).

## کاربران پیش‌فرض پس از seed

| نقش | موبایل | رمز |
|-----|--------|-----|
| مدیر کل | `09120000000` | `Admin@1234` |
| مدیر ساختمان | `09121111111` | `Manager@1234` |
| حسابدار | `09122222222` | `Account@1234` |
| ساکن | `09123333333` | `Resident@1234` |

---

## مستندات

- [معماری سیستم](docs/architecture.md)
- [طراحی دیتابیس](docs/database.md)
- [مرجع API](docs/api.md)
- [راهنمای راه‌اندازی](docs/setup.md)
- [راهنمای کاربری](docs/user-guide.md)

## مجوز

اختصاصی — تمامی حقوق محفوظ است.
