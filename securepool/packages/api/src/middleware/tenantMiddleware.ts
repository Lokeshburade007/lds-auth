import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";

export function tenantMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId) {
    res.status(400).json({ error: "x-tenant-id header is required" });
    return;
  }
  req.tenantId = tenantId;
  next();
}
