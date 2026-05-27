export interface ITokenService {
  /**
   * Sign an access token. `extraClaims` (optional) are merged into the
   * JWT payload alongside the standard `sub` + `tenantId` — used to carry
   * identity (e.g. `email`) or app-specific claims supplied by a
   * ClaimsProvider. Reserved keys (`sub`, `tenantId`, `iat`, `exp`) in
   * extraClaims are ignored by the implementation.
   */
  generateAccessToken(
    userId: string,
    tenantId: string,
    extraClaims?: Record<string, unknown>,
  ): Promise<string>;
  generateRefreshToken(userId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<{ sub: string; tenantId: string }>;
}

/**
 * Resolves the extra JWT claims for a given user at token-issuance time
 * (login, register, OTP, Google SSO, and refresh). Called on EVERY token
 * mint so claims stay fresh across the refresh cycle. Keep it cheap — it
 * runs on the auth hot path. Return `{}` when there's nothing to add.
 */
export type ClaimsProvider = (ctx: {
  userId: string;
  tenantId: string;
}) => Promise<Record<string, unknown>> | Record<string, unknown>;
