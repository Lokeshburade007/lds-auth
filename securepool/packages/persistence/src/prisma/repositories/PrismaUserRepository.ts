import { PrismaClient } from "@prisma/client";
import { User } from "@securepool/core";
import { IUserRepository } from "@securepool/application";

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return new User(record.id, record.tenantId, record.email, record.passwordHash, record.isVerified, record.createdAt);
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId } },
    });
    if (!record) return null;
    return new User(record.id, record.tenantId, record.email, record.passwordHash, record.isVerified, record.createdAt);
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        passwordHash: user.passwordHash,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        isVerified: user.isVerified,
      },
    });
  }
}
