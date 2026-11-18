import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions, Roles } from '@/common/decorators/permissions.decorator';
import { ROLES } from './rbac.constants';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { RbacService } from './rbac.service';

class AssignRoleDto {
  @IsString() userId!: string;
  @IsString() roleKey!: string;
  @IsOptional() @IsString() buildingId?: string;
}
class UpdatePermsDto {
  @IsArray() permissionKeys!: string[];
}

@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @Permissions('role:read')
  roles() {
    return this.rbac.listRoles();
  }

  @Get('permissions')
  @Permissions('role:read')
  permissions() {
    return this.rbac.listPermissions();
  }

  @Post('assign')
  @Permissions('role:assign')
  assign(@Body() dto: AssignRoleDto, @CurrentUser() actor: AuthUser) {
    return this.rbac.assignRole(dto.userId, dto.roleKey, dto.buildingId, actor);
  }

  @Delete('user-role/:id')
  @Permissions('role:assign')
  revoke(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.rbac.revokeRole(id, actor);
  }

  @Put('roles/:id/permissions')
  @Roles(ROLES.SUPER_ADMIN)
  updatePerms(@Param('id') id: string, @Body() dto: UpdatePermsDto) {
    return this.rbac.updateRolePermissions(id, dto.permissionKeys);
  }
}
