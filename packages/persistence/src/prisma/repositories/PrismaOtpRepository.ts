import { PrismaClient, Prisma } from "@prisma/client";
import { OtpCode } from "@securepool/core";
import { IOtpRepository } from "@securepool/application";

/**
 * Prisma-backed OTP repository.
 *
 * The `metadata` field is opaque JSON. `AuthService.register()` uses it to
 * stash `{ email, passwordHash, tenantId }` between issuing the OTP and
 * verifying it; without persisting the metadata, `verifyEmail` cannot
 * recover the passwordHash and throws "Registration data not found".
 * The Mongo repository has always stored it; Prisma was previously
 * missing both the column and the writes — fixed in 1.0.3.
 */
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
        metadata: (otp.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  async findLatest(userId: string): Promise<OtpCode | null> {
    const record = await this.prisma.otpCode.findFirst({
      where: { userId },
      orderBy: { expiresAt: "desc" },
    });
    if (!record) return null;
    return new OtpCode(
      record.id,
      record.userId,
      record.code,
      record.expiresAt,
      record.attempts,
      (record.metadata as Record<string, string> | null) ?? undefined,
    );
  }

  async update(otp: OtpCode): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        code: otp.code,
        expiresAt: otp.expiresAt,
        attempts: otp.attempts,
        metadata: (otp.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.otpCode.deleteMany({ where: { userId } });
  }
}
