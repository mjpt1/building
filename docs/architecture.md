# معماری سیستم — سامانه مدیریت ساختمان (سامان)

## ۱. نمای کلی

سامان یک سامانه‌ی چندلایه (multi-tier) با تفکیک کامل بک‌اند و فرانت‌اند است که با هدف **استقرار production در بازار ایران** طراحی شده است. تمام منطق کسب‌وکار در بک‌اند متمرکز است و فرانت‌اند یک کلاینت SPA/SSR است که از API نسخه‌بندی‌شده مصرف می‌کند.

```
┌───────────────────────────┐        ┌────────────────────────────┐
│   Frontend (Next.js 14)    │  HTTPS │     Backend (NestJS 10)     │
│  - App Router / RTL/Jalali │◄──────►│  - REST API /api/v1         │
│  - React Query / shadcn-ui │  JSON  │  - JWT Auth + RBAC          │
│  - مدیر + ساکن             │        │  - Business Logic Modules   │
└───────────────────────────┘        └──────────────┬─────────────┘
                                                     │ Prisma ORM
                          ┌──────────────────────────┼───────────────┐
                          ▼                          ▼               ▼
                 ┌────────────────┐        ┌──────────────┐  ┌──────────────┐
                 │ PostgreSQL 16  │        │  MinIO (S3)  │  │ SMS/Payment  │
                 │  داده اصلی     │        │  فایل/رسید   │  │  Gateways    │
                 └────────────────┘        └──────────────┘  └──────────────┘
```

## ۲. اصول معماری

1. **جداسازی لایه‌ها (Separation of Concerns):** Controller → Service → Repository(Prisma). منطق کسب‌وکار هرگز در Controller یا UI نوشته نمی‌شود.
2. **Domain Modules:** هر دامنه (ساختمان، شارژ، پرداخت، تعمیرات...) یک ماژول مستقل NestJS با Controller/Service/DTO خود است.
3. **Contract-first DTO:** ورودی/خروجی هر endpoint با کلاس‌های DTO و اعتبارسنجی (class-validator) تعریف می‌شود؛ تایپ‌های مشترک در `packages/shared`.
4. **Multi-building از روز اول، آماده‌ی Multi-tenant:** تمام موجودیت‌های عملیاتی به `buildingId` گره خورده‌اند؛ افزودن `organizationId/tenantId` در آینده بدون بازنویسی ممکن است.
5. **امنیت پیش‌فرض (Secure by default):** همه‌ی endpointها پشت `JwtAuthGuard` و `PermissionsGuard` هستند مگر آن‌هایی که صراحتاً `@Public()` شده‌اند.
6. **تاریخ: ذخیره به‌صورت UTC، نمایش/ورودی به‌صورت جلالی.** تبدیل فقط در مرز سیستم (لایه نمایش و لایه ورودی) انجام می‌شود؛ منطق داخلی همیشه با `Date` استاندارد کار می‌کند.

## ۳. لایه‌بندی بک‌اند

```
apps/api/src/
├── main.ts                  # bootstrap، CORS، Helmet، Versioning، Swagger
├── app.module.ts
├── common/                  # زیرساخت مشترک
│   ├── prisma/              # PrismaService + ماژول
│   ├── decorators/          # @CurrentUser, @Public, @Permissions, @Roles
│   ├── guards/              # JwtAuthGuard, PermissionsGuard, RolesGuard
│   ├── interceptors/        # TransformInterceptor (پاسخ استاندارد), AuditInterceptor
│   ├── filters/             # AllExceptionsFilter (error response استاندارد)
│   ├── dto/                 # PaginationQueryDto, IdParamDto
│   ├── pipes/               # ZodValidationPipe
│   └── utils/               # jalali، money، password، otp
├── config/                  # configuration namespaces (env-validated)
├── modules/
│   ├── auth/
│   ├── users/
│   ├── rbac/                # roles + permissions
│   ├── buildings/          # buildings + floors + units
│   ├── residents/          # residents + owners + leases
│   ├── charges/            # charge periods + items + محاسبه
│   ├── payments/           # payments + transactions + gateway
│   ├── accounting/         # income + expense + cashbox + ledger
│   ├── maintenance/
│   ├── announcements/
│   ├── notifications/
│   ├── reports/
│   ├── analytics/          # تحلیل هوشمند فارسی
│   ├── files/
│   └── audit/
└── integrations/           # آداپتورهای بیرونی
    ├── sms/                # mock | kavenegar
    └── payment/            # mock | zarinpal
```

