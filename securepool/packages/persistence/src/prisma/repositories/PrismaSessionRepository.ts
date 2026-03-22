import { PrismaClient } from "@prisma/client";
import { Session } from "@securepool/core";
import { ISessionRepository } from "@securepool/application";

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(session: Session): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        device: session.device,
        ip: session.ip,
        createdAt: session.createdAt,
        isActive: session.isActive,
      },
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const records = await this.prisma.session.findMany({ where: { userId } });
    return records.map((record: any) => new Session(record.id, record.userId, record.device, record.ip, record.createdAt, record.isActive));
  }

  async deactivate(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }
}
