import mongoose, { Schema, Document } from "mongoose";

export interface IOtpDocument extends Document {
  userId: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  metadata?: Record<string, string>;
}

const OtpSchema = new Schema<IOtpDocument>({
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: undefined },
});

export const OtpModel = mongoose.model<IOtpDocument>("OtpCode", OtpSchema);
