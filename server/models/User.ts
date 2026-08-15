import { getDatabase } from '../database';

export interface User {
  id: string;
  memberNumber?: string;
  fullName: string;
  email: string;
  username?: string;
  role: string;
  password?: string;
  status: number;
  phoneNumber?: string;
  alternateNumber?: string;
  gender?: string;
  dob?: string;
  joiningDate?: string;
  address?: string;
  country?: string;
  state?: string;
  district?: string;
  locality?: string;
  pincode?: string;
  idType?: string;
  idNumber?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifsc?: string;
  nomineeName?: string;
  relationship?: string;
  nomineeContact?: string;
  occupation?: string;
  notes?: string;
  roleId?: number;
  profileImage?: string;
  tenantId: string;
}

export interface UserRoleMapping {
  userId: string;
  roleId: number;
  roleName: string;
  roleType: string;
}

export const UserModel = {
  async findById(id: string): Promise<User | undefined> {
    const db = getDatabase();
    return db.get<User>("SELECT * FROM users WHERE id = ?", [id]);
  },

  async findByUsernameOrEmail(identifier: string, tenantId: string | null): Promise<User | undefined> {
    const db = getDatabase();
    const loginIdentifier = identifier.toLowerCase();

    return db.get<User>(
      "SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND tenantId = ?",
      [loginIdentifier, loginIdentifier, tenantId]
    );
  },

  async countAll(): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users");
    return res?.count || 0;
  },

  async countByPrefix(prefix: string): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE id LIKE ?", [`${prefix}%`]);
    return res?.count || 0;
  },

  async create(user: Omit<User, 'status'> & { status?: number }): Promise<void> {
    const db = getDatabase();
    const status = user.status !== undefined ? user.status : 0;
    await db.run(
      `INSERT INTO users (
        id, memberNumber, fullName, email, username, role, password, status, phoneNumber, alternateNumber,
        gender, dob, joiningDate, address, country, state, district, locality, pincode,
        idType, idNumber, bankName, bankBranch, accountNumber, ifsc,
        nomineeName, relationship, nomineeContact, occupation, notes, roleId, profileImage, tenantId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, user.memberNumber || null, user.fullName, user.email.toLowerCase(), user.username?.toLowerCase() || null,
        user.role, user.password || null, status, user.phoneNumber || null, user.alternateNumber || null,
        user.gender || null, user.dob || null, user.joiningDate || null, user.address || null, user.country || null,
        user.state || null, user.district || null, user.locality || null, user.pincode || null,
        user.idType || null, user.idNumber || null, user.bankName || null, user.bankBranch || null,
        user.accountNumber || null, user.ifsc || null, user.nomineeName || null, user.relationship || null,
        user.nomineeContact || null, user.occupation || null, user.notes || null, user.roleId || null,
        user.profileImage || null, user.tenantId
      ]
    );
  },

  async update(id: string, user: Partial<Omit<User, 'id'>>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(user).forEach(([key, val]) => {
      fields.push(`${key} = ?`);
      values.push(val);
    });

    values.push(id);
    await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM users WHERE id = ?", [id]);
  },

  async listByTenant(tenantId: string): Promise<User[]> {
    const db = getDatabase();
    return db.all<User[]>(
      "SELECT * FROM users WHERE tenantId = ? ORDER BY fullName",
      [tenantId]
    );
  },

  async listUserRolesByTenant(tenantId: string): Promise<UserRoleMapping[]> {
    const db = getDatabase();
    return db.all<UserRoleMapping[]>(
      `SELECT ur.userId, r.id as roleId, r.roleName, r.roleType 
       FROM user_roles ur
       JOIN roles r ON ur.roleId = r.id
       JOIN users u ON ur.userId = u.id
       WHERE u.tenantId = ?`,
      [tenantId]
    );
  },

  async getAssignedRoles(userId: string): Promise<{ id: number; roleName: string; roleType: string }[]> {
    const db = getDatabase();
    return db.all<{ id: number; roleName: string; roleType: string }[]>(
      `SELECT r.id, r.roleName, r.roleType FROM roles r
       JOIN user_roles ur ON r.id = ur.roleId
       WHERE ur.userId = ?`,
      [userId]
    );
  },

  async assignRole(userId: string, roleId: number): Promise<void> {
    const db = getDatabase();
    await db.run("INSERT INTO user_roles (userId, roleId) VALUES (?, ?)", [userId, roleId]);
  },

  async clearRoles(userId: string): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM user_roles WHERE userId = ?", [userId]);
  },

  async checkAdminExists(tenantId: string, excludeUserId?: string): Promise<boolean> {
    const db = getDatabase();
    const query = excludeUserId
      ? `SELECT ur.userId FROM user_roles ur
         JOIN roles r ON ur.roleId = r.id
         JOIN users u ON ur.userId = u.id
         WHERE r.roleType = 'admin' AND u.tenantId = ? AND ur.userId != ?`
      : `SELECT ur.userId FROM user_roles ur
         JOIN roles r ON ur.roleId = r.id
         JOIN users u ON ur.userId = u.id
         WHERE r.roleType = 'admin' AND u.tenantId = ?`;
    const params = excludeUserId ? [tenantId, excludeUserId] : [tenantId];
    const res = await db.get(query, params);
    return !!res;
  },

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    const db = getDatabase();
    await db.run(
      "INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );
  },

  async getPasswordResetToken(token: string): Promise<any | undefined> {
    const db = getDatabase();
    return db.get("SELECT * FROM password_reset_tokens WHERE token = ?", [token]);
  },

  async deletePasswordResetToken(id: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM password_reset_tokens WHERE id = ?", [id]);
  }
};
