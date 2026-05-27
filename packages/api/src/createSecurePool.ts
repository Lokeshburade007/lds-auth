import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { AuthService, RefreshTokenService, ClaimsProvider } from "@securepool/application";
import { JwtTokenService, BcryptHasher, OtpServiceImpl, GoogleAuthServiceImpl, NodemailerEmailService } from "@securepool/infrastructure";
import { createRepositories } from "@securepool/persistence";
import { createAuthMiddleware } from "./middleware/authMiddleware";
import { createAuthorize } from "./middleware/authorize";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { createAuthRoutes } from "./routes/authRoutes";
import { createSessionRoutes } from "./routes/sessionRoutes";
import { setupSwagger } from "./swagger";

export interface SecurePoolConfig {
  database: {
    type: "mongo" | "postgres";
    url: string;
  };
  jwt: {
    privateKey: string;
    publicKey: string;
    accessTokenExpirySeconds?: number;
  };
  google?: {
    clientId: string;
  };
  otp?: {
    maxAttempts?: number;
    expiryMinutes?: number;
  };
  email?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  security?: {
    enableRateLimit?: boolean;
    corsOrigins?: string | string[];
  };
  /**
   * Optional hook to enrich every access token with app-specific claims.
   * Called on each token mint (login / register / OTP / Google / refresh)
   * so claims stay fresh. The `email` claim is added automatically from
   * the user record; anything returned here is merged on top (reserved
   * keys sub/tenantId/iat/exp are protected). Keep it cheap — it runs on
   * the auth hot path. Do NOT put rapidly-mutating data (e.g. a billing
   * plan) here if your access-token TTL is long — it will go stale until
   * the next refresh; resolve those server-side per request instead.
   */
  customClaims?: ClaimsProvider;
}

export async function createSecurePool(config: SecurePoolConfig) {
  // Initialize repositories
  const repos = await createRepositories(config.database);

  // Initialize infrastructure services
  const hasher = new BcryptHasher();
  const tokenService = new JwtTokenService(config.jwt.privateKey, config.jwt.publicKey, config.jwt.accessTokenExpirySeconds);

  const otpService = config.otp !== undefined
    ? new OtpServiceImpl(repos.otpRepo, config.otp)
    : new OtpServiceImpl(repos.otpRepo);

  const googleAuthService = config.google
    ? new GoogleAuthServiceImpl(config.google.clientId)
    : undefined;

  // Initialize email service
  const emailService = config.email
    ? new NodemailerEmailService({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: { user: config.email.user, pass: config.email.pass },
        from: config.email.from,
      })
    : undefined;

  // Claims provider — adds `email` from the user record on every token
  // mint (so it survives refresh), then merges any app-supplied claims.
  // Best-effort: a lookup failure never blocks token issuance.
  const claimsProvider: ClaimsProvider = async ({ userId, tenantId }) => {
    const claims: Record<string, unknown> = {};
    try {
      const u = await repos.userRepo.findById(userId);
      if (u?.email) claims.email = u.email;
    } catch {
      /* email is best-effort — never block auth on it */
    }
    if (config.customClaims) {
      Object.assign(claims, await config.customClaims({ userId, tenantId }));
    }
    return claims;
  };

  // Initialize application services
  const authService = new AuthService(repos.userRepo, hasher, tokenService, repos.tokenRepo, otpService, repos.auditLogRepo, emailService, claimsProvider);
  const refreshTokenService = new RefreshTokenService(repos.tokenRepo, tokenService, claimsProvider);

  // Create Express app
  const app: Express = express();
  app.use(express.json());
  app.use(helmet({
    contentSecurityPolicy: false, // Allow Swagger UI to load
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: config.security?.corsOrigins || "*" }));

  const enableRateLimit = config.security?.enableRateLimit !== false;
  if (enableRateLimit) {
    app.use(apiRateLimiter);
  }

  // Middleware factories
  const authMiddleware = createAuthMiddleware(tokenService);
  const authorize = createAuthorize(repos.roleRepo);

  // Routes
  app.use("/auth", tenantMiddleware, createAuthRoutes(authService, refreshTokenService, repos.sessionRepo, repos.auditLogRepo, tokenService, authMiddleware, enableRateLimit));
  app.use("/sessions", authMiddleware, createSessionRoutes(repos.sessionRepo));

  // Health check
  app.get("/health", (_req, res) => { res.json({ status: "ok" }); });

  // Swagger API docs
  setupSwagger(app);

  return {
    app,
    authService,
    refreshTokenService,
    authMiddleware,
    authorize,
    tokenService,
    repositories: repos,
  };
}
