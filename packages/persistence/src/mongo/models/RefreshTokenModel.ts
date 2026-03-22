import mongoose, { Schema, Document } from "mongoose";

export interface IRefreshTokenDocument extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>({
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
});

export const RefreshTokenModel = mongoose.model<IRefreshTokenDocument>("RefreshToken", RefreshTokenSchema);
