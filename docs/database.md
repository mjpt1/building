# طراحی دیتابیس — سامانه مدیریت ساختمان

دیتابیس: **PostgreSQL 16** · ORM: **Prisma 5** · منبع حقیقت اسکیما: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma)

## اصول طراحی

- **نرمال‌سازی:** تا 3NF؛ تکرار داده حذف شده و روابط با Foreign Key تعریف شده‌اند.
- **چند ساختمانی:** هر موجودیت عملیاتی `building_id` دارد. آماده‌ی افزودن `organization_id` برای multi-tenant.
- **Soft delete:** موجودیت‌های مالی/کلیدی فیلد `deleted_at` دارند تا یکپارچگی گزارش‌ها و audit حفظ شود.
- **زمان:** همه‌ی فیلدهای زمانی `timestamptz` و UTC. تبدیل جلالی فقط در لایه‌ی API/UI.
- **پول:** مبالغ به‌صورت **ریال** و نوع `Decimal` (بدون اعشار برای ریال) ذخیره می‌شوند تا خطای ممیز شناور رخ ندهد.
- **Index:** روی `building_id`, `unit_id`, `status`, `due_date`, `paid_at`, `period(year,month)` و کلیدهای جست‌وجو.

## گروه‌بندی موجودیت‌ها

### احراز هویت و دسترسی
| جدول | نقش |
|------|-----|
| `users` | کاربران (نام کاربری = موبایل)، پسورد هش‌شده، soft-delete |
| `sessions` | نشست‌های فعال؛ refresh token به‌صورت hash، قابل ابطال |
| `otp_codes` | کدهای یکبارمصرف (ورود/ثبت‌نام/بازیابی)، hash‌شده |
| `roles` / `permissions` | نقش‌ها و مجوزهای ریزدانه |
| `role_permissions` | نگاشت نقش↔مجوز (M:N) |
| `user_roles` | نقش کاربر؛ `building_id` تهی = نقش سراسری |

### ساختمان
| جدول | نقش |
|------|-----|
| `buildings` | ساختمان/مجتمع/برج |
| `floors` | طبقات (یکتا در هر ساختمان) |
| `units` | واحدها: متراژ، نفرات، پارکینگ، انباری، ضریب، مالک، ساکن فعلی، وضعیت سکونت |

### اشخاص
| جدول | نقش |
|------|-----|
| `owners` | مالکین (با اتصال اختیاری به `users`) |
| `residents` | ساکنین (مالک‌ساکن یا مستاجر) |
| `leases` | قرارداد واحد↔شخص: نوع (مالک‌ساکن/اجاره)، ودیعه، اجاره، تاریخ شروع/پایان |

### شارژ
| جدول | نقش |
|------|-----|
| `charge_periods` | دوره‌ی شارژ (سال/ماه جلالی)، روش محاسبه، سررسید، جریمه روزانه، وضعیت (پیش‌نویس/تاییدشده/بسته) |
| `charge_items` | خطوط ترکیب‌دهنده‌ی دوره (مثل «آسانسور نفری»، «نظافت ثابت») |
| `charges` | شارژ محاسبه‌شده‌ی هر واحد در دوره: مبلغ، جریمه، پرداختی، وضعیت، ریز محاسبه |

### پرداخت
| جدول | نقش |
|------|-----|
| `payments` | پرداخت‌ها (نقدی/کارت/واریز/آنلاین)، شماره رسید یکتا |
| `payment_transactions` | تراکنش درگاه: authority، refId، وضعیت، payload بازگشتی |

### حسابداری
| جدول | نقش |
|------|-----|
| `cashboxes` | صندوق‌ها/حساب‌ها با مانده جاری |
| `ledger_entries` | دفتر کل: هر ورود/خروج وجه + مانده پس از تراکنش |
| `expense_categories` | دسته‌بندی درختی هزینه |
| `expense_records` | هزینه‌ها (با پیوست سند) |
| `income_records` | درآمدها |

### تعمیرات
| جدول | نقش |
|------|-----|
| `maintenance_requests` | درخواست‌ها: کد پیگیری، اولویت، وضعیت، تخصیص تکنسین، هزینه |
| `maintenance_comments` | یادداشت/تاریخچه‌ی تغییر وضعیت |
| `maintenance_attachments` | پیوست‌ها |

### ارتباطات و سیستم
| جدول | نقش |
|------|-----|
| `announcements` / `announcement_reads` | اطلاعیه‌ها و وضعیت خوانده‌شدن |
| `notifications` | اعلان درون‌برنامه‌ای |
| `attachments` | فایل‌ها (تصویر/PDF/رسید/فاکتور) روی S3 |
| `settings` | تنظیمات سراسری/ساختمان (key/value JSON) |
| `audit_logs` | لاگ عملیات حساس (before/after, ip, user-agent) |

## نمودار روابط کلیدی (متنی)

```
Building 1───* Floor 1───* Unit *───1 Owner
                              │
                              ├──1 Resident (currentResident)
                              ├──* Lease *──1 Resident / Owner
                              ├──* Charge *──1 ChargePeriod *──* ChargeItem
                              │        │
                              │        └──* Payment ──1 PaymentTransaction
                              └──* MaintenanceRequest ──* Comment/Attachment

Building 1───* Cashbox 1───* LedgerEntry   (مرجع: Payment/Income/Expense)
Building 1───* IncomeRecord / ExpenseRecord *──1 ExpenseCategory
User *──* Role *──* Permission              (RBAC)
```

## وضعیت‌ها (State Machines)

**شارژ واحد (`charges.status`):** `PENDING → PARTIAL → PAID` و در صورت گذر سررسید `→ OVERDUE`.

**تراکنش (`payment_transactions.status`):** `INITIATED → PENDING → SUCCESS | FAILED | CANCELED`.

**تعمیرات (`maintenance_requests.status`):** `SUBMITTED → REVIEWING → APPROVED → IN_PROGRESS → DONE` (یا `CANCELED` در هر مرحله).

## مهاجرت و داده اولیه

- `prisma migrate` برای ساخت/به‌روزرسانی اسکیما.
- `prisma/seed.ts` داده‌ی واقعی فارسی می‌سازد: نقش‌ها و مجوزها، یک ساختمان نمونه با ۳ طبقه و واحدها، مالک/ساکن، دوره‌ی شارژ محاسبه‌شده، چند پرداخت، هزینه/درآمد، تعمیرات و اطلاعیه.
