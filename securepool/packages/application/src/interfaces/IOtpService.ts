export interface IOtpService {
  generate(userId: string, metadata?: Record<string, string>): Promise<string>;
  verify(userId: string, code: string): Promise<{ valid: boolean; metadata?: Record<string, string> }>;
}
