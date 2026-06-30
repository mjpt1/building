# مرجع API — سامانه مدیریت ساختمان

- **پایه:** `http://localhost:4000/api/v1`
- **احراز هویت:** `Authorization: Bearer <accessToken>` (به‌جز endpointهای عمومی)
- **مستندات تعاملی (Swagger):** `/api/docs`

## قالب پاسخ استاندارد

موفق:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```
خطا:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "شماره موبایل نامعتبر است", "details": [ ... ] } }
```

کدهای خطا: `VALIDATION_ERROR` (۴۰۰)، `UNAUTHORIZED` (۴۰۱)، `FORBIDDEN` (۴۰۳)، `NOT_FOUND` (۴۰۴)، `CONFLICT`/`DUPLICATE` (۴۰۹)، `TOO_MANY_REQUESTS` (۴۲۹).

## پارامترهای مشترک لیست‌ها
`?page=1&limit=20&search=...&sortBy=createdAt&sortOrder=desc`

---

## احراز هویت (`/auth`) — عمومی مگر ذکر شده

| متد | مسیر | توضیح |
|-----|------|-------|
| POST | `/auth/register` | ثبت‌نام با موبایل و رمز |
| POST | `/auth/login` | ورود با رمز |
| POST | `/auth/otp/request` | درخواست کد یکبارمصرف |
| POST | `/auth/otp/verify` | تایید کد و ورود |
| POST | `/auth/refresh` | تازه‌سازی توکن |
| POST | `/auth/password/reset` | بازیابی رمز با OTP |
| POST | `/auth/password/change` 🔒 | تغییر رمز |
| POST | `/auth/logout` 🔒 | خروج |
| POST | `/auth/logout-all` 🔒 | خروج از همه دستگاه‌ها |
| GET | `/auth/me` 🔒 | کاربر جاری + نقش/مجوز |
| GET | `/auth/sessions` 🔒 | نشست‌های فعال |

**نمونه‌ی ورود:**
```http
POST /auth/login
{ "mobile": "09121111111", "password": "Manager@1234" }
→ { "success": true, "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 } }
```

## کاربران و RBAC
| متد | مسیر | مجوز |
|-----|------|------|
| GET | `/users` | `user:read` |
| POST | `/users` | `user:create` |
| GET/PUT | `/users/me/profile` | — |
| GET | `/rbac/roles` | `role:read` |
| GET | `/rbac/permissions` | `role:read` |
| POST | `/rbac/assign` | `role:assign` |

## ساختمان و واحد
| متد | مسیر | مجوز |
|-----|------|------|
| GET/POST | `/buildings` | `building:read`/`building:create` |
| GET/PUT/DELETE | `/buildings/:id` | `building:*` |
| GET/POST | `/buildings/:id/floors` | `building:read`/`unit:create` |
| GET/POST | `/buildings/:id/units` | `unit:read`/`unit:create` |
| GET/PUT/DELETE | `/units/:id` | `unit:*` |

## اشخاص
| متد | مسیر | مجوز |
|-----|------|------|
| GET/POST | `/buildings/:id/residents` | `resident:read`/`resident:create` |
| GET/PUT/DELETE | `/residents/:id` | `resident:*` |
| GET/POST | `/buildings/:id/owners` | `owner:*` |
| POST | `/buildings/:id/leases` | `resident:create` |

## شارژ
| متد | مسیر | مجوز |
|-----|------|------|
| POST | `/buildings/:id/charges/preview` | `charge:create` |
| POST | `/buildings/:id/charges` | `charge:create` |
| GET | `/buildings/:id/charges` | `charge:read` |
| GET | `/buildings/:id/debtors` | `charge:read` |
| GET | `/charge-periods/:id` | `charge:read` |
| POST | `/charge-periods/:id/approve` | `charge:approve` |
| GET | `/units/:id/charges` | `charge:read` |

**نمونه‌ی ساخت دوره (روش ترکیبی):**
```http
POST /buildings/:id/charges
{
  "year": 1403, "month": 4, "method": "MIXED",
  "baseAmount": 1500000, "penaltyPerDay": 50000, "dueDate": "۱۴۰۳/۰۴/۲۰",
  "items": [
    { "title": "نظافت", "method": "EQUAL", "amount": 8000000 },
    { "title": "آسانسور", "method": "BY_PERSON", "amount": 6000000 },
    { "title": "تاسیسات", "method": "BY_AREA", "amount": 10000000 }
  ]
}
```

## پرداخت
| متد | مسیر | مجوز |
|-----|------|------|
| POST | `/payments/manual/:buildingId` | `payment:create` |
| POST | `/payments/online/initiate` | `payment:pay` |
| GET | `/payments/verify` | عمومی (callback درگاه) |
| GET | `/payments/building/:buildingId` | `payment:read` |
| GET | `/payments/:id` | `payment:read` |
| GET | `/payments/:id/receipt` | عمومی (رسید HTML) |

## حسابداری
| متد | مسیر | مجوز |
|-----|------|------|
| GET/POST | `/buildings/:id/cashboxes` | `accounting:read`/`cashbox:manage` |
| GET | `/buildings/:id/cashbox-balance` | `accounting:read` |
| GET/POST | `/buildings/:id/incomes` | `accounting:read`/`income:create` |
| GET/POST | `/buildings/:id/expenses` | `accounting:read`/`expense:create` |
| GET | `/buildings/:id/ledger` | `accounting:read` |

## تعمیرات
| متد | مسیر | مجوز |
|-----|------|------|
| GET/POST | `/buildings/:id/maintenance` | `maintenance:read`/`maintenance:create` |
| GET | `/maintenance/:id` | `maintenance:read` |
| PATCH | `/maintenance/:id/status` | `maintenance:update` |
| PATCH | `/maintenance/:id/assign` | `maintenance:update` |
| POST | `/maintenance/:id/comments` | `maintenance:read` |

## اطلاعیه‌ها و اعلان‌ها
| متد | مسیر | مجوز |
|-----|------|------|
| GET/POST | `/buildings/:id/announcements` | `announcement:read`/`announcement:create` |
| POST | `/announcements/:id/read` | `announcement:read` |
| GET | `/notifications` 🔒 | — |
| GET | `/notifications/unread-count` 🔒 | — |
| PATCH | `/notifications/:id/read` 🔒 | — |

## گزارش، تحلیل، داشبورد
| متد | مسیر | مجوز |
|-----|------|------|
| GET | `/buildings/:id/reports/monthly?year=&month=` | `report:read` |
| GET | `/buildings/:id/reports/yearly?year=` | `report:read` |
| GET | `/buildings/:id/reports/income-expense-chart` | `report:read` |
| GET | `/buildings/:id/reports/expense-by-category` | `report:read` |
| POST | `/buildings/:id/analytics/ask` | `analytics:query` |
| GET | `/buildings/:id/analytics/suggestions` | `analytics:query` |
| GET | `/dashboard/manager/:buildingId` | `report:read` |
| GET | `/dashboard/resident` 🔒 | — |

## فایل و لاگ
| متد | مسیر | مجوز |
|-----|------|------|
| POST | `/files/upload` | `file:upload` |
| GET | `/files/:id` | عمومی (دانلود) |
| GET | `/audit-logs` | `audit:read` |

🔒 = نیازمند احراز هویت بدون مجوز خاص.
