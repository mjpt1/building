/* eslint-disable no-console */
/**
 * داده‌ی اولیه‌ی واقعی (فارسی) برای توسعه‌ی محلی و نمایش عملکرد سیستم.
 * این اسکریپت idempotent نیست؛ روی دیتابیس تازه اجرا کنید (یا قبل از آن reset کنید).
 */
import {
  PrismaClient,
  ChargeMethod,
  ChargePeriodStatus,
  LedgerEntryType,
  LedgerRefType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  CashboxType,
  MaintenancePriority,
  LeaseType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { customAlphabet } from 'nanoid';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
} from '../src/modules/rbac/rbac.constants';
import { calculateCharges } from '../src/modules/charges/charge-calculator';

const prisma = new PrismaClient();
const rid = customAlphabet('0123456789', 10);
const hash = (s: string) => argon2.hash(s, { type: argon2.argon2id });

async function main() {
  console.log('⏳ شروع seed ...');

  // ۱) مجوزها
  console.log('• ثبت مجوزها');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, group: p.group, description: p.description },
      update: { group: p.group, description: p.description },
    });
  }
  const allPerms = await prisma.permission.findMany();
  const permId = new Map(allPerms.map((p) => [p.key, p.id]));

  // ۲) نقش‌ها + اتصال مجوز
  console.log('• ثبت نقش‌ها');
  const roleIds = new Map<string, string>();
  for (const [key, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { key },
      create: { key, name: ROLE_LABELS[key] ?? key, isSystem: true },
      update: { name: ROLE_LABELS[key] ?? key },
    });
    roleIds.set(key, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((pk) => ({ roleId: role.id, permissionId: permId.get(pk)! })).filter((x) => x.permissionId),
    });
  }

  // ۳) کاربران
  console.log('• ثبت کاربران');
  const users = [
    { mobile: '09120000000', fullName: 'مدیر کل سامانه', pass: 'Admin@1234', role: 'SUPER_ADMIN' },
    { mobile: '09121111111', fullName: 'علی محمدی', pass: 'Manager@1234', role: 'BUILDING_MANAGER' },
    { mobile: '09122222222', fullName: 'زهرا کریمی', pass: 'Account@1234', role: 'ACCOUNTANT' },
    { mobile: '09123333333', fullName: 'رضا احمدی', pass: 'Resident@1234', role: 'RESIDENT' },
    { mobile: '09124444444', fullName: 'مریم رضایی', pass: 'Resident@1234', role: 'RESIDENT' },
    { mobile: '09125555555', fullName: 'حسین نوری', pass: 'Tech@1234', role: 'TECHNICIAN' },
  ];
  const userId = new Map<string, string>();
  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { mobile: u.mobile },
      create: { mobile: u.mobile, fullName: u.fullName, passwordHash: await hash(u.pass), mobileVerifiedAt: new Date() },
      update: { fullName: u.fullName },
    });
    userId.set(u.mobile, created.id);
  }

  // ۴) ساختمان
  console.log('• ثبت ساختمان، طبقات و واحدها');
  const building = await prisma.building.create({
    data: {
      name: 'مجتمع مسکونی نیلوفر',
      address: 'تهران، سعادت‌آباد، خیابان نیلوفر، پلاک ۱۲',
      city: 'تهران',
      postalCode: '1998765432',
      managerName: 'علی محمدی',
      managerPhone: '09121111111',
      foundedAt: new Date('2019-03-21'),
    },
  });

  // نقش‌های محدود به ساختمان
  await prisma.userRole.createMany({
    data: [
      { userId: userId.get('09120000000')!, roleId: roleIds.get('SUPER_ADMIN')! },
      { userId: userId.get('09121111111')!, roleId: roleIds.get('BUILDING_MANAGER')!, buildingId: building.id },
      { userId: userId.get('09122222222')!, roleId: roleIds.get('ACCOUNTANT')!, buildingId: building.id },
      { userId: userId.get('09123333333')!, roleId: roleIds.get('RESIDENT')!, buildingId: building.id },
      { userId: userId.get('09124444444')!, roleId: roleIds.get('RESIDENT')!, buildingId: building.id },
      { userId: userId.get('09125555555')!, roleId: roleIds.get('TECHNICIAN')!, buildingId: building.id },
    ],
  });

  // طبقات
  const floors: any[] = [];
  for (let n = 1; n <= 4; n++) {
    floors.push(await prisma.floor.create({ data: { buildingId: building.id, number: n, title: `طبقه ${n}` } }));
  }
  await prisma.building.update({ where: { id: building.id }, data: { floorsCount: 4 } });

  // مالکین
  const owner1 = await prisma.owner.create({
    data: { buildingId: building.id, fullName: 'محمود تهرانی', mobile: '09127777777', iban: 'IR120000000000000000001' },
  });
  const owner2 = await prisma.owner.create({
    data: { buildingId: building.id, fullName: 'فاطمه صادقی', mobile: '09128888888' },
  });

  // ساکنین (دو نفر دارای حساب کاربری)
  const resident1 = await prisma.resident.create({
    data: { buildingId: building.id, userId: userId.get('09123333333'), fullName: 'رضا احمدی', mobile: '09123333333', moveInAt: new Date('2022-06-01') },
  });
  const resident2 = await prisma.resident.create({
    data: { buildingId: building.id, userId: userId.get('09124444444'), fullName: 'مریم رضایی', mobile: '09124444444', moveInAt: new Date('2023-01-15') },
  });

  // واحدها (۸ واحد، ۲ در هر طبقه)
  const unitDefs = [
    { code: '۱', floor: 0, area: 85, persons: 3, owner: owner1.id, resident: resident1.id },
    { code: '۲', floor: 0, area: 110, persons: 4, owner: owner2.id, resident: resident2.id },
    { code: '۳', floor: 1, area: 85, persons: 2, owner: owner1.id },
    { code: '۴', floor: 1, area: 110, persons: 0 },
    { code: '۵', floor: 2, area: 95, persons: 3, owner: owner2.id },
    { code: '۶', floor: 2, area: 95, persons: 1 },
    { code: '۷', floor: 3, area: 130, persons: 5, owner: owner1.id },
    { code: '۸', floor: 3, area: 130, persons: 2 },
  ];
  const units: any[] = [];
  for (const u of unitDefs) {
    const unit = await prisma.unit.create({
      data: {
        buildingId: building.id,
        floorId: floors[u.floor].id,
        code: u.code,
        area: u.area,
        residentsCount: u.persons,
        occupancyStatus: u.persons > 0 ? 'OCCUPIED' : 'VACANT',
        hasParking: true,
        parkingCount: 1,
        hasStorage: u.area > 100,
        coefficient: u.area > 120 ? 1.2 : 1,
        ownerId: u.owner,
        currentResidentId: u.resident,
      },
    });
    units.push(unit);
  }
  await prisma.building.update({ where: { id: building.id }, data: { unitsCount: units.length } });

  // قراردادها
  await prisma.lease.create({
    data: { buildingId: building.id, unitId: units[0].id, residentId: resident1.id, ownerId: owner1.id, type: LeaseType.OWNER_OCCUPIED, startDate: new Date('2022-06-01') },
  });
  await prisma.lease.create({
    data: { buildingId: building.id, unitId: units[1].id, residentId: resident2.id, ownerId: owner2.id, type: LeaseType.RENTAL, startDate: new Date('2023-01-15'), rentAmount: 250_000_000, depositAmount: 5_000_000_000 },
  });

  // ۵) حسابداری: صندوق
  console.log('• ثبت صندوق و دسته‌بندی هزینه');
  const cashbox = await prisma.cashbox.create({
    data: { buildingId: building.id, name: 'صندوق اصلی', type: CashboxType.BANK, accountNumber: '0203456789001', initialBalance: 50_000_000, balance: 50_000_000, isDefault: true },
  });

  // دسته‌بندی هزینه
  const catNames = ['آسانسور', 'نظافت', 'تاسیسات', 'حقوق سرایدار', 'برق مشاعات', 'باغبانی'];
  const cats: any[] = [];
  for (const t of catNames) {
    cats.push(await prisma.expenseCategory.create({ data: { buildingId: building.id, title: t } }));
  }

  // ۶) شارژ: یک دوره برای ماه جاری
  console.log('• محاسبه و ثبت دوره‌ی شارژ');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);
  const calcUnits = units.map((u) => ({
    unitId: u.id, code: u.code, area: Number(u.area), residentsCount: u.residentsCount, coefficient: Number(u.coefficient),
  }));
  const config = {
    method: ChargeMethod.MIXED,
    baseAmount: 1_500_000,
    items: [
      { title: 'نظافت (مساوی)', method: ChargeMethod.EQUAL, amount: 8_000_000 },
      { title: 'آسانسور (نفری)', method: ChargeMethod.BY_PERSON, amount: 6_000_000 },
      { title: 'تاسیسات (متراژی)', method: ChargeMethod.BY_AREA, amount: 10_000_000 },
    ],
    formula: undefined,
  };
  const calc = calculateCharges(calcUnits, config);
  const totalCharge = calc.reduce((s, c) => s + c.amount, 0);

  const now = new Date();
  const jy = 1403; // برای نمایش؛ در محیط واقعی از تاریخ روز محاسبه می‌شود
  const period = await prisma.chargePeriod.create({
    data: {
      buildingId: building.id,
      title: 'شارژ ماه جاری',
      year: jy,
      month: now.getMonth() + 1,
      method: ChargeMethod.MIXED,
      status: ChargePeriodStatus.APPROVED,
      baseAmount: 1_500_000,
      totalAmount: totalCharge,
      penaltyPerDay: 50_000,
      dueDate,
      approvedById: userId.get('09121111111'),
      approvedAt: new Date(),
      items: { create: config.items.map((i, idx) => ({ title: i.title, method: i.method, amount: i.amount, order: idx })) },
    },
  });
  for (const c of calc) {
    await prisma.charge.create({
      data: { periodId: period.id, unitId: c.unitId, amount: c.amount, dueDate, breakdown: c.breakdown as any },
    });
  }

  // ۷) چند پرداخت (برخی واحدها پرداخت کرده‌اند)
  console.log('• ثبت پرداخت‌ها');
  const charges = await prisma.charge.findMany({ where: { periodId: period.id }, orderBy: { createdAt: 'asc' } });
  for (let i = 0; i < 4; i++) {
    const ch = charges[i];
    const pay = await prisma.payment.create({
      data: {
        buildingId: building.id, unitId: ch.unitId, chargeId: ch.id, cashboxId: cashbox.id,
        amount: ch.amount, method: i % 2 === 0 ? PaymentMethod.ONLINE : PaymentMethod.CASH,
        type: PaymentType.CHARGE, status: PaymentStatus.CONFIRMED, receiptNo: `RCP${rid()}`, paidAt: new Date(),
      },
    });
    await prisma.charge.update({ where: { id: ch.id }, data: { paidAmount: ch.amount, status: 'PAID' } });
    await ledger(building.id, cashbox.id, LedgerEntryType.CREDIT, LedgerRefType.PAYMENT, pay.id, Number(ch.amount), 'پرداخت شارژ');
  }

  // ۸) درآمد و هزینه‌ی نمونه
  console.log('• ثبت درآمد و هزینه');
  const inc = await prisma.incomeRecord.create({
    data: { buildingId: building.id, cashboxId: cashbox.id, title: 'اجاره آنتن مخابراتی پشت‌بام', source: 'اجاره مشاعات', amount: 30_000_000, receivedAt: new Date() },
  });
  await ledger(building.id, cashbox.id, LedgerEntryType.CREDIT, LedgerRefType.INCOME, inc.id, 30_000_000, 'درآمد اجاره مشاعات');

  const expenses = [
    { title: 'سرویس دوره‌ای آسانسور', cat: 0, amount: 12_000_000 },
    { title: 'دستمزد نظافت‌چی', cat: 1, amount: 8_000_000 },
    { title: 'تعمیر پمپ آب', cat: 2, amount: 5_500_000 },
    { title: 'حقوق سرایدار', cat: 3, amount: 60_000_000 },
  ];
  for (const e of expenses) {
    const rec = await prisma.expenseRecord.create({
      data: { buildingId: building.id, cashboxId: cashbox.id, categoryId: cats[e.cat].id, title: e.title, amount: e.amount, spentAt: new Date() },
    });
    await ledger(building.id, cashbox.id, LedgerEntryType.DEBIT, LedgerRefType.EXPENSE, rec.id, e.amount, `هزینه: ${e.title}`);
  }

  // ۹) تعمیرات
  console.log('• ثبت درخواست‌های تعمیرات');
  await prisma.maintenanceRequest.create({
    data: {
      buildingId: building.id, unitId: units[0].id, requesterId: userId.get('09123333333'), residentId: resident1.id,
      trackingNo: `TKT-${rid().slice(0, 8)}`, title: 'چکه کردن شیر آب آشپزخانه', description: 'شیر آب از قسمت پایه نشتی دارد.',
      category: 'لوله‌کشی', priority: MaintenancePriority.NORMAL, status: 'SUBMITTED',
    },
  });
  await prisma.maintenanceRequest.create({
    data: {
      buildingId: building.id, requesterId: userId.get('09124444444'), residentId: resident2.id,
      trackingNo: `TKT-${rid().slice(0, 8)}`, title: 'خرابی آسانسور', description: 'آسانسور در طبقه ۲ متوقف می‌شود.',
      category: 'آسانسور', priority: MaintenancePriority.URGENT, status: 'IN_PROGRESS', assignedToId: userId.get('09125555555'),
    },
  });

  // ۱۰) اطلاعیه
  console.log('• ثبت اطلاعیه');
  await prisma.announcement.create({
    data: {
      buildingId: building.id, authorId: userId.get('09121111111'),
      title: 'قطع آب در روز پنج‌شنبه', body: 'به اطلاع می‌رساند به دلیل تعمیرات، آب ساختمان روز پنج‌شنبه از ساعت ۹ تا ۱۲ قطع خواهد بود.',
      audience: 'ALL', isPinned: true, publishedAt: new Date(),
    },
  });

  console.log('✅ seed با موفقیت انجام شد.');
  console.log('   ساختمان:', building.name, '| واحدها:', units.length);
  console.log('   ورود مدیر: 09121111111 / Manager@1234');
}

async function ledger(
  buildingId: string, cashboxId: string, type: LedgerEntryType, refType: LedgerRefType, refId: string, amount: number, desc: string,
) {
  const cb = await prisma.cashbox.findUnique({ where: { id: cashboxId } });
  const delta = type === LedgerEntryType.CREDIT ? amount : -amount;
  const balanceAfter = Number(cb!.balance) + delta;
  await prisma.cashbox.update({ where: { id: cashboxId }, data: { balance: balanceAfter } });
  await prisma.ledgerEntry.create({
    data: { buildingId, cashboxId, entryType: type, refType, refId, amount, balanceAfter, description: desc },
  });
}

main()
  .catch((e) => {
    console.error('❌ خطا در seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
