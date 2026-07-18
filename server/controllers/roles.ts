import { Request, Response } from 'express';
import { RoleModel } from '../models/Role';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await RoleModel.listAll();
    res.json(roles);
  } catch (error) {
    console.error("Get roles error", error);
    res.status(500).json({ error: "Error fetching roles" });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { roleName, roleType } = req.body;
    if (!roleName || !roleType) {
      return res.status(400).json({ error: "roleName and roleType are required" });
    }
    const result = await RoleModel.create(roleName, roleType);
    const newRole = await RoleModel.findById(Number(result.lastID));
    res.status(201).json(newRole);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ error: `A role with the name "${req.body.roleName}" already exists.` });
    }
    console.error("Create role error", error);
    res.status(500).json({ error: "Error creating role" });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleName, roleType } = req.body;
    if (!roleName || !roleType) {
      return res.status(400).json({ error: "roleName and roleType are required" });
    }
    await RoleModel.update(Number(id), roleName, roleType);
    const updatedRole = await RoleModel.findById(Number(id));
    res.json(updatedRole);
  } catch (error) {
    console.error("Update role error", error);
    res.status(500).json({ error: "Error updating role" });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await RoleModel.delete(Number(id));
    res.status(204).send();
  } catch (error) {
    console.error("Delete role error", error);
    res.status(500).json({ error: "Error deleting role" });
  }
};
