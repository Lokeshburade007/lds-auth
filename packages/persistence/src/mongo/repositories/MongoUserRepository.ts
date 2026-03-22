import { User } from "@securepool/core";
import { IUserRepository } from "@securepool/application";
import { UserModel } from "../models/UserModel";

export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;
    return new User(doc._id.toString(), doc.tenantId, doc.email, doc.passwordHash, doc.isVerified, doc.createdAt);
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email, tenantId });
    if (!doc) return null;
    return new User(doc._id.toString(), doc.tenantId, doc.email, doc.passwordHash, doc.isVerified, doc.createdAt);
  }

  async create(user: User): Promise<void> {
    const doc = await UserModel.create({
      tenantId: user.tenantId,
      email: user.email,
      passwordHash: user.passwordHash,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
    // Update the user's id with the Mongo-generated ObjectId
    user.id = doc._id.toString();
  }

  async update(user: User): Promise<void> {
    await UserModel.findByIdAndUpdate(user.id, {
      email: user.email,
      passwordHash: user.passwordHash,
      isVerified: user.isVerified,
    });
  }
}
