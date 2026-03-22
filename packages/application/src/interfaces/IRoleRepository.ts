import { Role, UserRole } from "@securepool/core";

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  assignRole(userRole: UserRole): Promise<void>;
  getUserRoles(userId: string): Promise<Role[]>;
}
