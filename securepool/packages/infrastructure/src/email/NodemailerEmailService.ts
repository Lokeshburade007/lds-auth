import nodemailer, { Transporter } from "nodemailer";
import { IEmailService } from "@securepool/application";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class NodemailerEmailService implements IEmailService {
  private transporter: Transporter;
  private from: string;

  constructor(config: EmailConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"SecurePool Auth" <${this.from}>`,
      to,
      subject: "Your SecurePool OTP Code",
      text: `Your OTP code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #1e293b; border-radius: 12px; padding: 40px; text-align: center;">
            <h2 style="color: #f1f5f9; margin: 0 0 8px;">SecurePool</h2>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 32px;">Your one-time verification code</p>
            <div style="background: #0f172a; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              This code expires in <strong style="color: #94a3b8;">5 minutes</strong>.<br/>
              If you didn't request this, ignore this email.
            </p>
          </div>
        </div>
      `,
    });
  }
}
