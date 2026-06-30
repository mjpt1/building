import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateFloorDto,
} from './dto/building.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────── ساختمان‌ها ─────────────
  async listBuildings(q: PaginationQueryDto) {
    const where: any = { deletedAt: null };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    const [rows, total] = await Promise.all([
      this.prisma.building.findMany({
        where,
        include: { _count: { select: { units: true, floors: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.building.count({ where }),
    ]);
    const data = rows.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      city: b.city,
      managerName: b.managerName,
      isActive: b.isActive,
      unitsCount: b._count.units,
      floorsCount: b._count.floors,
    }));
    return { data, meta: buildMeta(total, q.page, q.limit) };
  }

  async getBuilding(id: string) {
    const b = await this.prisma.building.findFirst({
      where: { id, deletedAt: null },
      include: {
        floors: { orderBy: { number: 'asc' } },
        _count: { select: { units: true, residents: true, owners: true } },
      },
    });
    if (!b) throw new NotFoundException('ساختمان یافت نشد.');
    return b;
  }

  createBuilding(dto: CreateBuildingDto) {
    return this.prisma.building.create({ data: dto });
  }

  async updateBuilding(id: string, dto: UpdateBuildingDto) {
    await this.getBuilding(id);
    return this.prisma.building.update({ where: { id }, data: dto });
  }

  async removeBuilding(id: string) {
    await this.prisma.building.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'ساختمان حذف شد.' };
  }

  // ───────────── طبقات ─────────────
  async listFloors(buildingId: string) {
    return this.prisma.floor.findMany({
      where: { buildingId },
      include: { _count: { select: { units: true } } },
      orderBy: { number: 'asc' },
    });
  }

  async createFloor(buildingId: string, dto: CreateFloorDto) {
    const floor = await this.prisma.floor.create({ data: { ...dto, buildingId } });
    await this.recountFloors(buildingId);
    return floor;
  }

  // ───────────── واحدها ─────────────
  async listUnits(buildingId: string, q: PaginationQueryDto & { status?: string; floorId?: string }) {
    const where: any = { buildingId, deletedAt: null };
    if (q.search) where.code = { contains: q.search };
    if (q.status) where.occupancyStatus = q.status;
    if (q.floorId) where.floorId = q.floorId;

    const [rows, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        include: {
          floor: true,
          owner: { select: { id: true, fullName: true, mobile: true } },
          currentResident: { select: { id: true, fullName: true, mobile: true } },
        },
        orderBy: { code: 'asc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.unit.count({ where }),
    ]);
    return { data: rows, meta: buildMeta(total, q.page, q.limit) };
  }

  async getUnit(id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        floor: true,
        building: { select: { id: true, name: true } },
        owner: true,
        currentResident: true,
        leases: { include: { resident: true, owner: true }, orderBy: { startDate: 'desc' } },
      },
    });
    if (!unit) throw new NotFoundException('واحد یافت نشد.');

    // وضعیت پرداخت: آخرین شارژ این واحد
    const lastCharge = await this.prisma.charge.findFirst({
      where: { unitId: id },
      orderBy: { createdAt: 'desc' },
    });
    const debt = await this.prisma.charge.aggregate({
      where: { unitId: id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      _sum: { amount: true, paidAmount: true, penaltyAmount: true },
    });
    const totalDebt =
      Number(debt._sum.amount ?? 0) +
      Number(debt._sum.penaltyAmount ?? 0) -
      Number(debt._sum.paidAmount ?? 0);

    return { ...unit, paymentStatus: lastCharge?.status ?? 'PAID', totalDebt: Math.max(0, totalDebt) };
  }

  async createUnit(buildingId: string, dto: CreateUnitDto) {
    const unit = await this.prisma.unit.create({ data: { ...dto, buildingId } as any });
    await this.recountUnits(buildingId);
    return unit;
  }

  async updateUnit(id: string, dto: UpdateUnitDto) {
    await this.getUnit(id);
    return this.prisma.unit.update({ where: { id }, data: dto as any });
  }

  async removeUnit(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('واحد یافت نشد.');
    await this.prisma.unit.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.recountUnits(unit.buildingId);
    return { message: 'واحد حذف شد.' };
  }

  private async recountUnits(buildingId: string) {
    const count = await this.prisma.unit.count({ where: { buildingId, deletedAt: null } });
    await this.prisma.building.update({ where: { id: buildingId }, data: { unitsCount: count } });
  }
  private async recountFloors(buildingId: string) {
    const count = await this.prisma.floor.count({ where: { buildingId } });
    await this.prisma.building.update({ where: { id: buildingId }, data: { floorsCount: count } });
  }
}
