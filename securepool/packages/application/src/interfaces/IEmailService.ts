export interface IEmailService {
  sendOtp(to: string, code: string): Promise<void>;
}
