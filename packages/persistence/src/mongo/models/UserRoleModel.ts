import mongoose, { Schema, Document } from "mongoose";

export interface IUserRoleDocument extends Document {
  userId: string;
  roleId: string;
}

const UserRoleSchema = new Schema<IUserRoleDocument>({
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
});

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export const UserRoleModel = mongoose.model<IUserRoleDocument>("UserRole", UserRoleSchema);
