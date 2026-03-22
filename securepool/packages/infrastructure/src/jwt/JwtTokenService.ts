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

  async generateAccessToken(userId: string, tenantId: string): Promise<string> {
    const options: SignOptions = {
      algorithm: this.algorithm,
      expiresIn: this.accessTokenExpirySeconds,
    };
    return jwt.sign({ sub: userId, tenantId }, this.privateKey, options);
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
