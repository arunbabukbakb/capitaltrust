import { getDatabase } from '../database';

export interface Role {
  id: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
}

export interface MenuItem {
  id: number;
  menuId: string;
  name: string;
  icon?: string;
  path?: string;
  parentId?: string;
  menuOrder: number;
}

export const RoleModel = {
  async listAll(): Promise<Role[]> {
    const db = getDatabase();
    return db.all<Role[]>("SELECT id, roleName, roleType FROM roles");
  },

  async findById(id: number): Promise<Role | undefined> {
    const db = getDatabase();
    return db.get<Role>("SELECT * FROM roles WHERE id = ?", [id]);
  },

  async findByRoleType(roleType: string): Promise<Role | undefined> {
    const db = getDatabase();
    return db.get<Role>("SELECT id FROM roles WHERE roleType = ?", [roleType]);
  },

  async create(roleName: string, roleType: 'admin' | 'manager' | 'user'): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    return db.run("INSERT INTO roles (roleName, roleType) VALUES (?, ?)", [roleName, roleType]);
  },

  async update(id: number, roleName: string, roleType: 'admin' | 'manager' | 'user'): Promise<void> {
    const db = getDatabase();
    await db.run("UPDATE roles SET roleName = ?, roleType = ? WHERE id = ?", [roleName, roleType, id]);
  },

  async delete(id: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM roles WHERE id = ?", [id]);
  },

  async listMenus(): Promise<MenuItem[]> {
    const db = getDatabase();
    return db.all<MenuItem[]>("SELECT * FROM menus ORDER BY parentId, menuOrder");
  },

  async listPermissionsByRole(roleId: number): Promise<number[]> {
    const db = getDatabase();
    const rows = await db.all<{ menuId: number }[]>(
      "SELECT menuId FROM role_menu_permissions WHERE roleId = ?",
      [roleId]
    );
    return rows.map(r => r.menuId);
  },

  async setPermissions(roleId: number, menuIds: number[]): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM role_menu_permissions WHERE roleId = ?", [roleId]);
    for (const mId of menuIds) {
      await db.run(
        "INSERT INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
        [roleId, mId]
      );
    }
  },

  async clearPermissions(roleId: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM role_menu_permissions WHERE roleId = ?", [roleId]);
  }
};
