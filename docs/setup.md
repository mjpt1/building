# راهنمای راه‌اندازی — سامانه مدیریت ساختمان

## پیش‌نیازها

- **Node.js** نسخه ۲۰ یا بالاتر
- **pnpm** نسخه ۹ (`npm i -g pnpm`)
- **Docker** و **Docker Compose** (برای PostgreSQL و MinIO)
- سیستم‌عامل: Linux / macOS / Windows

---

## روش ۱: توسعه‌ی محلی (توصیه‌شده برای توسعه)

### ۱) دریافت کد و نصب وابستگی‌ها
```bash
git clone <repo-url> saman && cd saman
pnpm install
```

### ۲) تنظیم متغیرهای محیطی
```bash
cp .env.example .env
# در صورت نیاز مقادیر را ویرایش کنید (به‌ویژه secretهای JWT برای production)
```

### ۳) بالا آوردن زیرساخت (دیتابیس + فضای ذخیره‌سازی)
```bash
docker compose up -d db minio
```
- PostgreSQL روی پورت `5432`
- MinIO روی `9000` (API) و `9001` (کنسول وب، کاربر/رمز پیش‌فرض: `minioadmin`)

### ۴) آماده‌سازی دیتابیس
```bash
cd apps/api
pnpm prisma:generate          # تولید Prisma Client
pnpm prisma:migrate:dev       # ساخت جداول (اولین بار نام migration بپرسد: init)
pnpm seed                     # درج داده‌ی واقعی نمونه (فارسی)
cd ../..
```

### ۵) اجرای برنامه
در دو ترمینال جدا (یا با `pnpm dev` به‌صورت موازی):
```bash
pnpm --filter @saman/api dev   # بک‌اند → http://localhost:4000
pnpm --filter @saman/web dev   # فرانت‌اند → http://localhost:3000
```

- پنل: `http://localhost:3000`
- مستندات API (Swagger): `http://localhost:4000/api/docs`

### کاربران پیش‌فرض
| نقش | موبایل | رمز |
|-----|--------|-----|
| مدیر کل | `09120000000` | `Admin@1234` |
| مدیر ساختمان | `09121111111` | `Manager@1234` |
| حسابدار | `09122222222` | `Account@1234` |
| ساکن | `09123333333` | `Resident@1234` |

> در حالت توسعه، کد OTP پیامکی به‌جای ارسال واقعی، در **لاگ سرور بک‌اند** چاپ می‌شود.

---

## روش ۲: اجرای کامل با Docker

```bash
cp .env.example .env
docker compose up --build
```
این دستور چهار سرویس را بالا می‌آورد: `db`، `minio`، `api` (با اجرای خودکار migration)، `web`.

سپس برای درج داده‌ی نمونه:
```bash
docker compose exec api node -e "require('child_process').execSync('npx ts-node prisma/seed.ts',{stdio:'inherit'})"
# یا اگر ts-node در ایمیج production نبود، seed را در حالت محلی اجرا کنید.
```

---

## فعال‌سازی سرویس‌های واقعی (production)

### پیامک (کاوه‌نگار)
در `.env`:
```
SMS_PROVIDER=kavenegar
KAVENEGAR_API_KEY=کلید-شما
SMS_SENDER=10004346
```

### درگاه پرداخت (زرین‌پال)
```
PAYMENT_PROVIDER=zarinpal
ZARINPAL_MERCHANT_ID=کد-پذیرنده-شما
ZARINPAL_SANDBOX=false          # برای محیط واقعی
PAYMENT_CALLBACK_URL=https://api.your-domain.com/api/v1/payments/verify
```
بدون این مقادیر، سیستم در حالت `mock` کار می‌کند (پرداخت شبیه‌سازی‌شده، مناسب توسعه).

### امنیت production
- مقادیر `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` را با رشته‌های تصادفی ۶۴+ کاراکتری جایگزین کنید.
- `CORS_ORIGIN` را به دامنه‌ی واقعی فرانت‌اند محدود کنید.
- پشت یک reverse proxy با TLS (مثل Nginx/Caddy) قرار دهید.

---

## دستورهای پرکاربرد

```bash
pnpm --filter @saman/api test          # اجرای تست‌ها
pnpm --filter @saman/api prisma:studio # مرورگر گرافیکی دیتابیس
pnpm --filter @saman/api build         # build بک‌اند
pnpm --filter @saman/web build         # build فرانت‌اند
```

## رفع اشکال
- **خطای اتصال دیتابیس:** مطمئن شوید `docker compose up -d db` اجرا شده و `DATABASE_URL` درست است.
- **خطای Prisma Client:** `pnpm prisma:generate` را دوباره اجرا کنید.
- **آپلود فایل کار نمی‌کند:** سرویس MinIO باید بالا باشد؛ باکت به‌صورت خودکار ساخته می‌شود.