### جریان یک درخواست
```
HTTP → JwtAuthGuard → PermissionsGuard → ValidationPipe(DTO)
     → Controller → Service (Business Logic) → PrismaService → DB
     → TransformInterceptor (پاسخ استاندارد) → AuditInterceptor (لاگ) → HTTP
```

## ۴. پاسخ استاندارد API

موفق:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 134 } }
```
خطا:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "شماره موبایل نامعتبر است", "details": [ ... ] } }
```

## ۵. احراز هویت و دسترسی

- **ورود:** موبایل + پسورد، یا موبایل + OTP پیامکی.
- **توکن‌ها:** Access JWT کوتاه‌مدت (۱۵ دقیقه) + Refresh Token بلندمدت ذخیره‌شده به‌صورت hash در جدول `sessions` (قابل ابطال/خروج از همه دستگاه‌ها).
- **RBAC:** نقش → مجموعه‌ی Permissionها (مثل `charge:create`, `payment:read`). دسترسی در سطح endpoint با `@Permissions(...)` بررسی می‌شود.
- **Audit:** عملیات حساس (ایجاد/ویرایش/حذف مالی، تغییر نقش، پرداخت) در `audit_logs` ثبت می‌شود.

جزئیات نقش‌ها و مجوزها در [docs/database.md](database.md) و سرویس `rbac`.

## ۶. مدل تاریخ شمسی

- در دیتابیس: همه فیلدهای تاریخ `timestamptz` (UTC).
- در API: ورودی می‌تواند شمسی (`۱۴۰۳/۰۴/۰۹`) یا ISO باشد؛ خروجی هم ISO و هم رشته‌ی شمسی آماده نمایش را برمی‌گرداند (`{ iso, jalali }` برای فیلدهای کلیدی).
- در UI: کل نمایش/ورودی با `dayjs` + پلاگین `jalali` و کامپوننت `JalaliDatePicker`.
- «دوره‌ی شارژ» با سال/ماه جلالی نگه‌داری می‌شود (`year`,`month` به‌صورت عددی جلالی) تا گزارش‌گیری دوره‌ای دقیق باشد.

## ۷. ماژول تحلیل هوشمند

`analytics` یک موتور پرسش فارسی است که:
1. متن پرسش را با مجموعه‌ای از **intentها** (الگوهای کلیدواژه‌ای: بدهکاران، موجودی صندوق، هزینه دسته X، خلاصه مالی، پیشنهاد شارژ، تعمیرات باز...) تطبیق می‌دهد.
2. کوئری ساختاریافته‌ی متناظر را روی **داده واقعی** اجرا می‌کند.
3. پاسخ خلاصه‌ی فارسی با اعداد/تاریخ شمسی تولید می‌کند.
4. اگر داده کافی نباشد، صریحاً اعلام می‌کند.

این طراحی deterministic و قابل‌اتکا است و به سرویس بیرونی LLM وابسته نیست؛ یک آداپتور اختیاری برای اتصال به مدل زبانی هم پیش‌بینی شده اما به‌طور پیش‌فرض خاموش است.

## ۸. مقیاس‌پذیری و توسعه

- **Stateless API:** قابل اجرا در چند instance پشت load balancer (نشست‌ها در DB).
- **Index‌گذاری:** روی فیلدهای پرجست‌وجو (buildingId, unitId, status, dueDate, period).
- **Soft delete:** روی موجودیت‌های مهم (`deletedAt`) برای حفظ یکپارچگی مالی و audit.
- **آماده موبایل:** همان API نسخه‌بندی‌شده مصرف اپ موبایل آینده (React Native/Flutter) خواهد بود؛ هیچ منطق UI-bound در API نیست.

## ۹. استقرار

- هر سرویس Dockerized؛ `docker-compose.yml` کل استک (db, minio, api, web) را بالا می‌آورد.
- پیکربندی کاملاً env-based و در bootstrap اعتبارسنجی می‌شود.
- Migration و Seed به‌صورت اسکریپت‌های مستقل و idempotent.
