import { getDatabase } from '../database';

export interface SendNotificationPayload {
  title: string;
  body: string;
}

export interface PushTokenRow {
  token: string;
  userId: string;
}

export const NotificationModel = {
  /**
   * Retrieve all push tokens for a specific user.
   */
  async getTokensByUserId(userId: string): Promise<PushTokenRow[]> {
    const db = getDatabase();
    return db.all<PushTokenRow[]>(
      'SELECT token, userId FROM user_push_tokens WHERE userId = ?',
      [userId]
    );
  },

  /**
   * Retrieve all push tokens for users that have any of the given role IDs.
   */
  async getTokensByRoleIds(roleIds: number[]): Promise<PushTokenRow[]> {
    if (roleIds.length === 0) return [];
    const db = getDatabase();
    const placeholders = roleIds.map(() => '?').join(',');
    return db.all<PushTokenRow[]>(
      `SELECT DISTINCT upt.token, upt.userId
       FROM user_push_tokens upt
       JOIN user_roles ur ON upt.userId = ur.userId
       WHERE ur.roleId IN (${placeholders})`,
      roleIds
    );
  },

  /**
   * Retrieve role IDs matching the given role names.
   */
  async getRoleIdsByNames(roleNames: string[]): Promise<number[]> {
    if (roleNames.length === 0) return [];
    const db = getDatabase();
    const placeholders = roleNames.map(() => '?').join(',');
    const rows = await db.all<{ id: number }[]>(
      `SELECT id FROM roles WHERE roleName IN (${placeholders})`,
      roleNames
    );
    return rows.map(r => r.id);
  },

  /**
   * Remove a stale / unregistered push token from the DB.
   */
  async removeStaleToken(userId: string, token: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      'DELETE FROM user_push_tokens WHERE userId = ? AND token = ?',
      [userId, token]
    );
  }
};
