import { Session } from "@securepool/core";

export interface ISessionRepository {
  create(session: Session): Promise<void>;
  findByUserId(userId: string): Promise<Session[]>;
  deactivate(sessionId: string): Promise<void>;
  deactivateAllForUser(userId: string): Promise<void>;
}
