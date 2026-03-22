import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { IRoleRepository } from "@securepool/application";

export function createAuthorize(roleRepo: IRoleRepository) {
  return (allowedRoles: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const userRoles = await roleRepo.getUserRoles(req.user.userId);
      const hasRole = userRoles.some(role => allowedRoles.includes(role.name));

      if (!hasRole) {
        res.status(403).json({ error: "Forbidden: insufficient permissions" });
        return;
      }

      next();
    };
  };
}
