import mongoose, { Schema, Document } from "mongoose";

export interface IRoleDocument extends Document {
  name: string;
}

const RoleSchema = new Schema<IRoleDocument>({
  name: { type: String, required: true, unique: true },
});

export const RoleModel = mongoose.model<IRoleDocument>("Role", RoleSchema);
