import { Router } from "express";
import { AuthService, RefreshTokenService } from "@securepool/application";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { loginRateLimiter, otpRateLimiter } from "../middleware/rateLimiter";
import UAParser from "ua-parser-js";
import { ISessionRepository, IAuditLogRepository } from "@securepool/application";
import { Session } from "@securepool/core";
import crypto from "crypto";
import { ITokenService } from "@securepool/application";

export function createAuthRoutes(
  authService: AuthService,
  refreshTokenService: RefreshTokenService,
  sessionRepo: ISessionRepository,
  auditLogRepo: IAuditLogRepository,
  tokenService: ITokenService,
  authMiddleware: (req: any, res: any, next: any) => void,
): Router {
  const router = Router();

  // POST /auth/register - creates user + sends verification OTP
  router.post("/register", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      if (!email || !password || !tenantId) {
        res.status(400).json({ error: "email, password, and tenant are required" });
        return;
      }
      await authService.register(email, password, tenantId);
      res.status(200).json({ message: "OTP sent to your email. Verify to complete registration.", email });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /auth/verify-email - verify OTP after registration
  router.post("/verify-email", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, code } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      const ip = req.ip || "unknown";
      if (!email || !code || !tenantId) {
        res.status(400).json({ error: "email, code, and tenant are required" });
        return;
      }
      const result = await authService.verifyEmail(email, code, tenantId);

      // Create session
      const tokenPayload = JSON.parse(
        Buffer.from(result.accessToken.split(".")[1], "base64").toString()
      );
      const parser = new UAParser(req.headers["user-agent"]);
      const device = parser.getResult();
      const session = new Session(
        crypto.randomUUID(), tokenPayload.sub,
        `${device.browser.name || "Unknown"} on ${device.os.name || "Unknown"}`,
        ip, new Date(), true
      );
      await sessionRepo.create(session);

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /auth/login
  router.post("/login", loginRateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      const ip = req.ip || "unknown";
      if (!email || !password || !tenantId) {
        res.status(400).json({ error: "email, password, and tenant are required" });
        return;
      }
      const result = await authService.login(email, password, tenantId, ip);

      const tokenPayload = JSON.parse(
        Buffer.from(result.accessToken.split(".")[1], "base64").toString()
      );
      const parser = new UAParser(req.headers["user-agent"]);
      const device = parser.getResult();
      const session = new Session(
        crypto.randomUUID(), tokenPayload.sub,
        `${device.browser.name || "Unknown"} on ${device.os.name || "Unknown"}`,
        ip, new Date(), true
      );
      await sessionRepo.create(session);

      res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // POST /auth/refresh
  router.post("/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: "refreshToken is required" });
        return;
      }
      const tokens = await refreshTokenService.refresh(refreshToken);
      res.json(tokens);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // POST /auth/google
  router.post("/google", async (req: AuthenticatedRequest, res) => {
    try {
      const { token } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      const ip = req.ip || "unknown";
      if (!token || !tenantId) {
        res.status(400).json({ error: "token and tenant are required" });
        return;
      }
      const result = await authService.loginWithGoogle({ email: "", name: "", googleId: token }, tenantId, ip);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // POST /auth/otp/request
  router.post("/otp/request", otpRateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      if (!email || !tenantId) {
        res.status(400).json({ error: "email and tenant are required" });
        return;
      }
      await authService.requestOtp(email, tenantId);
      res.json({ message: "OTP sent to your email" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /auth/otp/verify
  router.post("/otp/verify", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, code } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      const ip = req.ip || "unknown";
      if (!email || !code || !tenantId) {
        res.status(400).json({ error: "email, code, and tenant are required" });
        return;
      }
      const result = await authService.verifyOtp(email, code, tenantId, ip);

      // Create session
      const tokenPayload = JSON.parse(
        Buffer.from(result.accessToken.split(".")[1], "base64").toString()
      );
      const parser = new UAParser(req.headers["user-agent"]);
      const device = parser.getResult();
      const session = new Session(
        crypto.randomUUID(), tokenPayload.sub,
        `${device.browser.name || "Unknown"} on ${device.os.name || "Unknown"}`,
        ip, new Date(), true
      );
      await sessionRepo.create(session);

      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message });
    }
  });

  // POST /auth/forgot-password - sends OTP
  router.post("/forgot-password", otpRateLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const { email } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      if (!email || !tenantId) {
        res.status(400).json({ error: "email and tenant are required" });
        return;
      }
      await authService.forgotPassword(email, tenantId);
      res.json({ message: "OTP sent to your email" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /auth/reset-password - verify OTP + set new password
  router.post("/reset-password", async (req: AuthenticatedRequest, res) => {
    try {
      const { email, code, newPassword } = req.body;
      const tenantId = req.tenantId || req.headers["x-tenant-id"] as string;
      if (!email || !code || !newPassword || !tenantId) {
        res.status(400).json({ error: "email, code, newPassword, and tenant are required" });
        return;
      }
      await authService.resetPassword(email, code, newPassword, tenantId);
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /auth/change-password - authenticated, requires old password
  router.post("/change-password", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      if (!oldPassword || !newPassword) {
        res.status(400).json({ error: "oldPassword and newPassword are required" });
        return;
      }
      await authService.changePassword(req.user.userId, oldPassword, newPassword, req.user.tenantId);
      res.json({ message: "Password changed successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
