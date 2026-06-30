# راهنمای استقرار (Deployment)

این پروژه **monorepo** است: یک فرانت‌اند Next.js (`apps/web`) و یک بک‌اند NestJS + PostgreSQL (`apps/api`). این دو **جداگانه** مستقر می‌شوند.

> ⚠️ **مهم:** کل ریپو را یک‌جا روی Vercel نگذارید. Vercel فقط برای فرانت‌اند مناسب است؛ بک‌اند و دیتابیس باید روی یک میزبانِ سرور بروند.

---

## ۱) فرانت‌اند روی Vercel

### تنظیمات پروژه در داشبورد Vercel
هنگام Import کردن ریپو `mjpt1/building`:

| تنظیم | مقدار |
|-------|-------|
| **Root Directory** | `apps/web` ← **مهم‌ترین مورد** (دکمه‌ی Edit کنار Root Directory) |
| Framework Preset | `Next.js` (خودکار) |
| Build Command | `next build` (پیش‌فرض) |
| Install Command | `npm install` (پیش‌فرض) |
| Output Directory | `.next` (پیش‌فرض) |

### Environment Variables (در Vercel)
```
NEXT_PUBLIC_API_URL = https://<آدرس-بک‌اند-شما>/api/v1
```

> اگر **Root Directory** را روی `apps/web` تنظیم نکنید، Vercel ریشه‌ی مخزن را می‌بیند که Next.js ندارد و خطای **«No Next.js version detected»** می‌دهد. این رایج‌ترین علت خطاست.

---

## ۲) بک‌اند + دیتابیس

Vercel سرورِ همیشه‌روشن NestJS و PostgreSQL را اجرا نمی‌کند. گزینه‌ها:

### دیتابیس (PostgreSQL مدیریت‌شده)
- [Neon](https://neon.tech) یا [Supabase](https://supabase.com) (هر دو پلن رایگان دارند) — یک «connection string» می‌دهند.

### بک‌اند (سرور Node/Docker)
میزبان‌هایی که سرور بلندمدت یا Docker اجرا می‌کنند:
- **Railway** / **Render** (خارجی) — به‌سادگی از روی `Dockerfile` یا Node اجرا می‌کنند.
- **لیارا** / **ابرآروان** / **پارس‌پک** (داخلی) — مناسب بازار ایران.

مراحل کلی:
1. سرویس جدید از روی ریپو با **Root Directory = `apps/api`** بسازید (یا از `apps/api/Dockerfile`).
2. متغیرهای محیطی را تنظیم کنید (نمونه در `.env.example`):
   ```
   DATABASE_URL=postgresql://...        # از Neon/Supabase
   JWT_ACCESS_SECRET=...                # رشته‌ی تصادفی ۶۴+ کاراکتری
   JWT_REFRESH_SECRET=...
   CORS_ORIGIN=https://<آدرس-فرانت-روی-vercel>
   PAYMENT_PROVIDER=mock                # یا zarinpal با merchant_id
   SMS_PROVIDER=mock                    # یا kavenegar با api_key
   ```
3. هنگام استقرار، migration و seed اجرا شود:
   ```bash
   npx prisma migrate deploy   # ساخت جدول‌ها
   npm run seed                # داده‌ی اولیه (اختیاری)
   ```
   (در `Dockerfile` بک‌اند، `prisma migrate deploy` به‌صورت خودکار پیش از استارت اجرا می‌شود.)

---

## ۳) اتصال نهایی

پس از استقرار بک‌اند، آدرسش را در Vercel در `NEXT_PUBLIC_API_URL` بگذارید و یک‌بار **Redeploy** کنید. همچنین در بک‌اند `CORS_ORIGIN` را برابر آدرس فرانت قرار دهید.

```
[ مرورگر کاربر ]
        │
        ▼
[ Frontend — Vercel ]  ──API──►  [ Backend — Railway/Render/لیارا ]  ──►  [ PostgreSQL — Neon ]
```

---

## نکته درباره‌ی فایل‌ها (آپلود)
ماژول فایل‌ها به یک فضای **S3-compatible** نیاز دارد (MinIO محلی، یا S3/آروان/لیارا در production). تا وقتی `S3_*` تنظیم نشود، بقیه‌ی بخش‌ها کار می‌کنند و فقط آپلود فایل غیرفعال است.

## چک‌لیست سریع
- [ ] Vercel → Root Directory = `apps/web`
- [ ] Vercel → `NEXT_PUBLIC_API_URL` تنظیم شد
- [ ] دیتابیس Neon/Supabase ساخته شد
- [ ] بک‌اند روی Railway/Render/لیارا با `DATABASE_URL` و secretها مستقر شد
- [ ] بک‌اند → `CORS_ORIGIN` = آدرس فرانت
- [ ] `prisma migrate deploy` اجرا شد
