import { PrismaClient } from "@prisma/client";
import { AuditLog } from "@securepool/core";
import { IAuditLogRepository } from "@securepool/application";

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async log(entry: AuditLog): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        tenantId: entry.tenantId,
        action: entry.action,
        ip: entry.ip,
        metadata: entry.metadata as any,
        timestamp: entry.timestamp,
      },
    });
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
    });
    return records.map((record: any) => new AuditLog(
      record.id,
      record.userId,
      record.tenantId,
      record.action,
      record.ip,
      record.metadata as Record<string, unknown>,
      record.timestamp,
    ));
  }
}
