import { RefreshToken } from "@securepool/core";
import { ITokenRepository } from "@securepool/application";
import { RefreshTokenModel } from "../models/RefreshTokenModel";

export class MongoTokenRepository implements ITokenRepository {
  async save(token: RefreshToken): Promise<void> {
    const doc = await RefreshTokenModel.create({
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
    });
    token.id = doc._id.toString();
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash });
    if (!doc) return null;
    return new RefreshToken(doc._id.toString(), doc.userId, doc.tokenHash, doc.expiresAt, doc.isRevoked);
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const docs = await RefreshTokenModel.find({ userId, isRevoked: false, expiresAt: { $gt: new Date() } });
    return docs.map(doc => new RefreshToken(doc._id.toString(), doc.userId, doc.tokenHash, doc.expiresAt, doc.isRevoked));
  }

  async revoke(tokenId: string): Promise<void> {
    await RefreshTokenModel.findByIdAndUpdate(tokenId, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  }
}
