import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { AuthService, RefreshTokenService } from "@securepool/application";
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

  // Initialize application services
  const authService = new AuthService(repos.userRepo, hasher, tokenService, repos.tokenRepo, otpService, repos.auditLogRepo, emailService);
  const refreshTokenService = new RefreshTokenService(repos.tokenRepo, tokenService);

  // Create Express app
  const app: Express = express();
  app.use(express.json());
  app.use(helmet({
    contentSecurityPolicy: false, // Allow Swagger UI to load
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: config.security?.corsOrigins || "*" }));

  if (config.security?.enableRateLimit !== false) {
    app.use(apiRateLimiter);
  }

  // Middleware factories
  const authMiddleware = createAuthMiddleware(tokenService);
  const authorize = createAuthorize(repos.roleRepo);

  // Routes
  app.use("/auth", tenantMiddleware, createAuthRoutes(authService, refreshTokenService, repos.sessionRepo, repos.auditLogRepo, tokenService, authMiddleware));
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
