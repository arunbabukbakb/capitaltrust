import { Request, Response } from 'express';
import { getDatabase } from '../database';

function getTenantId(req: Request): number {
  const raw = req.headers['x-tenant-id'];
  const parsed = Number(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export const listGroups = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const db = getDatabase();

    const groups = await db.all(`
      SELECT 
        g.id,
        g.name,
        g.code,
        g.status,
        g.createdAt,
        g.updatedAt,
        COUNT(u.id) as memberCount
      FROM tenant_groups g
      LEFT JOIN users u ON g.id = u.groupId
      WHERE g.tenantId = ?
      GROUP BY g.id
      ORDER BY g.name ASC
    `, [tenantId]);

    return res.json(groups);
  } catch (error) {
    console.error('Error listing groups:', error);
    return res.status(500).json({ error: 'Failed to fetch groups.' });
  }
};

export const getGroupDetails = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const db = getDatabase();
    const group = await db.get(
      "SELECT * FROM tenant_groups WHERE id = ? AND tenantId = ?",
      [groupId, tenantId]
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const members = await db.all(`
      SELECT u.id as userId, u.fullName, u.email, u.phoneNumber
      FROM users u
      WHERE u.groupId = ? AND u.tenantId = ?
      ORDER BY u.fullName ASC
    `, [groupId, tenantId]);

    return res.json({
      group,
      members
    });
  } catch (error) {
    console.error('Error getting group details:', error);
    return res.status(500).json({ error: 'Failed to fetch group details.' });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { name, code, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Group code is required.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    const groupStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    const db = getDatabase();

    // Check code uniqueness within this tenant
    const existingCode = await db.get(
      "SELECT id FROM tenant_groups WHERE tenantId = ? AND UPPER(code) = UPPER(?)",
      [tenantId, cleanCode]
    );
    if (existingCode) {
      return res.status(400).json({ error: `Group code "${cleanCode}" already exists for this tenant.` });
    }

    const result = await db.run(
      "INSERT INTO tenant_groups (tenantId, name, code, status) VALUES (?, ?, ?, ?)",
      [tenantId, cleanName, cleanCode, groupStatus]
    );

    const groupId = result.lastID as number;

    return res.status(201).json({
      message: 'Group created successfully.',
      groupId
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Failed to create group.' });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const { name, code, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Group code is required.' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    const groupStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    const db = getDatabase();

    const group = await db.get(
      "SELECT id FROM tenant_groups WHERE id = ? AND tenantId = ?",
      [groupId, tenantId]
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check code uniqueness for other groups in tenant
    const existingCode = await db.get(
      "SELECT id FROM tenant_groups WHERE tenantId = ? AND UPPER(code) = UPPER(?) AND id != ?",
      [tenantId, cleanCode, groupId]
    );
    if (existingCode) {
      return res.status(400).json({ error: `Group code "${cleanCode}" is already used by another group.` });
    }

    await db.run(
      "UPDATE tenant_groups SET name = ?, code = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND tenantId = ?",
      [cleanName, cleanCode, groupStatus, groupId, tenantId]
    );

    return res.json({ message: 'Group updated successfully.' });
  } catch (error) {
    console.error('Error updating group:', error);
    return res.status(500).json({ error: 'Failed to update group.' });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const db = getDatabase();

    const group = await db.get(
      "SELECT id FROM tenant_groups WHERE id = ? AND tenantId = ?",
      [groupId, tenantId]
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Clear groupId on any users assigned to this group before deleting
    await db.run("UPDATE users SET groupId = NULL WHERE groupId = ? AND tenantId = ?", [groupId, tenantId]);
    await db.run("DELETE FROM tenant_groups WHERE id = ? AND tenantId = ?", [groupId, tenantId]);

    return res.json({ message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Failed to delete group.' });
  }
};

export const getTenantUsersForGroup = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const db = getDatabase();

    const users = await db.all(`
      SELECT id, fullName, email, phoneNumber, username, status
      FROM users
      WHERE tenantId = ?
      ORDER BY fullName ASC
    `, [tenantId]);

    return res.json(users);
  } catch (error) {
    console.error('Error fetching tenant users for group:', error);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const db = getDatabase();
    const members = await db.all(`
      SELECT DISTINCT u.id, u.fullName, u.email, u.phoneNumber, u.username, u.status, gm.joinedDate
      FROM users u
      JOIN group_members gm ON u.id = gm.userId
      WHERE gm.groupId = ? AND gm.tenantId = ?
      ORDER BY u.fullName ASC
    `, [groupId, tenantId]);

    return res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return res.status(500).json({ error: 'Failed to fetch group members.' });
  }
};

export const getAvailableUsersForGroup = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const db = getDatabase();

    const orgSettings = await db.get(
      "SELECT oneUserOneGroup FROM organization_settings WHERE tenantId = ?",
      [tenantId]
    );
    const oneUserOneGroup = orgSettings ? Boolean(orgSettings.oneUserOneGroup) : true;

    let availableUsers: any[] = [];
    if (oneUserOneGroup) {
      availableUsers = await db.all(`
        SELECT u.id, u.fullName, u.email, u.phoneNumber, u.username
        FROM users u
        WHERE u.tenantId = ?
          AND u.id NOT IN (SELECT userId FROM group_members WHERE tenantId = ?)
        ORDER BY u.fullName ASC
      `, [tenantId, tenantId]);
    } else {
      availableUsers = await db.all(`
        SELECT u.id, u.fullName, u.email, u.phoneNumber, u.username
        FROM users u
        WHERE u.tenantId = ?
          AND u.id NOT IN (SELECT userId FROM group_members WHERE groupId = ? AND tenantId = ?)
        ORDER BY u.fullName ASC
      `, [tenantId, groupId, tenantId]);
    }

    return res.json({
      oneUserOneGroup,
      users: availableUsers
    });
  } catch (error) {
    console.error('Error fetching available users for group:', error);
    return res.status(500).json({ error: 'Failed to fetch available users.' });
  }
};

export const addGroupMembers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID.' });
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'No users selected to add.' });
    }

    const db = getDatabase();

    for (const userId of userIds) {
      if (typeof userId === 'string' && userId.trim()) {
        const cleanUserId = userId.trim();
        await db.run(
          "INSERT IGNORE INTO group_members (groupId, userId, tenantId) VALUES (?, ?, ?)",
          [groupId, cleanUserId, tenantId]
        );
      }
    }

    return res.json({ message: 'Members added to group successfully.' });
  } catch (error) {
    console.error('Error adding members to group:', error);
    return res.status(500).json({ error: 'Failed to add members.' });
  }
};

export const removeGroupMember = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    const userId = req.params.userId;

    if (isNaN(groupId) || !userId) {
      return res.status(400).json({ error: 'Invalid group ID or user ID.' });
    }

    const db = getDatabase();

    await db.run(
      "DELETE FROM group_members WHERE groupId = ? AND userId = ? AND tenantId = ?",
      [groupId, userId, tenantId]
    );

    return res.json({ message: 'Member removed from group successfully.' });
  } catch (error) {
    console.error('Error removing group member:', error);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
};

export const updateGroupMemberJoinedDate = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const groupId = parseInt(req.params.id, 10);
    const userId = req.params.userId;
    const { joinedDate } = req.body;

    if (isNaN(groupId) || !userId || !joinedDate) {
      return res.status(400).json({ error: 'Invalid group ID, user ID, or joined date.' });
    }

    const db = getDatabase();

    await db.run(
      "UPDATE group_members SET joinedDate = ? WHERE groupId = ? AND userId = ? AND tenantId = ?",
      [joinedDate, groupId, userId, tenantId]
    );

    return res.json({ message: 'Member joined date updated successfully.' });
  } catch (error) {
    console.error('Error updating member joined date:', error);
    return res.status(500).json({ error: 'Failed to update joined date.' });
  }
};
