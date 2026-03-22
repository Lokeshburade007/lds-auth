export interface ITokenService {
  generateAccessToken(userId: string, tenantId: string): Promise<string>;
  generateRefreshToken(userId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<{ sub: string; tenantId: string }>;
}
