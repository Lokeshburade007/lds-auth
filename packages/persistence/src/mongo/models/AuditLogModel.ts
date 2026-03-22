import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLogDocument extends Document {
  userId: string;
  tenantId: string;
  action: string;
  ip: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>({
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  ip: { type: String, default: "unknown" },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLogModel = mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);
