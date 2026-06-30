<div align="right">

# 🏢 سامان — سامانه جامع مدیریت ساختمان

پلتفرم **production** مدیریت ساختمان برای بازار ایران؛ کاملاً **فارسی**، **راست‌چین (RTL)** و با **تقویم شمسی (جلالی)**.

یک نرم‌افزار واقعی و قابل‌استقرار برای مدیریت ساختمان، شارژ، حسابداری، تعمیرات و ارتباط با ساکنین — نه دمو، نه نمونه‌ی آموزشی.

![Stack](https://img.shields.io/badge/Backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)
![Next](https://img.shields.io/badge/Frontend-Next.js%2014-000000?logo=next.js&logoColor=white)
![Postgres](https://img.shields.io/badge/DB-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?logo=prisma&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

</div>

---

## 📋 فهرست

- [امکانات](#-امکانات)
- [کاربران پیش‌فرض (یوزر و پسورد)](#-کاربران-پیشفرض-ورود-به-سامانه)
- [پشته فنی](#-پشته-فنی)
- [نقش‌ها و دسترسی‌ها](#-نقشها-و-سطح-دسترسی)
- [راه‌اندازی سریع](#-راهاندازی-سریع)
- [داده‌ی نمونه](#-دادهی-نمونه-seed)
- [ساختار پروژه](#-ساختار-پروژه)
- [مستندات](#-مستندات)
- [تست](#-تست)
- [نقشه راه](#-نقشه-راه)

---

## ✨ امکانات

### مدیریت ساختمان
- تعریف چند ساختمان، طبقات و واحدها (ساخت/ویرایش/حذف از طریق رابط کاربری)
- ثبت کامل اطلاعات واحد: متراژ، نفرات، پارکینگ، انباری، ضریب شارژ، وضعیت سکونت
- تخصیص مالک و ساکن به هر واحد

### ساکنین و مالکین
- ثبت، ویرایش و حذف ساکنین و مالکین
- قراردادها (مالک‌ساکن / اجاره) با ودیعه و اجاره
- سابقه پرداخت‌ها و بدهی هر شخص

### شارژ و بدهی
- محاسبه‌ی شارژ با **۷ روش**: مساوی، متراژی، نفری، ترکیبی، ثابت، ضریبی، فرمول سفارشی
- پیش‌نمایش محاسبه پیش از ثبت + گردش‌کار پیش‌نویس → تایید → ابلاغ
- جریمه‌ی دیرکرد، وضعیت بدهی هر واحد، گزارش بدهکاران
- ثبت پرداخت دستی (نقدی/کارت/واریز) و پرداخت آنلاین

### پرداخت آنلاین
- اتصال به درگاه ایرانی (**زرین‌پال**) + حالت sandbox/mock برای توسعه
- صدور رسید قابل‌چاپ + کد رهگیری

### حسابداری
- درآمد، هزینه، دسته‌بندی هزینه، صندوق‌های متعدد و دفتر کل
- گزارش ماهانه/سالانه، جریان نقدی، تفکیک هزینه بر اساس دسته

### تعمیرات و نگهداری
- ثبت درخواست توسط ساکن + گردش‌کار وضعیت (ثبت → بررسی → تایید → در حال انجام → انجام‌شده)
- تخصیص تکنسین، ثبت هزینه، تاریخچه و یادداشت

### ارتباطات
- اطلاعیه‌ها (همه/ساکنین/مالکین) + اعلان درون‌برنامه‌ای + پیامک (کاوه‌نگار)

### داشبورد و گزارش
- داشبورد مدیر (موجودی صندوق، درآمد/هزینه، بدهکاران، نمودار، هشدارها)
- داشبورد ساکن (بدهی، شارژها، پرداخت آنلاین، اطلاعیه‌ها)
- گزارش‌های مالی و عملیاتی با نمودار

### تحلیل هوشمند فارسی
- پرسش به زبان طبیعی روی **داده‌ی واقعی**: «بدهکاران این ماه چه کسانی هستند؟»، «موجودی صندوق چقدر است؟»، «برای شارژ ماه بعد چه عددی پیشنهاد می‌کنی؟» و…

### امنیت
- احراز هویت (رمز + OTP پیامکی + Refresh Token + نشست‌های فعال)
- کنترل دسترسی مبتنی بر نقش (RBAC) با ۵۰+ مجوز ریزدانه
- رمزنگاری پسورد (argon2)، rate limiting، Helmet، اعتبارسنجی ورودی، ثبت لاگ فعالیت (Audit Log)

---

## 🔑 کاربران پیش‌فرض (ورود به سامانه)

پس از اجرای `seed`، این کاربران ساخته می‌شوند:

| نقش | موبایل (نام کاربری) | رمز عبور |
|------|----------------------|-----------|
| **مدیر کل** (Super Admin) | `09120000000` | `Admin@1234` |
| **مدیر ساختمان** | `09121111111` | `Manager@1234` |
| **حسابدار** | `09122222222` | `Account@1234` |
| **ساکن** | `09123333333` | `Resident@1234` |
| **ساکن دوم** | `09124444444` | `Resident@1234` |
| **تکنسین تعمیرات** | `09125555555` | `Tech@1234` |

> برای دیدن کامل امکانات مدیریتی با **`09121111111` / `Manager@1234`** وارد شوید.
> برای ساخت ساختمان جدید یا مدیریت کاربران با **`09120000000` / `Admin@1234`** وارد شوید.
>
> ⚠️ این اعتبارنامه‌ها فقط برای محیط توسعه/نمونه است؛ پیش از استقرار production حتماً تغییرشان دهید.

---

## 🛠 پشته فنی

| لایه | فناوری |
|------|--------|
| Backend | NestJS 10، TypeScript، Prisma 5 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router)، React 18، TypeScript، TailwindCSS |
| Auth | JWT + Refresh Token + RBAC |
| تاریخ شمسی | `jalaali-js` (ذخیره UTC، نمایش/ورودی جلالی) |
| نمودار | Recharts |
| Validation | class-validator |
| Storage | S3-compatible (MinIO) |
| پیامک / پرداخت | کاوه‌نگار / زرین‌پال (با حالت mock) |
| Test | Jest (unit/e2e) |
| Deploy | Docker + docker-compose |

---

## 👥 نقش‌ها و سطح دسترسی

`Super Admin` · `Building Manager` · `Accountant` · `Resident` · `Owner` · `Maintenance Technician`

دسترسی هر نقش با مجوزهای ریزدانه (مثل `charge:create`, `payment:read`, `unit:update`) کنترل می‌شود. جزئیات در [`apps/api/src/modules/rbac/rbac.constants.ts`](apps/api/src/modules/rbac/rbac.constants.ts).

---

## 🚀 راه‌اندازی سریع

### پیش‌نیازها
- Node.js 20+
- pnpm 9+ (یا npm)
- Docker (برای PostgreSQL و MinIO)

### روش ۱ — توسعه‌ی محلی (پیشنهادی)

```bash
# ۱) نصب وابستگی‌ها
pnpm install        # یا: در هر اپ جداگانه npm install

# ۲) تنظیم env
cp .env.example .env

# ۳) بالا آوردن دیتابیس و فضای ذخیره‌سازی
docker compose up -d db minio

# ۴) آماده‌سازی دیتابیس + داده‌ی نمونه
cd apps/api
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
cd ../..

# ۵) اجرای بک‌اند و فرانت‌اند
pnpm --filter @saman/api dev    # http://localhost:4000  (مستندات: /api/docs)
pnpm --filter @saman/web dev    # http://localhost:3000
```

سپس به `http://localhost:3000` بروید و با یکی از کاربران بالا وارد شوید.

### روش ۲ — اجرای کامل با Docker

```bash
cp .env.example .env
docker compose up --build
# سپس seed:
docker compose exec api npm run seed
```

### روش ۳ — بدون Docker (PostgreSQL قابل‌حمل)

اگر Docker ندارید، می‌توانید یک PostgreSQL قابل‌حمل (بدون نصب سیستمی) را اجرا کنید:

```bash
# دانلود باینری کامل PostgreSQL از منبع zonky (~۲۰مگ)
curl -L -o pg.jar "https://repo1.maven.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-windows-amd64/16.4.0/embedded-postgres-binaries-windows-amd64-16.4.0.jar"
# استخراج (jar یک zip است؛ داخلش یک فایل txz کامل PostgreSQL دارد)
# سپس initdb و اجرای postgres.exe روی پورت دلخواه، و تنظیم DATABASE_URL در apps/api/.env
```

> برای ویندوز: jar را با `Expand-Archive` باز کنید، فایل `postgres-windows-x86_64.txz` را با `tar -xJf` استخراج کنید، سپس `initdb -D <data> -U postgres -A trust` و `postgres -D <data> -p 5433`. بعد `npm run prisma:db:push && npm run seed`.

---

## 🌱 داده‌ی نمونه (seed)

اسکریپت `seed` یک محیط واقعی می‌سازد:

- **ساختمان:** مجتمع مسکونی نیلوفر (تهران) — ۴ طبقه، ۸ واحد
- **اشخاص:** ۲ مالک، ۲ ساکن دارای حساب کاربری، با قرارداد
- **شارژ:** یک دوره‌ی محاسبه‌شده (روش ترکیبی) با ۴ واحد پرداخت‌شده
- **حسابداری:** صندوق با مانده، درآمد و چند هزینه در دسته‌های مختلف
- **تعمیرات:** ۲ درخواست (یکی فوری و تخصیص‌یافته)
- **اطلاعیه:** ۱ اطلاعیه‌ی سنجاق‌شده
- **نقش‌ها و مجوزها:** کامل، به‌همراه ۶ کاربر بالا

---

## 📁 ساختار پروژه

```
building/
├── apps/
│   ├── api/                  # بک‌اند NestJS
│   │   ├── prisma/           # schema.prisma + seed.ts
│   │   └── src/
│   │       ├── common/       # prisma, guards, filters, utils (jalali/money/crypto)
│   │       ├── config/
│   │       ├── integrations/ # sms (کاوه‌نگار), payment (زرین‌پال)
│   │       └── modules/      # auth, rbac, buildings, residents, charges,
│   │                         # payments, accounting, maintenance, announcements,
│   │                         # notifications, reports, analytics, files, audit, dashboard
│   └── web/                  # فرانت‌اند Next.js 14
│       └── src/
│           ├── app/(app)/    # داشبورد و صفحات ماژول‌ها (RTL)
│           ├── components/   # Sidebar, Topbar, UI, JalaliDateInput
│           └── lib/          # api client, auth-store, jalali, format
├── packages/shared/          # تایپ‌ها و ثابت‌های مشترک (آماده‌ی اپ موبایل)
├── docs/                     # architecture, database, api, setup, user-guide
├── docker-compose.yml
└── .env.example
```

---

## 📚 مستندات

- [معماری سیستم](docs/architecture.md)
- [طراحی دیتابیس](docs/database.md)
- [مرجع API](docs/api.md)
- [راهنمای راه‌اندازی](docs/setup.md)
- [راهنمای کاربری](docs/user-guide.md)

مستندات تعاملی API (Swagger): پس از اجرای بک‌اند روی `http://localhost:4000/api/docs`.

---

## 🧪 تست

```bash
cd apps/api
npm test          # تست‌های واحد (موتور محاسبه شارژ، تاریخ جلالی)
npm run test:e2e  # تست‌های e2e احراز هویت
```

---

## 🗺 نقشه راه

- [ ] آپلود فاکتور/تصویر روی MinIO در فرم‌ها
- [ ] خروجی PDF و Excel گزارش‌ها
- [ ] اپ موبایل (React Native) روی همان API
- [ ] چند-مستاجری (multi-tenant) سازمانی

---

## 📄 مجوز

اختصاصی — تمامی حقوق محفوظ است.

<div align="center">

ساخته‌شده با ❤️ برای مدیریت ساختمان‌های ایران

</div>
