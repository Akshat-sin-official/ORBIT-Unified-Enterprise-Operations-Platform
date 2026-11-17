import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Identity & Access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  // ─── Users ───────────────────────────────────────────────────────────────

  @Get('users')
  @Permissions('user.view')
  @ApiOperation({ summary: 'List organization users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listUsers(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.identityService.listUsers(organizationId, page, limit);
  }

  @Get('users/:id')
  @Permissions('user.view')
  @ApiOperation({ summary: 'Get specific user profile with roles and permissions' })
  async getUser(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') userId: string,
  ) {
    return this.identityService.getUserById(organizationId, userId);
  }

  @Post('users')
  @Permissions('user.create')
  @ApiOperation({ summary: 'Create new user within organization' })
  async createUser(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.identityService.createUser(organizationId, dto);
  }

  @Patch('users/:id')
  @Permissions('user.update')
  @ApiOperation({ summary: 'Update user profile' })
  async updateUser(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.identityService.updateUser(organizationId, userId, dto);
  }

  @Delete('users/:id')
  @Permissions('user.delete')
  @ApiOperation({ summary: 'Delete user from organization' })
  async deleteUser(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') userId: string,
  ) {
    return this.identityService.deleteUser(organizationId, userId);
  }

  @Post('users/:id/roles')
  @Permissions('user.assign_roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  async assignRoles(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') userId: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.identityService.assignRoles(organizationId, userId, dto.roleIds);
  }

  // ─── Roles ───────────────────────────────────────────────────────────────

  @Get('roles')
  @Permissions('role.view')
  @ApiOperation({ summary: 'List organization roles' })
  async listRoles(@CurrentUser('organizationId') organizationId: string) {
    return this.identityService.listRoles(organizationId);
  }

  @Post('roles')
  @Permissions('role.create')
  @ApiOperation({ summary: 'Create custom role within organization' })
  async createRole(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.identityService.createRole(organizationId, dto);
  }

  @Post('roles/:id/permissions')
  @Permissions('role.assign_permissions')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.identityService.assignPermissionsToRole(
      organizationId,
      roleId,
      dto.permissionCodes,
    );
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  @Permissions('role.view')
  @ApiOperation({ summary: 'List all system permissions' })
  async listPermissions() {
    return this.identityService.listPermissions();
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  @Get('audit-logs')
  @Permissions('audit.view')
  @ApiOperation({ summary: 'List organizational audit trails' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAuditLogs(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.identityService.listAuditLogs(organizationId, page, limit);
  }
}
