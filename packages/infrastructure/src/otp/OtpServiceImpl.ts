import crypto from "crypto";
import { IOtpService, IOtpRepository } from "@securepool/application";
import { OtpCode } from "@securepool/core";

export class OtpServiceImpl implements IOtpService {
  private maxAttempts: number;
  private expiryMinutes: number;

  constructor(
    private otpRepo: IOtpRepository,
    options?: { maxAttempts?: number; expiryMinutes?: number }
  ) {
    this.maxAttempts = options?.maxAttempts ?? 5;
    this.expiryMinutes = options?.expiryMinutes ?? 5;
  }

  async generate(userId: string, metadata?: Record<string, string>): Promise<string> {
    await this.otpRepo.deleteAllForUser(userId);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otp = new OtpCode(
      crypto.randomUUID(),
      userId,
      code,
      new Date(Date.now() + this.expiryMinutes * 60 * 1000),
      0,
      metadata,
    );

    await this.otpRepo.save(otp);
    return code;
  }

  async verify(userId: string, code: string): Promise<{ valid: boolean; metadata?: Record<string, string> }> {
    const record = await this.otpRepo.findLatest(userId);
    if (!record) throw new Error("OTP not found");
    if (record.expiresAt < new Date()) throw new Error("OTP expired");
    if (record.attempts >= this.maxAttempts) throw new Error("Too many attempts");

    if (record.code !== code) {
      record.attempts++;
      await this.otpRepo.update(record);
      throw new Error("Invalid OTP");
    }

    const metadata = record.metadata;
    await this.otpRepo.deleteAllForUser(userId);
    return { valid: true, metadata };
  }
}
