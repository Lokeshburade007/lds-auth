import mongoose, { Schema, Document } from "mongoose";

export interface ISessionDocument extends Document {
  userId: string;
  device: string;
  ip: string;
  createdAt: Date;
  isActive: boolean;
}

const SessionSchema = new Schema<ISessionDocument>({
  userId: { type: String, required: true, index: true },
  device: { type: String, required: true },
  ip: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

export const SessionModel = mongoose.model<ISessionDocument>("Session", SessionSchema);
