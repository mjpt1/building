import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

const IRAN_MOBILE = /^09\d{9}$/;
const MOBILE_MSG = 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.';

export class RegisterDto {
  @Matches(IRAN_MOBILE, { message: MOBILE_MSG })
  mobile!: string;

  @IsString()
  @IsNotEmpty({ message: 'نام و نام خانوادگی الزامی است.' })
  fullName!: string;

  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' })
  password!: string;
}

export class LoginPasswordDto {
  @Matches(IRAN_MOBILE, { message: MOBILE_MSG })
  mobile!: string;

  @IsString()
  @IsNotEmpty({ message: 'رمز عبور الزامی است.' })
  password!: string;
}

export enum OtpPurposeDto {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class RequestOtpDto {
  @Matches(IRAN_MOBILE, { message: MOBILE_MSG })
  mobile!: string;

  @IsOptional()
  @IsEnum(OtpPurposeDto)
  purpose: OtpPurposeDto = OtpPurposeDto.LOGIN;
}

export class VerifyOtpDto {
  @Matches(IRAN_MOBILE, { message: MOBILE_MSG })
  mobile!: string;

  @IsString()
  @IsNotEmpty({ message: 'کد تایید الزامی است.' })
  code!: string;

  @IsOptional()
  @IsEnum(OtpPurposeDto)
  purpose: OtpPurposeDto = OtpPurposeDto.LOGIN;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'رمز فعلی الزامی است.' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'رمز جدید باید حداقل ۸ کاراکتر باشد.' })
  newPassword!: string;
}

export class ResetPasswordDto {
  @Matches(IRAN_MOBILE, { message: MOBILE_MSG })
  mobile!: string;

  @IsString()
  @IsNotEmpty({ message: 'کد تایید الزامی است.' })
  code!: string;

  @IsString()
  @MinLength(8, { message: 'رمز جدید باید حداقل ۸ کاراکتر باشد.' })
  newPassword!: string;
}
