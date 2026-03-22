import crypto from "crypto";
import { User, AuditLog, AuditAction, RefreshToken } from "@securepool/core";
import { IUserRepository } from "../interfaces/IUserRepository";
import { IPasswordHasher } from "../interfaces/IPasswordHasher";
import { ITokenService } from "../interfaces/ITokenService";
import { ITokenRepository } from "../interfaces/ITokenRepository";
import { IOtpService } from "../interfaces/IOtpService";
import { IAuditLogRepository } from "../interfaces/IAuditLogRepository";
import { IEmailService } from "../interfaces/IEmailService";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly tokenRepository: ITokenRepository,
    private readonly otpService?: IOtpService,
    private readonly auditLogRepository?: IAuditLogRepository,
    private readonly emailService?: IEmailService,
  ) {}

  // Helper: generate tokens and save refresh token to DB
  private async generateAndSaveTokens(
    userId: string,
    tenantId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.tokenService.generateAccessToken(userId, tenantId);
    const refreshToken = await this.tokenService.generateRefreshToken(userId);

    // Save refresh token to DB so it can be looked up on refresh
    await this.tokenRepository.save(new RefreshToken(
      crypto.randomUUID(),
      userId,
      refreshToken, // stored as-is; looked up by exact match
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      false,
    ));

    return { accessToken, refreshToken };
  }

  // Step 1: Validate + send OTP (does NOT create user yet)
  async register(
    rawEmail: string,
    password: string,
    tenantId: string,
  ): Promise<{ email: string }> {
    const email = normalizeEmail(rawEmail);

    const existing = await this.userRepository.findByEmail(email, tenantId);
    if (existing) {
      throw new Error("User with this email already exists");
    }

    if (!this.otpService) throw new Error("OTP service is not configured");

    const passwordHash = await this.passwordHasher.hash(password);

    const pendingKey = `pending:${tenantId}:${email}`;
    const code = await this.otpService.generate(pendingKey, {
      email,
      passwordHash,
      tenantId,
    });

    if (this.emailService) {
      await this.emailService.sendOtp(email, code);
    }

    return { email };
  }

  // Step 2: Verify OTP → create user → return tokens
  async verifyEmail(
    rawEmail: string,
    code: string,
    tenantId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const email = normalizeEmail(rawEmail);

    if (!this.otpService) throw new Error("OTP service is not configured");

    const existing = await this.userRepository.findByEmail(email, tenantId);
    if (existing) {
      throw new Error("User already exists. Please login instead.");
    }

    const pendingKey = `pending:${tenantId}:${email}`;
    const result = await this.otpService.verify(pendingKey, code);

    if (!result.metadata?.passwordHash) {
      throw new Error("Registration data not found. Please register again.");
    }

    const user = new User(
      crypto.randomUUID(),
      tenantId,
      email,
      result.metadata.passwordHash,
      true,
      new Date(),
    );
    await this.userRepository.create(user);

    const tokens = await this.generateAndSaveTokens(user.id, tenantId);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.REGISTER, "unknown", { email }, new Date(),
      ));
    }

    return tokens;
  }

  // Login
  async login(
    rawEmail: string,
    password: string,
    tenantId: string,
    ip: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const email = normalizeEmail(rawEmail);

    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const isValid = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isValid) {
      if (this.auditLogRepository) {
        await this.auditLogRepository.log(new AuditLog(
          crypto.randomUUID(), user.id, tenantId,
          AuditAction.LOGIN_FAILED, ip, { email }, new Date(),
        ));
      }
      throw new Error("Invalid email or password");
    }

    if (!user.isVerified) {
      throw new Error("Email not verified. Please verify your email first.");
    }

    const tokens = await this.generateAndSaveTokens(user.id, tenantId);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.LOGIN_SUCCESS, ip, { email }, new Date(),
      ));
    }

    return tokens;
  }

  // Google SSO login
  async loginWithGoogle(
    googleUser: { email: string; name: string; googleId: string },
    tenantId: string,
    ip: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const email = normalizeEmail(googleUser.email);

    let user = await this.userRepository.findByEmail(email, tenantId);

    if (!user) {
      user = new User(
        crypto.randomUUID(), tenantId, email,
        null, true, new Date(),
      );
      await this.userRepository.create(user);
    }

    const tokens = await this.generateAndSaveTokens(user.id, tenantId);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.LOGIN_SUCCESS, ip,
        { provider: "google", googleId: googleUser.googleId }, new Date(),
      ));
    }

    return tokens;
  }

  // Request OTP (for OTP login)
  async requestOtp(rawEmail: string, tenantId: string): Promise<string> {
    const email = normalizeEmail(rawEmail);

    if (!this.otpService) throw new Error("OTP service is not configured");

    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user) throw new Error("User not found");

    const code = await this.otpService.generate(user.id);

    if (this.emailService) {
      await this.emailService.sendOtp(email, code);
    }

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.OTP_GENERATED, "unknown", { email }, new Date(),
      ));
    }

    return code;
  }

  // Verify OTP (for OTP login)
  async verifyOtp(
    rawEmail: string, code: string, tenantId: string, ip: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const email = normalizeEmail(rawEmail);

    if (!this.otpService) throw new Error("OTP service is not configured");

    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user) throw new Error("User not found");

    await this.otpService.verify(user.id, code);

    // OTP proves email ownership - ensure user is verified
    if (!user.isVerified) {
      user.isVerified = true;
      await this.userRepository.update(user);
    }

    const tokens = await this.generateAndSaveTokens(user.id, tenantId);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.OTP_VERIFIED, ip, { email }, new Date(),
      ));
    }

    return tokens;
  }

  // Forgot password - sends OTP to email
  async forgotPassword(rawEmail: string, tenantId: string): Promise<void> {
    const email = normalizeEmail(rawEmail);

    if (!this.otpService) throw new Error("OTP service is not configured");

    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user) throw new Error("User not found");

    const code = await this.otpService.generate(user.id);

    if (this.emailService) {
      await this.emailService.sendOtp(email, code);
    }

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.PASSWORD_RESET, "unknown",
        { email, step: "otp_sent" }, new Date(),
      ));
    }
  }

  // Reset password - verify OTP + set new password
  async resetPassword(
    rawEmail: string, code: string, newPassword: string, tenantId: string,
  ): Promise<void> {
    const email = normalizeEmail(rawEmail);

    if (!this.otpService) throw new Error("OTP service is not configured");

    const user = await this.userRepository.findByEmail(email, tenantId);
    if (!user) throw new Error("User not found");

    await this.otpService.verify(user.id, code);

    user.passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.update(user);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.PASSWORD_RESET, "unknown",
        { email, step: "password_changed" }, new Date(),
      ));
    }
  }

  // Change password (authenticated, requires old password)
  async changePassword(
    userId: string, oldPassword: string, newPassword: string, tenantId: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new Error("User not found");
    }

    const isValid = await this.passwordHasher.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    user.passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.update(user);

    if (this.auditLogRepository) {
      await this.auditLogRepository.log(new AuditLog(
        crypto.randomUUID(), user.id, tenantId,
        AuditAction.PASSWORD_RESET, "unknown",
        { step: "password_changed_by_user" }, new Date(),
      ));
    }
  }
}
