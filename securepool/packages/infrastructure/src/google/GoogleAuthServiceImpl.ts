import { OAuth2Client } from "google-auth-library";
import { IGoogleAuthService } from "@securepool/application";

export class GoogleAuthServiceImpl implements IGoogleAuthService {
  private client: OAuth2Client;

  constructor(private clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verifyToken(token: string): Promise<{ email: string; name: string; googleId: string }> {
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("Invalid Google token");
    }

    return {
      email: payload.email,
      name: payload.name || "",
      googleId: payload.sub,
    };
  }
}
