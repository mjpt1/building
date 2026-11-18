-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('OCCUPIED', 'VACANT', 'UNDER_RENOVATION');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('OWNER_OCCUPIED', 'RENTAL');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ChargeMethod" AS ENUM ('EQUAL', 'BY_AREA', 'BY_PERSON', 'MIXED', 'FIXED', 'COEFFICIENT', 'CUSTOM_FORMULA');

-- CreateEnum
CREATE TYPE "ChargePeriodStatus" AS ENUM ('DRAFT', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CHARGE', 'DEBT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CashboxType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "LedgerRefType" AS ENUM ('PAYMENT', 'INCOME', 'EXPENSE', 'MANUAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'OWNERS', 'RESIDENTS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHARGE', 'PAYMENT', 'MAINTENANCE', 'ANNOUNCEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'PDF', 'RECEIPT', 'INVOICE', 'MAINTENANCE', 'AVATAR', 'OTHER');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'RESET_PASSWORD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "national_id" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mobile_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "building_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "floors_count" INTEGER NOT NULL DEFAULT 0,
    "units_count" INTEGER NOT NULL DEFAULT 0,
    "manager_name" TEXT,
    "manager_phone" TEXT,
    "founded_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "floor_id" TEXT,
    "code" TEXT NOT NULL,
    "area" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "residents_count" INTEGER NOT NULL DEFAULT 0,
    "occupancy_status" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "parking_count" INTEGER NOT NULL DEFAULT 0,
    "has_storage" BOOLEAN NOT NULL DEFAULT false,
    "storage_count" INTEGER NOT NULL DEFAULT 0,
    "coefficient" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "owner_id" TEXT,
    "current_resident_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "national_id" TEXT,
    "email" TEXT,
    "iban" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "national_id" TEXT,
    "email" TEXT,
    "emergency_phone" TEXT,
    "move_in_at" TIMESTAMP(3),
    "move_out_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "resident_id" TEXT,
    "owner_id" TEXT,
    "type" "LeaseType" NOT NULL DEFAULT 'RENTAL',
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "deposit_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "rent_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_periods" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "method" "ChargeMethod" NOT NULL DEFAULT 'MIXED',
    "status" "ChargePeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "base_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "penalty_per_day" DECIMAL(10,0) NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3) NOT NULL,
    "formula" JSONB,
    "description" TEXT,
    "created_by_id" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "charge_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_items" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "method" "ChargeMethod" NOT NULL DEFAULT 'FIXED',
    "amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "penalty_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "charge_id" TEXT,
    "resident_id" TEXT,
    "cashbox_id" TEXT,
    "amount" DECIMAL(14,0) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "type" "PaymentType" NOT NULL DEFAULT 'CHARGE',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "receipt_no" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "payment_id" TEXT,
    "amount" DECIMAL(14,0) NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'zarinpal',
    "authority" TEXT,
    "ref_id" TEXT,
    "card_pan" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "payer_mobile" TEXT,
    "description" TEXT,
    "callback_payload" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashboxes" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CashboxType" NOT NULL DEFAULT 'CASH',
    "account_number" TEXT,
    "iban" TEXT,
    "initial_balance" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "balance" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cashboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "cashbox_id" TEXT NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "ref_type" "LedgerRefType" NOT NULL,
    "ref_id" TEXT,
    "amount" DECIMAL(16,0) NOT NULL,
    "balance_after" DECIMAL(16,0) NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "building_id" TEXT,
    "title" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_records" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "category_id" TEXT,
    "cashbox_id" TEXT,
    "attachment_id" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "vendor" TEXT,
    "spent_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "expense_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_records" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "cashbox_id" TEXT,
    "attachment_id" TEXT,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "amount" DECIMAL(14,0) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "income_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "requester_id" TEXT,
    "resident_id" TEXT,
    "assigned_to_id" TEXT,
    "tracking_no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "location" TEXT,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "cost" DECIMAL(14,0),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_comments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "status_from" "MaintenanceStatus",
    "status_to" "MaintenanceStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_attachments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "attachment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "author_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "target_units" JSONB,
    "send_sms" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reads" (
    "announcement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("announcement_id","user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "building_id" TEXT,
    "uploader_id" TEXT,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "building_id" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'building',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "building_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "otp_codes_mobile_purpose_idx" ON "otp_codes"("mobile", "purpose");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_idx" ON "permissions"("group");

-- CreateIndex
CREATE INDEX "user_roles_building_id_idx" ON "user_roles"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_building_id_key" ON "user_roles"("user_id", "role_id", "building_id");

-- CreateIndex
CREATE INDEX "buildings_deleted_at_idx" ON "buildings"("deleted_at");

-- CreateIndex
CREATE INDEX "floors_building_id_idx" ON "floors"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_number_key" ON "floors"("building_id", "number");

-- CreateIndex
CREATE INDEX "units_building_id_idx" ON "units"("building_id");

-- CreateIndex
CREATE INDEX "units_floor_id_idx" ON "units"("floor_id");

-- CreateIndex
CREATE INDEX "units_occupancy_status_idx" ON "units"("occupancy_status");

-- CreateIndex
CREATE INDEX "units_deleted_at_idx" ON "units"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "units_building_id_code_key" ON "units"("building_id", "code");

-- CreateIndex
CREATE INDEX "owners_building_id_idx" ON "owners"("building_id");

-- CreateIndex
CREATE INDEX "owners_mobile_idx" ON "owners"("mobile");

