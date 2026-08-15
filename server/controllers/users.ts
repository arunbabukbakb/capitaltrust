import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const users = await UserModel.listByTenant(tenantId);
    const userRoles = await UserModel.listUserRolesByTenant(tenantId);

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
  try {
    const {
      memberNumber, fullName, email, username, phoneNumber, alternateNumber,
      gender, dob, joiningDate, address, country, state, district, locality, pincode,
      idType, idNumber, bankName, bankBranch, accountNumber, ifsc,
      nomineeName, relationship, nomineeContact, occupation, notes, profileImage,
      roleId, roleIds
    } = req.body;
    const finalRoleIds: number[] = Array.isArray(roleIds) ? roleIds : (roleId ? [Number(roleId)] : []);

    if (!fullName || !email || !username || finalRoleIds.length === 0) {
      return res.status(400).json({ error: "fullName, email, username, and roleIds are required" });
    }

    const rolesInfo = await Promise.all(
      finalRoleIds.map(id => RoleModel.findById(id))
    );
    const validRoles = rolesInfo.filter((r): r is any => !!r);
    if (validRoles.length === 0) {
      return res.status(400).json({ error: "Invalid roleIds" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    const db = getDatabase();
    const tenantObj = await db.get("SELECT maxUserLimit FROM tenants WHERE id = ?", [tenantId]);
    const maxUserLimit = (tenantObj && tenantObj.maxUserLimit) ? Number(tenantObj.maxUserLimit) : 25;

    const tenantUserCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE tenantId = ?", [tenantId]);
    const currentUsers = tenantUserCount ? tenantUserCount.count : 0;

    if (currentUsers >= maxUserLimit) {
      return res.status(403).json({
        error: `User limit reached: This organization has reached its maximum allowed limit of ${maxUserLimit} members. Please upgrade member capacity to add more users.`
      });
    }

    const hasAdminRole = validRoles.some(r => r.roleType === 'admin');
    if (hasAdminRole) {
      const existingAdmin = await UserModel.checkAdminExists(tenantId);
      if (existingAdmin) {
        return res.status(400).json({ error: "Only one user can have the Administrator role." });
      }
    }

    const primaryRole = validRoles[0];
    const id = `CT-${Math.floor(40000 + Math.random() * 20000)}`;

    await db.run("BEGIN TRANSACTION;");
    try {
      await UserModel.create({
        id,
        memberNumber: memberNumber || undefined,
        fullName,
        email,
        username,
        role: primaryRole.roleType,
        phoneNumber: phoneNumber || undefined,
        alternateNumber: alternateNumber || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
        joiningDate: joiningDate || undefined,
        address: address || undefined,
        country: country || undefined,
        state: state || undefined,
        district: district || undefined,
        locality: locality || undefined,
        pincode: pincode || undefined,
        idType: idType || undefined,
        idNumber: idNumber || undefined,
        bankName: bankName || undefined,
        bankBranch: bankBranch || undefined,
        accountNumber: accountNumber || undefined,
        ifsc: ifsc || undefined,
        nomineeName: nomineeName || undefined,
        relationship: relationship || undefined,
        nomineeContact: nomineeContact || undefined,
        occupation: occupation || undefined,
        notes: notes || undefined,
        profileImage: profileImage || undefined,
        roleId: primaryRole.id,
        tenantId
      });

      for (const rId of finalRoleIds) {
        await UserModel.assignRole(id, rId);
      }
      await db.run("COMMIT;");
    } catch (txErr) {
      await db.run("ROLLBACK;");
      throw txErr;
    }

    const newUser = await UserModel.findById(id);
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ error: `A user with the email/username is already registered under this workspace.` });
    }
    console.error("Create user error", error);
    res.status(500).json({ error: "Error creating user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      memberNumber, fullName, email, username, phoneNumber, alternateNumber,
      gender, dob, joiningDate, address, country, state, district, locality, pincode,
      idType, idNumber, bankName, bankBranch, accountNumber, ifsc,
      nomineeName, relationship, nomineeContact, occupation, notes, profileImage,
      roleId, roleIds, status
    } = req.body;
    const finalRoleIds: number[] = Array.isArray(roleIds) ? roleIds : (roleId ? [Number(roleId)] : []);

    if (!fullName || !email || !username || finalRoleIds.length === 0) {
      return res.status(400).json({ error: "fullName, email, username and roleIds are required" });
    }

    const rolesInfo = await Promise.all(
      finalRoleIds.map(rId => RoleModel.findById(rId))
    );
    const validRoles = rolesInfo.filter((r): r is any => !!r);
    if (validRoles.length === 0) {
      return res.status(400).json({ error: "Invalid roleIds" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    const hasAdminRole = validRoles.some(r => r.roleType === 'admin');
    if (hasAdminRole) {
      const existingAdmin = await UserModel.checkAdminExists(tenantId, id);
      if (existingAdmin) {
        return res.status(400).json({ error: "Only one user can have the Administrator role." });
      }
    }

    const primaryRole = validRoles[0];

    const db = getDatabase();
    await db.run("BEGIN TRANSACTION;");
    try {
      await UserModel.update(id, {
        memberNumber: memberNumber || null,
        fullName,
        email,
        username,
        phoneNumber: phoneNumber || null,
        alternateNumber: alternateNumber || null,
        gender: gender || null,
        dob: dob || null,
        joiningDate: joiningDate || null,
        address: address || null,
        country: country || null,
        state: state || null,
        district: district || null,
        locality: locality || null,
        pincode: pincode || null,
        idType: idType || null,
        idNumber: idNumber || null,
        bankName: bankName || null,
        bankBranch: bankBranch || null,
        accountNumber: accountNumber || null,
        ifsc: ifsc || null,
        nomineeName: nomineeName || null,
        relationship: relationship || null,
        nomineeContact: nomineeContact || null,
        occupation: occupation || null,
        notes: notes || null,
        profileImage: profileImage !== undefined ? profileImage : null,
        roleId: primaryRole.id,
        role: primaryRole.roleType,
        status: status === true || status === 1 ? 1 : 0
      });

      await UserModel.clearRoles(id);
      for (const rId of finalRoleIds) {
        await UserModel.assignRole(id, rId);
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
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: "Cannot delete an admin user" });
    }
    await UserModel.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error("Delete user error", error);
    res.status(500).json({ error: "Error deleting user" });
  }
};
