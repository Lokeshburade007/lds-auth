import { Session } from "@securepool/core";
import { ISessionRepository } from "@securepool/application";
import { SessionModel } from "../models/SessionModel";

export class MongoSessionRepository implements ISessionRepository {
  async create(session: Session): Promise<void> {
    const doc = await SessionModel.create({
      userId: session.userId,
      device: session.device,
      ip: session.ip,
      createdAt: session.createdAt,
      isActive: session.isActive,
    });
    session.id = doc._id.toString();
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const docs = await SessionModel.find({ userId, isActive: true });
    return docs.map(doc => new Session(doc._id.toString(), doc.userId, doc.device, doc.ip, doc.createdAt, doc.isActive));
  }

  async deactivate(sessionId: string): Promise<void> {
    await SessionModel.findByIdAndUpdate(sessionId, { isActive: false });
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await SessionModel.updateMany({ userId }, { isActive: false });
  }
}
