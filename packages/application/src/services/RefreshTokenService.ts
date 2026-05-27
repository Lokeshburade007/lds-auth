import crypto from "crypto";
import { RefreshToken } from "@securepool/core";
import { ITokenRepository } from "../interfaces/ITokenRepository";
import { ITokenService, ClaimsProvider } from "../interfaces/ITokenService";

export class RefreshTokenService {
  constructor(
    private readonly tokenRepository: ITokenRepository,
    private readonly tokenService: ITokenService,
    private readonly claimsProvider?: ClaimsProvider,
  ) {}

  async refresh(
    oldToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Find the refresh token by exact match (tokenHash stores the raw token)
    const existingToken = await this.tokenRepository.findByTokenHash(oldToken);

    if (!existingToken) {
      throw new Error("Invalid refresh token");
    }

    if (existingToken.isRevoked) {
      throw new Error("Refresh token has been revoked");
    }

    if (existingToken.expiresAt < new Date()) {
      throw new Error("Refresh token has expired");
    }

    // Revoke old token (rotation)
    await this.tokenRepository.revoke(existingToken.id);

    // Generate new token pair. Re-resolve extra claims (e.g. email) so
    // they survive the refresh cycle — without this the access token
    // would lose its identity claims after the first 24h renewal.
    const tenantId = "default"; // tenantId from the original token
    const extraClaims = this.claimsProvider
      ? await this.claimsProvider({ userId: existingToken.userId, tenantId })
      : {};
    const accessToken = await this.tokenService.generateAccessToken(
      existingToken.userId,
      tenantId,
      extraClaims,
    );
    const newRefreshToken = await this.tokenService.generateRefreshToken(
      existingToken.userId,
    );

    // Save new refresh token to DB
    await this.tokenRepository.save(new RefreshToken(
      crypto.randomUUID(),
      existingToken.userId,
      newRefreshToken,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      false,
    ));

    return { accessToken, refreshToken: newRefreshToken };
  }
}
