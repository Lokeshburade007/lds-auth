import { Request, Response, NextFunction } from "express";
import { ITokenService } from "@securepool/application";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; tenantId: string };
  tenantId?: string;
}

export function createAuthMiddleware(tokenService: ITokenService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];
    try {
      const payload = await tokenService.verifyAccessToken(token);
      req.user = { userId: payload.sub, tenantId: payload.tenantId };
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
