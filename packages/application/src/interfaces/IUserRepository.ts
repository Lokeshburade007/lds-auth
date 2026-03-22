import { User } from "@securepool/core";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, tenantId: string): Promise<User | null>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
