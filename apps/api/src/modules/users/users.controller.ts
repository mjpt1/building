import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

class CreateUserDto {
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل نامعتبر است.' }) mobile!: string;
  @IsString() fullName!: string;
  @MinLength(8) password!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() nationalId?: string;
}
class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}
class SetActiveDto {
  @IsBoolean() isActive!: boolean;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me/profile')
  profile(@CurrentUser('id') id: string) {
    return this.users.getProfile(id);
  }

  @Put('me/profile')
  updateMyProfile(@CurrentUser('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(id, dto);
  }

  @Get()
  @Permissions('user:read')
  list(@Query() q: PaginationQueryDto) {
    return this.users.list(q);
  }

  @Get(':id')
  @Permissions('user:read')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Permissions('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id/active')
  @Permissions('user:update')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.users.setActive(id, dto.isActive);
  }

  @Delete(':id')
  @Permissions('user:delete')
  remove(@Param('id') id: string) {
    return this.users.softDelete(id);
  }
}
