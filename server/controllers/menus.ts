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

function isSuperAdminRequest(req: Request): boolean {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    return payload.role === 'superadmin';
  } catch {
    return false;
  }
}

// Fetch menus allowed for the logged in user (supports switching active role via roleId query param)
export const getUserMenus = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const requestedRoleId = req.query.roleId ? Number(req.query.roleId) : null;
    let activeRoleId: number;
    let activeRoleType: string;

    if (requestedRoleId) {
      // Verify user has this role assigned
      const assignment = await db.get<{ roleId: number; roleType: string }>(
        "SELECT ur.roleId, r.roleType FROM user_roles ur JOIN roles r ON ur.roleId = r.id WHERE ur.userId = ? AND ur.roleId = ?",
        [userId, requestedRoleId]
      );
      if (!assignment) {
        return res.status(403).json({ error: "Access denied: Role not assigned to user" });
      }
      activeRoleId = assignment.roleId;
      activeRoleType = assignment.roleType;
    } else {
      // Default to user's first/primary assigned role
      const primary = await db.get<{ roleId: number; roleType: string }>(
        "SELECT ur.roleId, r.roleType FROM user_roles ur JOIN roles r ON ur.roleId = r.id WHERE ur.userId = ? ORDER BY ur.id ASC LIMIT 1",
        [userId]
      );
      if (!primary) {
        // Fallback to legacy column if user_roles mapping is missing
        const fallback = await db.get<{ roleId: number; roleType: string }>(
          "SELECT u.roleId, r.roleType FROM users u JOIN roles r ON u.roleId = r.id WHERE u.id = ?",
          [userId]
        );
        if (!fallback) {
          return res.status(404).json({ error: "User role configuration not found" });
        }
        activeRoleId = fallback.roleId;
        activeRoleType = fallback.roleType;
      } else {
        activeRoleId = primary.roleId;
        activeRoleType = primary.roleType;
      }
    }

    let menus: any[] = [];
    if (activeRoleType === 'admin') {
      // Admin gets all active menus
      menus = await db.all("SELECT * FROM menus WHERE status = 1 ORDER BY menuOrder ASC");
    } else {
      // Non-admin gets active menus mapped to their active role
      const permitted = await db.all(
        `SELECT m.* FROM menus m
         JOIN role_menu_permissions rmp ON m.id = rmp.menuId
         WHERE rmp.roleId = ? AND m.status = 1`,
         [activeRoleId]
      );

      // Collect parents
      const parentIds = new Set<string>();
      permitted.forEach((m: any) => {
        if (m.parentId) parentIds.add(m.parentId);
      });

      // Add missing parent categories
      const allMenus = [...permitted];
      for (const pId of parentIds) {
        if (!allMenus.some((m: any) => m.menuId === pId)) {
          const parentMenu = await db.get("SELECT * FROM menus WHERE menuId = ? AND status = 1", [pId]);
          if (parentMenu) {
            allMenus.push(parentMenu);
          }
        }
      }

      // Sort by order
      allMenus.sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0));
      menus = allMenus;
    }

    res.json(menus);
  } catch (error) {
    console.error("GetUserMenus error", error);
    res.status(500).json({ error: "Error fetching user menus" });
  }
};

// CRUD: Get all menus (Admin/Manager or Superadmin only)
export const getMenus = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
    if (payload.role === 'superadmin') {
      // Superadmin gets all menus regardless of status
      const menus = await db.all("SELECT * FROM menus ORDER BY menuOrder ASC");
      return res.json(menus);
    }

    // Otherwise, check if user has admin/manager roles under a tenant (only active menus)
    const user = await db.get<{ roleType: string }>(
      "SELECT r.roleType FROM users u JOIN roles r ON u.roleId = r.id WHERE u.id = ?",
      [payload.id]
    );
    if (!user || (user.roleType !== 'admin' && user.roleType !== 'manager')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const menus = await db.all("SELECT * FROM menus WHERE status = 1 ORDER BY menuOrder ASC");
    res.json(menus);
  } catch (error) {
    console.error("GetMenus error", error);
    res.status(500).json({ error: "Error fetching menus" });
  }
};

// CRUD: Create new menu item (Superadmin only)
export const createMenu = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }

    const { menuId, name, icon, path, parentId, menuOrder, status } = req.body;
    if (!menuId || !name) {
      return res.status(400).json({ error: "menuId and name are required" });
    }

    const statusVal = status === false || status === 0 ? 0 : 1;

    const result = await db.run(
      "INSERT INTO menus (menuId, name, icon, path, parentId, menuOrder, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [menuId, name, icon || null, path || null, parentId || null, menuOrder || 0, statusVal]
    );

    const newMenu = await db.get("SELECT * FROM menus WHERE id = ?", [result.lastID]);
    res.status(201).json(newMenu);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: menus.menuId')) {
      return res.status(409).json({ error: `A menu with the key "${req.body.menuId}" already exists.` });
    }
    console.error("CreateMenu error", error);
    res.status(500).json({ error: "Error creating menu" });
  }
};

// CRUD: Update menu item (Superadmin only)
export const updateMenu = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    const { id } = req.params;
    const { menuId, name, icon, path, parentId, menuOrder, status } = req.body;
    if (!menuId || !name) {
      return res.status(400).json({ error: "menuId and name are required" });
    }

    const statusVal = status === false || status === 0 ? 0 : 1;

    await db.run(
      "UPDATE menus SET menuId = ?, name = ?, icon = ?, path = ?, parentId = ?, menuOrder = ?, status = ? WHERE id = ?",
      [menuId, name, icon || null, path || null, parentId || null, menuOrder || 0, statusVal, id]
    );

    const updatedMenu = await db.get("SELECT * FROM menus WHERE id = ?", [id]);
    res.json(updatedMenu);
  } catch (error) {
    console.error("UpdateMenu error", error);
    res.status(500).json({ error: "Error updating menu" });
  }
};

// CRUD: Delete menu item (Superadmin only)
export const deleteMenu = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    if (!isSuperAdminRequest(req)) {
      return res.status(403).json({ error: "Access denied. Superadmin only." });
    }
    const { id } = req.params;
    await db.run("DELETE FROM menus WHERE id = ?", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("DeleteMenu error", error);
    res.status(500).json({ error: "Error deleting menu" });
  }
};
