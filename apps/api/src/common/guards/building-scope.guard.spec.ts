import { ForbiddenException } from '@nestjs/common';
import { BuildingScopeGuard } from './building-scope.guard';
import { AuthUser } from '../decorators/current-user.decorator';

const base = { id: 'u1', mobile: '09120000001', fullName: 'تست' };

const manager: AuthUser = {
  ...base,
  roles: ['BUILDING_MANAGER'],
  permissions: ['charge:read', 'payment:read'],
  buildingIds: ['A'],
  buildingRoles: { A: ['BUILDING_MANAGER'] },
  buildingPermissions: { A: ['charge:read', 'payment:read'] },
};

const resident: AuthUser = {
  ...base,
  roles: ['RESIDENT'],
  permissions: ['charge:read', 'payment:read', 'payment:pay', 'maintenance:read'],
  buildingIds: ['A'],
  buildingRoles: { A: ['RESIDENT'] },
  buildingPermissions: { A: ['charge:read', 'payment:read', 'payment:pay', 'maintenance:read'] },
};

/** مدیر ساختمان A که در ساختمان B فقط ساکن است */
const mixed: AuthUser = {
  ...manager,
  roles: ['BUILDING_MANAGER', 'RESIDENT'],
  buildingIds: ['A', 'B'],
  buildingRoles: { A: ['BUILDING_MANAGER'], B: ['RESIDENT'] },
  buildingPermissions: { A: ['charge:read', 'payment:read'], B: ['payment:read'] },
};

function run(user: AuthUser, path: string, params: any, perms: string[], prisma: any = {}, body?: any) {
  const reflector = { getAllAndOverride: () => perms } as any;
  const guard = new BuildingScopeGuard(reflector, prisma);
  const req = { user, params, body, route: { path: `/api/v1${path}` } };
  return guard.canActivate({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => null,
    getClass: () => null,
  } as any);
}

describe('BuildingScopeGuard', () => {
  it('مدیر به ساختمان خودش دسترسی دارد', async () => {
    await expect(
      run(manager, '/buildings/:buildingId/debtors', { buildingId: 'A' }, ['charge:read']),
    ).resolves.toBe(true);
  });

  it('مدیر به ساختمان دیگر دسترسی ندارد', async () => {
    await expect(
      run(manager, '/buildings/:buildingId/debtors', { buildingId: 'B' }, ['charge:read']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('مجوز یک ساختمان به ساختمان دیگر منتقل نمی‌شود', async () => {
    await expect(
      run(mixed, '/buildings/:buildingId/charges', { buildingId: 'B' }, ['charge:read']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ساکن فهرست بدهکاران را نمی‌بیند', async () => {
    await expect(
      run(resident, '/buildings/:buildingId/debtors', { buildingId: 'A' }, ['charge:read']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ساکن پرداخت واحد خودش را می‌بیند و پرداخت واحد دیگر را نه', async () => {
    const prisma = (owned: number) => ({
      payment: { findUnique: async () => ({ buildingId: 'A', unitId: 'U1' }) },
      unit: { count: async () => owned },
    });
    await expect(
      run(resident, '/payments/:id', { id: 'P1' }, ['payment:read'], prisma(1)),
    ).resolves.toBe(true);
    await expect(
      run(resident, '/payments/:id', { id: 'P1' }, ['payment:read'], prisma(0)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ساکن نمی‌تواند شارژ واحد دیگری را آنلاین شروع کند', async () => {
    const prisma = {
      charge: { findUnique: async () => ({ unitId: 'U2', unit: { buildingId: 'A' } }) },
      unit: { count: async () => 0 },
    };
    await expect(
      run(resident, '/payments/online/initiate', {}, ['payment:pay'], prisma, { chargeId: 'C2' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('مدیر کاربر خارج از ساختمان خودش را نمی‌بیند', async () => {
    const prisma = { userRole: { count: async () => 0 } };
    await expect(run(manager, '/users/:id', { id: 'x' }, ['user:read'], prisma)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
