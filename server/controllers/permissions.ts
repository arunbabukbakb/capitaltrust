import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

// Get menu IDs assigned to a specific role ID
export const getRolePermissions = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { roleId } = req.params;
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await db.get<{ roleType: string }>(
      "SELECT r.roleType FROM users u JOIN roles r ON u.roleId = r.id WHERE u.id = ?",
      [userId]
    );
    if (!user || (user.roleType !== 'admin' && user.roleType !== 'manager')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const permissions = await db.all(
      "SELECT menuId FROM role_menu_permissions WHERE roleId = ?",
      [roleId]
    );

    // Map to list of menu ids (numbers)
    const allowedMenuIds = permissions.map((p: any) => p.menuId);
    res.json(allowedMenuIds);
  } catch (error) {
    console.error("GetRolePermissions error", error);
    res.status(500).json({ error: "Error fetching role permissions" });
  }
};

// Update permissions for a role ID
export const updateRolePermissions = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { roleId } = req.params;
    const { menuIds } = req.body; // array of menu IDs (numbers)

    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await db.get<{ roleType: string }>(
      "SELECT r.roleType FROM users u JOIN roles r ON u.roleId = r.id WHERE u.id = ?",
      [userId]
    );
    if (!user || (user.roleType !== 'admin' && user.roleType !== 'manager')) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!Array.isArray(menuIds)) {
      return res.status(400).json({ error: "menuIds must be an array" });
    }

    // Run within database transaction to guarantee atomicity
    await db.run("BEGIN TRANSACTION;");
    try {
      await db.run("DELETE FROM role_menu_permissions WHERE roleId = ?", [roleId]);

      for (const menuId of menuIds) {
        await db.run(
          "INSERT INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
          [roleId, menuId]
        );
      }
      await db.run("COMMIT;");
    } catch (txError) {
      await db.run("ROLLBACK;");
      throw txError;
    }

    res.json({ success: true, message: "Permissions updated successfully" });
  } catch (error) {
    console.error("UpdateRolePermissions error", error);
    res.status(500).json({ error: "Error saving role permissions" });
  }
};
