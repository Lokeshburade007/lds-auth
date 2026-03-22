import mongoose, { Schema, Document } from "mongoose";

export interface IUserDocument extends Document {
  tenantId: string;
  email: string;
  passwordHash: string | null;
  isVerified: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true },
  passwordHash: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export const UserModel = mongoose.model<IUserDocument>("User", UserSchema);
