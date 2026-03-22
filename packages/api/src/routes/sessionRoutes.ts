import { Router } from "express";
import { ISessionRepository } from "@securepool/application";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export function createSessionRoutes(sessionRepo: ISessionRepository): Router {
  const router = Router();

  // GET /sessions - list user's sessions
  router.get("/", async (req: AuthenticatedRequest, res) => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    const sessions = await sessionRepo.findByUserId(req.user.userId);
    res.json({ sessions });
  });

  // DELETE /sessions/:id - deactivate a session
  router.delete("/:id", async (req: AuthenticatedRequest, res) => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    await sessionRepo.deactivate(req.params.id);
    res.json({ message: "Session deactivated" });
  });

  // DELETE /sessions - logout all
  router.delete("/", async (req: AuthenticatedRequest, res) => {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
    await sessionRepo.deactivateAllForUser(req.user.userId);
    res.json({ message: "All sessions deactivated" });
  });

  return router;
}
