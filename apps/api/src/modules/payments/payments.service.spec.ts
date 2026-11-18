import { TransactionStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

/** پایگاه داده‌ی ساختگی با به‌روزرسانی شرطی اتمیک، مانند PostgreSQL */
function setup() {
  const trx: any = {
    id: 'T1',
    status: TransactionStatus.PENDING,
    amount: 1000,
    buildingId: 'A',
    unitId: 'U1',
    refId: null,
    callbackPayload: { chargeId: 'C1' },
  };
  const charge: any = { id: 'C1', amount: 1000, penaltyAmount: 0, paidAmount: 0, status: 'PENDING' };
  const payments: any[] = [];

  const tx: any = {
    paymentTransaction: {
      updateMany: async ({ where, data }: any) => {
        if (trx.status !== where.status) return { count: 0 };
        Object.assign(trx, data);
        return { count: 1 };
      },
      update: async ({ data }: any) => Object.assign(trx, data),
    },
    payment: {
      create: async ({ data }: any) => {
        const p = { id: `P${payments.length + 1}`, ...data };
        payments.push(p);
        return p;
      },
    },
    charge: {
      findUnique: async () => charge,
      update: async ({ data }: any) => {
        if (data.paidAmount?.increment) charge.paidAmount += data.paidAmount.increment;
        if (data.status) charge.status = data.status;
        return { ...charge };
      },
    },
  };
  const prisma: any = {
    ...tx,
    paymentTransaction: { ...tx.paymentTransaction, findUnique: async () => ({ ...trx }) },
    cashbox: { findFirst: async () => null },
    $transaction: (fn: any) => fn(tx),
  };
  const gateway: any = { verify: async () => ({ success: true, refId: 'R1', message: 'موفق' }) };
  const svc = new PaymentsService(prisma, {} as any, gateway, {} as any, {} as any, {} as any);
  return { svc, payments, charge, trx };
}

describe('PaymentsService.verifyOnline', () => {
  it('دو callback همزمان فقط یک پرداخت ثبت می‌کنند', async () => {
    const { svc, payments, charge } = setup();
    const results = await Promise.all([svc.verifyOnline('a', 'OK'), svc.verifyOnline('a', 'OK')]);
    expect(results.every((r) => r.success)).toBe(true);
    expect(payments).toHaveLength(1);
    expect(charge.paidAmount).toBe(1000);
    expect(charge.status).toBe('PAID');
  });

  it('callback تکراری پس از موفقیت چیزی ثبت نمی‌کند', async () => {
    const { svc, payments } = setup();
    await svc.verifyOnline('a', 'OK');
    await svc.verifyOnline('a', 'OK');
    expect(payments).toHaveLength(1);
  });
});
