import { AuditLog } from "@securepool/core";
import { IAuditLogRepository } from "@securepool/application";
import { AuditLogModel } from "../models/AuditLogModel";

export class MongoAuditLogRepository implements IAuditLogRepository {
  async log(entry: AuditLog): Promise<void> {
    await AuditLogModel.create({
      userId: entry.userId,
      tenantId: entry.tenantId,
      action: entry.action,
      ip: entry.ip,
      metadata: entry.metadata,
      timestamp: entry.timestamp,
    });
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    const docs = await AuditLogModel.find({ userId }).sort({ timestamp: -1 });
    return docs.map(doc => new AuditLog(
      doc._id.toString(),
      doc.userId,
      doc.tenantId,
      doc.action,
      doc.ip,
      doc.metadata,
      doc.timestamp,
    ));
  }
}
