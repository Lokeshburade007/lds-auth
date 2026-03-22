import { AuditLog } from "@securepool/core";

export interface IAuditLogRepository {
  log(entry: AuditLog): Promise<void>;
  findByUserId(userId: string): Promise<AuditLog[]>;
}
