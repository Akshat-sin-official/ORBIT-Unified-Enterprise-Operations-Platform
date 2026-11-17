import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Users ───────────────────────────────────────────────────────────────

  async listUsers(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.user.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  isSystemRole: true,
                },
              },
            },
          },
          employee: {
            select: {
              employeeCode: true,
              designation: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role),
        userRoles: undefined,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in this organization');
    }

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
      isSystemRole: ur.role.isSystemRole,
    }));

    const permissions = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      employee: user.employee,
      roles,
      permissions: Array.from(permissions),
    };
  }

  async createUser(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone || null,
          status: 'ACTIVE',
        },
      });

      // Role assignment by name
      if (dto.roleNames && dto.roleNames.length > 0) {
        const roles = await tx.role.findMany({
          where: {
            organizationId,
            name: { in: dto.roleNames },
          },
        });

        if (roles.length > 0) {
          await tx.userRole.createMany({
            data: roles.map((r) => ({
              userId: user.id,
              roleId: r.id,
            })),
          });
        }
      }

      // Optional employee record
      if (dto.employeeCode) {
        await tx.employee.create({
          data: {
            organizationId,
            userId: user.id,
            employeeCode: dto.employeeCode,
            designation: dto.designation || null,
          },
        });
      }

      return this.getUserById(organizationId, user.id);
    });
  }

  async updateUser(organizationId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    return this.getUserById(organizationId, userId);
  }

  async deleteUser(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async assignRoles(organizationId: string, userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify all roles belong to this org
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, organizationId },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roles do not belong to this organization');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    });

    return this.getUserById(organizationId, userId);
  }

  // ─── Roles ───────────────────────────────────────────────────────────────

  async listRoles(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystemRole: r.isSystemRole,
      createdAt: r.createdAt,
      userCount: r._count.userRoles,
      permissionCount: r._count.rolePermissions,
      permissions: r.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  async createRole(organizationId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Role with this name already exists in organization');
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          organizationId,
          name: dto.name,
          description: dto.description || null,
          isSystemRole: false,
        },
      });

      if (dto.permissionCodes && dto.permissionCodes.length > 0) {
        const permissions = await tx.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
        });

        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p) => ({
              roleId: role.id,
              permissionId: p.id,
            })),
          });
        }
      }

      return role;
    });
  }

  async assignPermissionsToRole(
    organizationId: string,
    roleId: string,
    permissionCodes: string[],
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    });

    return {
      roleId,
      permissions: permissions.map((p) => p.code),
    };
  }

  // ─── Permissions & Audit Logs ─────────────────────────────────────────────

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async listAuditLogs(organizationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
