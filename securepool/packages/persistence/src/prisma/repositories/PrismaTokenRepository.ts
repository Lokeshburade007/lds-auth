import { PrismaClient } from "@prisma/client";
import { RefreshToken } from "@securepool/core";
import { ITokenRepository } from "@securepool/application";

export class PrismaTokenRepository implements ITokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        isRevoked: token.isRevoked,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });
    if (!record) return null;
    return new RefreshToken(record.id, record.userId, record.tokenHash, record.expiresAt, record.isRevoked);
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    return records.map((record: any) => new RefreshToken(record.id, record.userId, record.tokenHash, record.expiresAt, record.isRevoked));
  }

  async revoke(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
}
