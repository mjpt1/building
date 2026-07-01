# راهنمای استقرار (Deployment)

این پروژه **monorepo** است: یک فرانت‌اند Next.js (`apps/web`) و یک بک‌اند NestJS + PostgreSQL (`apps/api`). این دو **دو پروژه‌ی جدا روی Vercel** هستند — نه یک پروژه‌ی واحد از ریشه‌ی مخزن.

> ⚠️ **مهم:** اگر مستقیم از داشبورد Vercel روی «Import ریشه‌ی مخزن» کلیک کنید، به خطای `No Next.js version detected` یا `404` می‌خورید، چون Vercel ریشه‌ی monorepo را می‌بیند نه پوشه‌ی اپ. روش تضمینی و ساده، **دیپلوی مستقیم از داخل هر پوشه با Vercel CLI** است (نه Import ریشه در داشبورد). همین روش در این پروژه استفاده شده.

---

## معماری استقرار فعلی

```
[ مرورگر کاربر ]
        │
        ▼
[ apps/web → پروژه‌ی Vercel «web» (Next.js عادی) ]
        │  NEXT_PUBLIC_API_URL
        ▼
[ apps/api → پروژه‌ی Vercel «api» (NestJS به‌صورت Serverless Function) ]
        │  DATABASE_URL
        ▼
[ PostgreSQL — Neon (از طریق Vercel Marketplace Integration) ]
```

هر دو اپ و دیتابیس، همگی داخل یک تیم Vercel هستند و نیازی به سرویس بیرونی (Railway/Render/لیارا) ندارند.

---

## ۱) فرانت‌اند (`apps/web`)

از داخل پوشه‌ی `apps/web` مستقیم دیپلوی می‌شود (نه از ریشه‌ی مخزن):

```bash
cd apps/web
npx vercel --prod
```

بار اول یک پروژه‌ی جدید می‌سازد (Next.js را خودکار تشخیص می‌دهد، بدون نیاز به `vercel.json`).

### Environment Variable لازم
```
NEXT_PUBLIC_API_URL = https://<آدرس-پروژه-api>/api/v1
```
چون `NEXT_PUBLIC_*` در **زمان build** داخل باندل جاوااسکریپت نوشته می‌شود، بعد از هر تغییرِ این مقدار باید یک‌بار دوباره `vercel --prod` اجرا شود.

---

## ۲) دیتابیس PostgreSQL (Neon، رایگان)

از طریق Vercel Marketplace (بدون نیاز به کارت بانکی، بدون خروج از اکوسیستم Vercel):

```bash
cd apps/web   # یا هر پروژه‌ای که می‌خواهید دیتابیس به آن وصل شود
npx vercel integration add neon
```

این کار یک دیتابیس Neon می‌سازد، به پروژه وصل می‌کند و متغیرهای `DATABASE_URL`, `POSTGRES_URL`, ... را در `.env.local` می‌ریزد (که به‌صورت خودکار gitignore می‌شود).

سپس جدول‌ها و داده‌ی نمونه:
```bash
cd apps/api
export DATABASE_URL="<مقدار POSTGRES_URL_NON_POOLING از .env.local>"
npx prisma db push --skip-generate
npx ts-node -r tsconfig-paths/register prisma/seed.ts
```

> نکته: برای اتصال از بک‌اند در production از نسخه‌ی **pooled** آدرس (`-pooler` در نام host) استفاده کنید؛ برای مهاجرت/seed یک‌باره از نسخه‌ی مستقیم (unpooled) بهتر است.

---

## ۳) بک‌اند (`apps/api`) — به‌صورت Serverless روی Vercel

بک‌اند NestJS به یک نقطه‌ورود Serverless نیاز دارد که در این پروژه از قبل آماده است:

- **`apps/api/api/index.js`** — نمونه‌ی Nest را از روی خروجی کامپایل‌شده‌ی `dist/` می‌سازد (بدون نیاز به alias در runtime) و بین اجراهای گرم کش می‌کند.
- **`apps/api/vercel.json`** — همه‌ی مسیرها را به همان تابع rewrite می‌کند و پیش از build، `prisma generate` را اجرا می‌کند:
  ```json
  {
    "installCommand": "npm install",
    "buildCommand": "npx prisma generate && npm run build",
    "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
  }
  ```
- در `prisma/schema.prisma` مقدار `binaryTargets = ["native", "rhel-openssl-3.0.x"]` برای سازگاری باینری Prisma با محیط Vercel تنظیم شده است.

دیپلوی:
```bash
cd apps/api
npx vercel --prod
```

### Environment Variables لازم (روی پروژه‌ی `api` در Vercel)
```
DATABASE_URL        = <آدرس pooled از Neon>
JWT_ACCESS_SECRET    = <رشته‌ی تصادفی ۶۴+ کاراکتری>
JWT_REFRESH_SECRET   = <رشته‌ی تصادفی ۶۴+ کاراکتری>
CORS_ORIGIN          = https://<آدرس-پروژه-web>
API_PREFIX           = api
API_VERSION          = v1
SMS_PROVIDER         = mock       # یا kavenegar + KAVENEGAR_API_KEY
PAYMENT_PROVIDER     = mock       # یا zarinpal + ZARINPAL_MERCHANT_ID
```
بعد از افزودن/تغییر env، یک‌بار دیگر `vercel --prod` بزنید تا در deployment بعدی اعمال شود.

---

## ۴) محافظت SSO پیش‌فرض Vercel (نکته‌ی مهم)

پروژه‌های تازه‌ساخته‌شده روی Vercel به‌طور پیش‌فرض «Vercel Authentication» (SSO) را روی همه‌ی آدرس‌های `*.vercel.app` فعال می‌کنند — یعنی بازدیدکننده‌ی عمومی باید اول با حساب Vercel لاگین کند (۳۰۲ ریدایرکت به `vercel.com/sso-api`). برای یک اپ عمومی باید این را خاموش کنید:

**Settings → Deployment Protection → Vercel Authentication → Disabled** (برای هر دو پروژه‌ی `web` و `api`).

---

## چک‌لیست سریع
- [ ] `apps/web` مستقیم با `vercel --prod` از داخل همان پوشه دیپلوی شد
- [ ] `apps/api` مستقیم با `vercel --prod` از داخل همان پوشه دیپلوی شد
- [ ] دیتابیس Neon از طریق `vercel integration add neon` ساخته و `prisma db push` + `seed` اجرا شد
- [ ] env پروژه‌ی `api`: `DATABASE_URL`, `JWT_*_SECRET`, `CORS_ORIGIN` تنظیم شد
- [ ] env پروژه‌ی `web`: `NEXT_PUBLIC_API_URL` = آدرس پروژه‌ی `api`
- [ ] Deployment Protection (SSO) روی هر دو پروژه Disabled شد
- [ ] تست: `POST /api/v1/auth/login` از دامنه‌ی فرانت با CORS درست پاسخ می‌دهد

## نکته درباره‌ی فایل‌ها (آپلود)
ماژول فایل‌ها به یک فضای **S3-compatible** نیاز دارد. تا وقتی `S3_*` تنظیم نشود، بقیه‌ی بخش‌ها کار می‌کنند و فقط آپلود فایل غیرفعال است (بدون کرش).
