import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SmsService } from '@/integrations/sms/sms.service';
import { AuditService } from '@/modules/audit/audit.service';
import {
  hashSecret,
  verifySecret,
  generateOtp,
} from '@/common/utils/crypto.util';
import { ROLES } from '@/modules/rbac/rbac.constants';
import {
  RegisterDto,
  LoginPasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ResetPasswordDto,
  OtpPurposeDto,
} from './dto/auth.dto';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly otpTtl: number;
  private readonly otpLength: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly audit: AuditService,
  ) {
    this.otpTtl = config.get<number>('otp.ttl') ?? 120;
    this.otpLength = config.get<number>('otp.length') ?? 5;
  }

  // ─────────────── ثبت‌نام ───────────────
  async register(dto: RegisterDto, meta: RequestMeta) {
    const exists = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (exists) {
      throw new ConflictException('کاربری با این شماره موبایل قبلاً ثبت شده است.');
    }
    const passwordHash = await hashSecret(dto.password);
    const user = await this.prisma.user.create({
      data: { mobile: dto.mobile, fullName: dto.fullName, passwordHash },
    });
    // نقش پیش‌فرض: ساکن
    const residentRole = await this.prisma.role.findUnique({ where: { key: ROLES.RESIDENT } });
    if (residentRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: residentRole.id },
      });
    }
    await this.audit.log({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      ...meta,
    });
    return this.issueTokens(user.id, user.mobile, meta);
  }

  // ─────────────── ورود با رمز ───────────────
  async loginWithPassword(dto: LoginPasswordDto, meta: RequestMeta) {
    const user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور نادرست است.');
    }
    if (!user.isActive) throw new UnauthorizedException('حساب کاربری غیرفعال است.');

    const ok = await verifySecret(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('شماره موبایل یا رمز عبور نادرست است.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ...meta,
    });
    return this.issueTokens(user.id, user.mobile, meta);
  }

  // ─────────────── درخواست OTP ───────────────
  async requestOtp(dto: RequestOtpDto, meta: RequestMeta) {
    if (dto.purpose === OtpPurposeDto.LOGIN || dto.purpose === OtpPurposeDto.RESET_PASSWORD) {
      const user = await this.prisma.user.findFirst({
        where: { mobile: dto.mobile, deletedAt: null },
      });
      if (!user) throw new NotFoundException('کاربری با این شماره یافت نشد.');
    }

    // جلوگیری از ارسال مکرر: حداکثر یک کد فعال در ۶۰ ثانیه‌ی اخیر
    const recent = await this.prisma.otpCode.findFirst({
      where: {
        mobile: dto.mobile,
        purpose: dto.purpose as any,
        consumedAt: null,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      throw new BadRequestException('کد قبلی هنوز معتبر است؛ کمی بعد دوباره تلاش کنید.');
    }

    const code = generateOtp(this.otpLength);
    const codeHash = await hashSecret(code);
    await this.prisma.otpCode.create({
      data: {
        mobile: dto.mobile,
        codeHash,
        purpose: dto.purpose as any,
        expiresAt: new Date(Date.now() + this.otpTtl * 1000),
        ip: meta.ip,
      },
    });
    await this.sms.sendOtp(dto.mobile, code);
    return { message: 'کد تایید ارسال شد.', expiresIn: this.otpTtl };
  }

  // ─────────────── تایید OTP ───────────────
  async verifyOtp(dto: VerifyOtpDto, meta: RequestMeta) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { mobile: dto.mobile, purpose: dto.purpose as any, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('کد تایید یافت نشد. دوباره درخواست دهید.');
    if (otp.expiresAt < new Date()) throw new BadRequestException('کد تایید منقضی شده است.');
    if (otp.attempts >= 5) throw new BadRequestException('تعداد تلاش‌ها بیش از حد مجاز است.');

    const ok = await verifySecret(otp.codeHash, dto.code);
    if (!ok) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('کد تایید نادرست است.');
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    // در حالت ورود/ثبت‌نام: کاربر را پیدا یا ایجاد کن
    let user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile, deletedAt: null },
    });
    if (!user && dto.purpose === OtpPurposeDto.REGISTER) {
      user = await this.prisma.user.create({
        data: { mobile: dto.mobile, fullName: 'کاربر جدید', mobileVerifiedAt: new Date() },
      });
      const residentRole = await this.prisma.role.findUnique({ where: { key: ROLES.RESIDENT } });
      if (residentRole) {
        await this.prisma.userRole.create({ data: { userId: user.id, roleId: residentRole.id } });
      }
    }
    if (!user) throw new NotFoundException('کاربر یافت نشد.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), mobileVerifiedAt: user.mobileVerifiedAt ?? new Date() },
    });
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN_OTP',
      entity: 'User',
      entityId: user.id,
      ...meta,
    });
    return this.issueTokens(user.id, user.mobile, meta);
  }

  // ─────────────── بازیابی رمز با OTP ───────────────
  async resetPassword(dto: ResetPasswordDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { mobile: dto.mobile, purpose: 'RESET_PASSWORD', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('کد تایید نامعتبر یا منقضی است.');
    }
    const ok = await verifySecret(otp.codeHash, dto.code);
    if (!ok) throw new BadRequestException('کد تایید نادرست است.');

    const user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile, deletedAt: null },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد.');

    const passwordHash = await hashSecret(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
      // ابطال همه‌ی نشست‌های فعال
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'رمز عبور با موفقیت تغییر کرد. دوباره وارد شوید.' };
  }

  // ─────────────── تغییر رمز ───────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException('کاربر یافت نشد.');
    const ok = await verifySecret(user.passwordHash, dto.currentPassword);
    if (!ok) throw new BadRequestException('رمز فعلی نادرست است.');
    const passwordHash = await hashSecret(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'رمز عبور تغییر کرد.' };
  }

  // ─────────────── تازه‌سازی توکن ───────────────
  async refresh(refreshToken: string, meta: RequestMeta) {
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('توکن نامعتبر است.');
    }
    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    let matched: (typeof sessions)[number] | null = null;
    for (const s of sessions) {
      if (await verifySecret(s.refreshTokenHash, refreshToken)) {
        matched = s;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('نشست نامعتبر است. دوباره وارد شوید.');

    // چرخش توکن: نشست قبلی ابطال و نشست تازه صادر می‌شود
    await this.prisma.session.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return this.issueTokens(user.id, user.mobile, meta);
  }

  // ─────────────── خروج ───────────────
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const sessions = await this.prisma.session.findMany({
        where: { userId, revokedAt: null },
      });
      for (const s of sessions) {
        if (await verifySecret(s.refreshTokenHash, refreshToken)) {
          await this.prisma.session.update({
            where: { id: s.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    }
    return { message: 'خروج انجام شد.' };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'از همه‌ی دستگاه‌ها خارج شدید.' };
  }

  async activeSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, lastUsedAt: true, createdAt: true },
    });
    return sessions;
  }

  // ─────────────── صدور توکن‌ها ───────────────
  private async issueTokens(userId: string, mobile: string, meta: RequestMeta) {
    const accessTtl = this.config.get<number>('jwt.accessTtl') ?? 900;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl') ?? 2592000;

    const accessToken = await this.jwt.signAsync(
      { sub: userId, mobile, type: 'access' },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, mobile, type: 'refresh' },
      { secret: this.config.get<string>('jwt.refreshSecret'), expiresIn: refreshTtl },
    );

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: await hashSecret(refreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
    };
  }
}
