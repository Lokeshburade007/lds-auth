import mongoose from "mongoose";

export async function connectMongo(url: string): Promise<typeof mongoose> {
  return mongoose.connect(url, { retryWrites: true });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
