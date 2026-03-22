import { PrismaClient } from "@prisma/client";
import { OtpCode } from "@securepool/core";
import { IOtpRepository } from "@securepool/application";

export class PrismaOtpRepository implements IOtpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(otp: OtpCode): Promise<void> {
    await this.prisma.otpCode.create({
      data: {
        id: otp.id,
        userId: otp.userId,
        code: otp.code,
        expiresAt: otp.expiresAt,
        attempts: otp.attempts,
      },
    });
  }

  async findLatest(userId: string): Promise<OtpCode | null> {
    const record = await this.prisma.otpCode.findFirst({
      where: { userId },
      orderBy: { expiresAt: "desc" },
    });
    if (!record) return null;
    return new OtpCode(record.id, record.userId, record.code, record.expiresAt, record.attempts);
  }

  async update(otp: OtpCode): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        code: otp.code,
        expiresAt: otp.expiresAt,
        attempts: otp.attempts,
      },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.otpCode.deleteMany({ where: { userId } });
  }
}