-- CreateIndex
CREATE INDEX "owners_deleted_at_idx" ON "owners"("deleted_at");

-- CreateIndex
CREATE INDEX "residents_building_id_idx" ON "residents"("building_id");

-- CreateIndex
CREATE INDEX "residents_mobile_idx" ON "residents"("mobile");

-- CreateIndex
CREATE INDEX "residents_is_active_idx" ON "residents"("is_active");

-- CreateIndex
CREATE INDEX "residents_deleted_at_idx" ON "residents"("deleted_at");

-- CreateIndex
CREATE INDEX "leases_building_id_idx" ON "leases"("building_id");

-- CreateIndex
CREATE INDEX "leases_unit_id_idx" ON "leases"("unit_id");

-- CreateIndex
CREATE INDEX "leases_status_idx" ON "leases"("status");

-- CreateIndex
CREATE INDEX "charge_periods_building_id_idx" ON "charge_periods"("building_id");

-- CreateIndex
CREATE INDEX "charge_periods_status_idx" ON "charge_periods"("status");

-- CreateIndex
CREATE INDEX "charge_periods_due_date_idx" ON "charge_periods"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "charge_periods_building_id_year_month_key" ON "charge_periods"("building_id", "year", "month");

-- CreateIndex
CREATE INDEX "charge_items_period_id_idx" ON "charge_items"("period_id");

-- CreateIndex
CREATE INDEX "charges_unit_id_idx" ON "charges"("unit_id");

-- CreateIndex
CREATE INDEX "charges_status_idx" ON "charges"("status");

-- CreateIndex
CREATE INDEX "charges_due_date_idx" ON "charges"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "charges_period_id_unit_id_key" ON "charges"("period_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_no_key" ON "payments"("receipt_no");

-- CreateIndex
CREATE INDEX "payments_building_id_idx" ON "payments"("building_id");

-- CreateIndex
CREATE INDEX "payments_unit_id_idx" ON "payments"("unit_id");

-- CreateIndex
CREATE INDEX "payments_charge_id_idx" ON "payments"("charge_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "payments_deleted_at_idx" ON "payments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_payment_id_key" ON "payment_transactions"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_authority_key" ON "payment_transactions"("authority");

-- CreateIndex
CREATE INDEX "payment_transactions_building_id_idx" ON "payment_transactions"("building_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_authority_idx" ON "payment_transactions"("authority");

-- CreateIndex
CREATE INDEX "cashboxes_building_id_idx" ON "cashboxes"("building_id");

-- CreateIndex
CREATE INDEX "ledger_entries_building_id_idx" ON "ledger_entries"("building_id");

-- CreateIndex
CREATE INDEX "ledger_entries_cashbox_id_idx" ON "ledger_entries"("cashbox_id");

-- CreateIndex
CREATE INDEX "ledger_entries_occurred_at_idx" ON "ledger_entries"("occurred_at");

-- CreateIndex
CREATE INDEX "expense_categories_building_id_idx" ON "expense_categories"("building_id");

-- CreateIndex
CREATE INDEX "expense_records_building_id_idx" ON "expense_records"("building_id");

-- CreateIndex
CREATE INDEX "expense_records_category_id_idx" ON "expense_records"("category_id");

-- CreateIndex
CREATE INDEX "expense_records_spent_at_idx" ON "expense_records"("spent_at");

-- CreateIndex
CREATE INDEX "expense_records_deleted_at_idx" ON "expense_records"("deleted_at");

-- CreateIndex
CREATE INDEX "income_records_building_id_idx" ON "income_records"("building_id");

-- CreateIndex
CREATE INDEX "income_records_received_at_idx" ON "income_records"("received_at");

-- CreateIndex
CREATE INDEX "income_records_deleted_at_idx" ON "income_records"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_requests_tracking_no_key" ON "maintenance_requests"("tracking_no");

-- CreateIndex
CREATE INDEX "maintenance_requests_building_id_idx" ON "maintenance_requests"("building_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "maintenance_requests_priority_idx" ON "maintenance_requests"("priority");

-- CreateIndex
CREATE INDEX "maintenance_requests_assigned_to_id_idx" ON "maintenance_requests"("assigned_to_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_deleted_at_idx" ON "maintenance_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "maintenance_comments_request_id_idx" ON "maintenance_comments"("request_id");

-- CreateIndex
CREATE INDEX "maintenance_attachments_request_id_idx" ON "maintenance_attachments"("request_id");

-- CreateIndex
CREATE INDEX "announcements_building_id_idx" ON "announcements"("building_id");

-- CreateIndex
CREATE INDEX "announcements_published_at_idx" ON "announcements"("published_at");

-- CreateIndex
CREATE INDEX "announcements_deleted_at_idx" ON "announcements"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_building_id_idx" ON "attachments"("building_id");

-- CreateIndex
CREATE INDEX "attachments_kind_idx" ON "attachments"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "settings_building_id_key_key" ON "settings"("building_id", "key");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_current_resident_id_fkey" FOREIGN KEY ("current_resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_periods" ADD CONSTRAINT "charge_periods_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_periods" ADD CONSTRAINT "charge_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_periods" ADD CONSTRAINT "charge_periods_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_items" ADD CONSTRAINT "charge_items_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "charge_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "charge_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashboxes" ADD CONSTRAINT "cashboxes_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_comments" ADD CONSTRAINT "maintenance_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
