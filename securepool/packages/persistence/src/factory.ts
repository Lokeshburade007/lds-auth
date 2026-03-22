import { PrismaClient } from "@prisma/client";
import { IUserRepository, ITokenRepository, IOtpRepository, ISessionRepository, IAuditLogRepository, IRoleRepository } from "@securepool/application";
import { connectMongo } from "./mongo/connection";
import { MongoUserRepository } from "./mongo/repositories/MongoUserRepository";
import { MongoTokenRepository } from "./mongo/repositories/MongoTokenRepository";
import { MongoOtpRepository } from "./mongo/repositories/MongoOtpRepository";
import { MongoSessionRepository } from "./mongo/repositories/MongoSessionRepository";
import { MongoAuditLogRepository } from "./mongo/repositories/MongoAuditLogRepository";
import { MongoRoleRepository } from "./mongo/repositories/MongoRoleRepository";
import { PrismaUserRepository } from "./prisma/repositories/PrismaUserRepository";
import { PrismaTokenRepository } from "./prisma/repositories/PrismaTokenRepository";
import { PrismaOtpRepository } from "./prisma/repositories/PrismaOtpRepository";
import { PrismaSessionRepository } from "./prisma/repositories/PrismaSessionRepository";
import { PrismaAuditLogRepository } from "./prisma/repositories/PrismaAuditLogRepository";
import { PrismaRoleRepository } from "./prisma/repositories/PrismaRoleRepository";

export interface Repositories {
  userRepo: IUserRepository;
  tokenRepo: ITokenRepository;
  otpRepo: IOtpRepository;
  sessionRepo: ISessionRepository;
  auditLogRepo: IAuditLogRepository;
  roleRepo: IRoleRepository;
}

export async function createRepositories(config: { type: "mongo" | "postgres"; url: string }): Promise<Repositories> {
  if (config.type === "mongo") {
    await connectMongo(config.url);
    return {
      userRepo: new MongoUserRepository(),
      tokenRepo: new MongoTokenRepository(),
      otpRepo: new MongoOtpRepository(),
      sessionRepo: new MongoSessionRepository(),
      auditLogRepo: new MongoAuditLogRepository(),
      roleRepo: new MongoRoleRepository(),
    };
  }

  const prisma = new PrismaClient({ datasourceUrl: config.url });
  return {
    userRepo: new PrismaUserRepository(prisma),
    tokenRepo: new PrismaTokenRepository(prisma),
    otpRepo: new PrismaOtpRepository(prisma),
    sessionRepo: new PrismaSessionRepository(prisma),
    auditLogRepo: new PrismaAuditLogRepository(prisma),
    roleRepo: new PrismaRoleRepository(prisma),
  };
}
