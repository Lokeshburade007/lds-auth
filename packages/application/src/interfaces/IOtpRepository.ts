import { OtpCode } from "@securepool/core";

export interface IOtpRepository {
  save(otp: OtpCode): Promise<void>;
  findLatest(userId: string): Promise<OtpCode | null>;
  update(otp: OtpCode): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
