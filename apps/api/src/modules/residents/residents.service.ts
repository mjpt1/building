import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationQueryDto, buildMeta } from '@/common/dto/pagination.dto';
import { parseJalaliInput, toJalali } from '@/common/utils/jalali.util';
import {
  CreateResidentDto,
  UpdateResidentDto,
  CreateOwnerDto,
  UpdateOwnerDto,
  CreateLeaseDto,
} from './dto/resident.dto';

@Injectable()
export class ResidentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────── ساکنین ─────────────
  async listResidents(buildingId: string, q: PaginationQueryDto) {
    const where: any = { buildingId, deletedAt: null };
    if (q.search) {
      where.OR = [{ fullName: { contains: q.search } }, { mobile: { contains: q.search } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.resident.findMany({
        where,
        include: { currentUnits: { select: { id: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.resident.count({ where }),
    ]);
    return { data: rows, meta: buildMeta(total, q.page, q.limit) };
  }

  async getResident(id: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id, deletedAt: null },
      include: {
        currentUnits: true,
        leases: { include: { unit: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 20 },
      },
    });
    if (!r) throw new NotFoundException('ساکن یافت نشد.');

    const debt = await this.prisma.charge.aggregate({
      where: {
        unit: { currentResidentId: id },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { amount: true, paidAmount: true, penaltyAmount: true },
    });
    const totalDebt = Math.max(
      0,
      Number(debt._sum.amount ?? 0) + Number(debt._sum.penaltyAmount ?? 0) - Number(debt._sum.paidAmount ?? 0),
    );
    return { ...r, moveInAtJalali: toJalali(r.moveInAt), totalDebt };
  }

  createResident(buildingId: string, dto: CreateResidentDto) {
    const { moveInAt, ...rest } = dto;
    return this.prisma.resident.create({
      data: {
        ...rest,
        buildingId,
        moveInAt: moveInAt ? parseJalaliInput(moveInAt) : undefined,
      },
    });
  }

  async updateResident(id: string, dto: UpdateResidentDto) {
    await this.getResident(id);
    const { moveInAt, ...rest } = dto;
    return this.prisma.resident.update({
      where: { id },
      data: { ...rest, moveInAt: moveInAt ? parseJalaliInput(moveInAt) : undefined },
    });
  }

  async removeResident(id: string) {
    await this.prisma.resident.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'ساکن حذف شد.' };
  }

  // ───────────── مالکین ─────────────
  async listOwners(buildingId: string, q: PaginationQueryDto) {
    const where: any = { buildingId, deletedAt: null };
    if (q.search) {
      where.OR = [{ fullName: { contains: q.search } }, { mobile: { contains: q.search } }];
    }
    const [rows, total] = await Promise.all([
      this.prisma.owner.findMany({
        where,
        include: { _count: { select: { ownedUnits: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.owner.count({ where }),
    ]);
    return { data: rows, meta: buildMeta(total, q.page, q.limit) };
  }

  async getOwner(id: string) {
    const o = await this.prisma.owner.findFirst({
      where: { id, deletedAt: null },
      include: { ownedUnits: true, leases: { include: { unit: true } } },
    });
    if (!o) throw new NotFoundException('مالک یافت نشد.');
    return o;
  }

  createOwner(buildingId: string, dto: CreateOwnerDto) {
    return this.prisma.owner.create({ data: { ...dto, buildingId } });
  }

  async updateOwner(id: string, dto: UpdateOwnerDto) {
    await this.getOwner(id);
    return this.prisma.owner.update({ where: { id }, data: dto });
  }

  // ───────────── قراردادها ─────────────
  async createLease(buildingId: string, dto: CreateLeaseDto) {
    const lease = await this.prisma.lease.create({
      data: {
        buildingId,
        unitId: dto.unitId,
        residentId: dto.residentId,
        ownerId: dto.ownerId,
        type: dto.type,
        startDate: parseJalaliInput(dto.startDate),
        endDate: dto.endDate ? parseJalaliInput(dto.endDate) : undefined,
        depositAmount: dto.depositAmount ?? 0,
        rentAmount: dto.rentAmount ?? 0,
        description: dto.description,
      },
    });
    // به‌روزرسانی ساکن فعلی واحد
    if (dto.residentId) {
      await this.prisma.unit.update({
        where: { id: dto.unitId },
        data: { currentResidentId: dto.residentId, occupancyStatus: 'OCCUPIED' },
      });
    }
    return lease;
  }

  async listLeases(unitId: string) {
    return this.prisma.lease.findMany({
      where: { unitId },
      include: { resident: true, owner: true },
      orderBy: { startDate: 'desc' },
    });
  }
}
