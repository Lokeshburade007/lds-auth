import { PrismaClient } from "@prisma/client";
import { Role, UserRole } from "@securepool/core";
import { IRoleRepository } from "@securepool/application";

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({ where: { id } });
    if (!record) return null;
    return new Role(record.id, record.name);
  }

  async findByName(name: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({ where: { name } });
    if (!record) return null;
    return new Role(record.id, record.name);
  }

  async assignRole(userRole: UserRole): Promise<void> {
    await this.prisma.userRole.create({
      data: {
        userId: userRole.userId,
        roleId: userRole.roleId,
      },
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur: any) => new Role(ur.role.id, ur.role.name));
  }
}
