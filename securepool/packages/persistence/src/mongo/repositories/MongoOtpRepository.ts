import { OtpCode } from "@securepool/core";
import { IOtpRepository } from "@securepool/application";
import { OtpModel } from "../models/OtpModel";

export class MongoOtpRepository implements IOtpRepository {
  async save(otp: OtpCode): Promise<void> {
    const doc = await OtpModel.create({
      userId: otp.userId,
      code: otp.code,
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
      metadata: otp.metadata,
    });
    otp.id = doc._id.toString();
  }

  async findLatest(userId: string): Promise<OtpCode | null> {
    const doc = await OtpModel.findOne({ userId }).sort({ expiresAt: -1 });
    if (!doc) return null;
    return new OtpCode(doc._id.toString(), doc.userId, doc.code, doc.expiresAt, doc.attempts, doc.metadata as Record<string, string> | undefined);
  }

  async update(otp: OtpCode): Promise<void> {
    await OtpModel.findByIdAndUpdate(otp.id, {
      code: otp.code,
      expiresAt: otp.expiresAt,
      attempts: otp.attempts,
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await OtpModel.deleteMany({ userId });
  }
}
