import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthUser } from '@/common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string; // userId
  mobile: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  /** بارگذاری کاربر، نقش‌ها و مجوزها در هر درخواست */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد یا غیرفعال است.');
    }

    const roles = new Set<string>();
    const permissions = new Set<string>();
    const buildingIds = new Set<string>();

    for (const ur of user.userRoles) {
      roles.add(ur.role.key);
      if (ur.buildingId) buildingIds.add(ur.buildingId);
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.key);
      }
    }

    return {
      id: user.id,
      mobile: user.mobile,
      fullName: user.fullName,
      roles: [...roles],
      permissions: [...permissions],
      buildingIds: [...buildingIds],
    };
  }
}
