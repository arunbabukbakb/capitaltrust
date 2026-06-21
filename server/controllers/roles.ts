import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getRoles = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const roles = await db.all("SELECT * FROM roles ORDER BY id");
    res.json(roles);
  } catch (error) {
    console.error("Get roles error", error);
    res.status(500).json({ error: "Error fetching roles" });
  }
};

export const createRole = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { roleName, roleType } = req.body;
    if (!roleName || !roleType) {
      return res.status(400).json({ error: "roleName and roleType are required" });
    }
    const result = await db.run(
      "INSERT INTO roles (roleName, roleType) VALUES (?, ?)",
      [roleName, roleType]
    );
    const newRole = await db.get("SELECT * FROM roles WHERE id = ?", [result.lastID]);
    res.status(201).json(newRole);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: roles.roleName')) {
      return res.status(409).json({ error: `A role with the name "${req.body.roleName}" already exists.` });
    }
    console.error("Create role error", error);
    res.status(500).json({ error: "Error creating role" });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { roleName, roleType } = req.body;
    if (!roleName || !roleType) {
      return res.status(400).json({ error: "roleName and roleType are required" });
    }
    await db.run(
      "UPDATE roles SET roleName = ?, roleType = ? WHERE id = ?",
      [roleName, roleType, id]
    );
    const updatedRole = await db.get("SELECT * FROM roles WHERE id = ?", [id]);
    res.json(updatedRole);
  } catch (error) {
    console.error("Update role error", error);
    res.status(500).json({ error: "Error updating role" });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    await db.run("DELETE FROM roles WHERE id = ?", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Delete role error", error);
    res.status(500).json({ error: "Error deleting role" });
  }
};
