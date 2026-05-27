import jwt, { SignOptions, Algorithm } from "jsonwebtoken";
import crypto from "crypto";
import { ITokenService } from "@securepool/application";

export class JwtTokenService implements ITokenService {
  private algorithm: Algorithm = "RS256";

  constructor(
    private privateKey: string,
    private publicKey: string,
    private accessTokenExpirySeconds: number = 900 // 15 minutes
  ) {}

  // Claims we own — never let an extraClaims provider override them.
  private static readonly RESERVED = new Set(["sub", "tenantId", "iat", "exp", "nbf", "jti"]);

  async generateAccessToken(
    userId: string,
    tenantId: string,
    extraClaims?: Record<string, unknown>,
  ): Promise<string> {
    const options: SignOptions = {
      algorithm: this.algorithm,
      expiresIn: this.accessTokenExpirySeconds,
    };
    const safeExtra: Record<string, unknown> = {};
    if (extraClaims) {
      for (const [k, v] of Object.entries(extraClaims)) {
        if (!JwtTokenService.RESERVED.has(k) && v !== undefined) safeExtra[k] = v;
      }
    }
    return jwt.sign({ ...safeExtra, sub: userId, tenantId }, this.privateKey, options);
  }

  async generateRefreshToken(_userId: string): Promise<string> {
    return crypto.randomBytes(64).toString("hex");
  }

  async verifyAccessToken(token: string): Promise<{ sub: string; tenantId: string }> {
    const payload = jwt.verify(token, this.publicKey, {
      algorithms: [this.algorithm],
    }) as any;
    return { sub: payload.sub, tenantId: payload.tenantId };
  }
}
