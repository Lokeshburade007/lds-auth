import { Role, UserRole } from "@securepool/core";
import { IRoleRepository } from "@securepool/application";
import { RoleModel } from "../models/RoleModel";
import { UserRoleModel } from "../models/UserRoleModel";

export class MongoRoleRepository implements IRoleRepository {
  async findById(id: string): Promise<Role | null> {
    const doc = await RoleModel.findById(id);
    if (!doc) return null;
    return new Role(doc._id.toString(), doc.name);
  }

  async findByName(name: string): Promise<Role | null> {
    const doc = await RoleModel.findOne({ name });
    if (!doc) return null;
    return new Role(doc._id.toString(), doc.name);
  }

  async assignRole(userRole: UserRole): Promise<void> {
    await UserRoleModel.create({
      userId: userRole.userId,
      roleId: userRole.roleId,
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoleDocs = await UserRoleModel.find({ userId });
    const roleIds = userRoleDocs.map(doc => doc.roleId);
    const roleDocs = await RoleModel.find({ _id: { $in: roleIds } });
    return roleDocs.map(doc => new Role(doc._id.toString(), doc.name));
  }
}
