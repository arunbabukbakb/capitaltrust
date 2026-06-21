import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getUsers = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const users = await db.all(`
      SELECT u.id, u.fullName, u.email, u.username, u.phoneNumber, u.status 
      FROM users u
      ORDER BY u.fullName
    `);

    const userRoles = await db.all(`
      SELECT ur.userId, r.id as roleId, r.roleName, r.roleType 
      FROM user_roles ur
      JOIN roles r ON ur.roleId = r.id
    `);

    const usersWithRoles = users.map(user => {
      const roles = userRoles.filter(ur => ur.userId === user.id);
      return {
        ...user,
        assignedRoles: roles.map(r => ({ id: r.roleId, roleName: r.roleName, roleType: r.roleType })),
        roleId: roles[0]?.roleId || null,
        roleName: roles[0]?.roleName || null,
        roleType: roles[0]?.roleType || null
      };
    });

    res.json(usersWithRoles);
  } catch (error) {
    console.error("Get users error", error);
    res.status(500).json({ error: "Error fetching users" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { fullName, email, username, phoneNumber, roleId, roleIds } = req.body;
    const finalRoleIds: number[] = Array.isArray(roleIds) ? roleIds : (roleId ? [Number(roleId)] : []);

    if (!fullName || !email || !username || finalRoleIds.length === 0) {
      return res.status(400).json({ error: "fullName, email, username, and roleIds are required" });
    }

    const rolesInfo = await db.all<{ id: number; roleType: string }[]>(
      `SELECT id, roleType FROM roles WHERE id IN (${finalRoleIds.map(() => "?").join(",")})`,
      finalRoleIds
    );
    if (rolesInfo.length === 0) {
      return res.status(400).json({ error: "Invalid roleIds" });
    }

    const hasAdminRole = rolesInfo.some(r => r.roleType === 'admin');
    if (hasAdminRole) {
      const existingAdmin = await db.get<{ userId: string }>(`
        SELECT ur.userId FROM user_roles ur
        JOIN roles r ON ur.roleId = r.id
        WHERE r.roleType = 'admin'
      `);
      if (existingAdmin) {
        return res.status(400).json({ error: "Only one user can have the Administrator role." });
      }
    }

    const primaryRole = rolesInfo.find(r => r.id === finalRoleIds[0]) || rolesInfo[0];
    const id = `CT-${Math.floor(40000 + Math.random() * 20000)}`;

    await db.run("BEGIN TRANSACTION;");
    try {
      await db.run(
        "INSERT INTO users (id, fullName, email, username, role, status, phoneNumber, roleId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, fullName, email, username, primaryRole.roleType, 0, phoneNumber || null, primaryRole.id]
      );

      for (const rId of finalRoleIds) {
        await db.run(
          "INSERT INTO user_roles (userId, roleId) VALUES (?, ?)",
          [id, rId]
        );
      }
      await db.run("COMMIT;");
    } catch (txErr) {
      await db.run("ROLLBACK;");
      throw txErr;
    }

    const newUser = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: `A user with the email "${req.body.email}" already exists.` });
    }
    console.error("Create user error", error);
    res.status(500).json({ error: "Error creating user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { fullName, email, username, phoneNumber, roleId, roleIds, status } = req.body;
    const finalRoleIds: number[] = Array.isArray(roleIds) ? roleIds : (roleId ? [Number(roleId)] : []);

    if (!fullName || !email || !username || finalRoleIds.length === 0) {
      return res.status(400).json({ error: "fullName, email, username and roleIds are required" });
    }

    const rolesInfo = await db.all<{ id: number; roleType: string }[]>(
      `SELECT id, roleType FROM roles WHERE id IN (${finalRoleIds.map(() => "?").join(",")})`,
      finalRoleIds
    );
    if (rolesInfo.length === 0) {
      return res.status(400).json({ error: "Invalid roleIds" });
    }

    const hasAdminRole = rolesInfo.some(r => r.roleType === 'admin');
    if (hasAdminRole) {
      const existingAdmin = await db.get<{ userId: string }>(`
        SELECT ur.userId FROM user_roles ur
        JOIN roles r ON ur.roleId = r.id
        WHERE r.roleType = 'admin' AND ur.userId != ?
      `, [id]);
      if (existingAdmin) {
        return res.status(400).json({ error: "Only one user can have the Administrator role." });
      }
    }

    const primaryRole = rolesInfo.find(r => r.id === finalRoleIds[0]) || rolesInfo[0];

    await db.run("BEGIN TRANSACTION;");
    try {
      await db.run(
        "UPDATE users SET fullName = ?, email = ?, username = ?, phoneNumber = ?, roleId = ?, role = ?, status = ? WHERE id = ?",
        [fullName, email, username, phoneNumber || null, primaryRole.id, primaryRole.roleType, status === true || status === 1 ? 1 : 0, id]
      );

      await db.run("DELETE FROM user_roles WHERE userId = ?", [id]);
      for (const rId of finalRoleIds) {
        await db.run(
          "INSERT INTO user_roles (userId, roleId) VALUES (?, ?)",
          [id, rId]
        );
      }
      await db.run("COMMIT;");
    } catch (txErr) {
      await db.run("ROLLBACK;");
      throw txErr;
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error("Update user error", error);
    res.status(500).json({ error: "Error updating user" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const user = await db.get<{ role: string }>("SELECT role FROM users WHERE id = ?", [id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: "Cannot delete an admin user" });
    }
    await db.run("DELETE FROM users WHERE id = ?", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Delete user error", error);
    res.status(500).json({ error: "Error deleting user" });
  }
};

