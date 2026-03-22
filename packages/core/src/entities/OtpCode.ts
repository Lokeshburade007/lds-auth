export class OtpCode {
  constructor(
    public id: string,
    public userId: string,
    public code: string,
    public expiresAt: Date,
    public attempts: number,
    public metadata?: Record<string, string>,
  ) {}
}
