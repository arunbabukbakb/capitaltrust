import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getDatabase } from '../database';
import { TenantModel } from '../models/Tenant';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';

export const registerTenant = async (req: Request, res: Response) => {
  try {
    const { companyName, subdomain, adminName, adminEmail, adminUsername, adminPassword } = req.body;

    if (!companyName || !subdomain || !adminName || !adminEmail || !adminUsername || !adminPassword) {
      return res.status(400).json({ error: "Missing required fields: companyName, subdomain, adminName, adminEmail, adminUsername, adminPassword" });
    }

    const subdomainClean = subdomain.trim().toLowerCase();
    const adminEmailClean = adminEmail.trim().toLowerCase();
    const adminUsernameClean = adminUsername.trim().toLowerCase();

    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomainClean)) {
      return res.status(400).json({ error: "Subdomain can only contain lowercase letters, numbers, and hyphens." });
    }

    const reservedSubdomains = ['www', 'mail', 'api', 'admin', 'portal', 'dashboard', 'localhost', 'capitaltrust'];
    if (reservedSubdomains.includes(subdomainClean)) {
      return res.status(400).json({ error: "This subdomain is reserved and cannot be registered." });
    }

    const existingTenant = await TenantModel.findBySubdomain(subdomainClean);
    if (existingTenant) {
      return res.status(400).json({ error: "This subdomain is already taken." });
    }

    const existingUser = await UserModel.findByUsernameOrEmail(adminUsernameClean, subdomainClean) || await UserModel.findByUsernameOrEmail(adminEmailClean, subdomainClean);
    if (existingUser) {
      return res.status(400).json({ error: "An administrator account with this username or email already exists under this tenant." });
    }

    const tenantCount = await TenantModel.findById(subdomainClean); // checking by count
    const activeTenantCount = await getDatabase().get<{ count: number }>("SELECT COUNT(*) as count FROM tenants");
    const nextTenantNo = 10001 + (activeTenantCount?.count || 0);
    const tenantId = `T-${nextTenantNo}`;

    const adminRole = await RoleModel.findByRoleType('admin');
    if (!adminRole) {
      return res.status(500).json({ error: "System roles are not seeded. Please contact system support." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const countRes = await UserModel.countByPrefix('CT-');
    const nextIdNumber = 55001 + countRes;
    const userId = `CT-${nextIdNumber}`;

    const createdDate = new Date().toISOString();

    const db = getDatabase();
    await db.exec("BEGIN TRANSACTION;");
    try {
      await TenantModel.create({
        id: tenantId,
        name: companyName.trim(),
        subdomain: subdomainClean,
        adminEmail: adminEmailClean,
        createdDate
      });

      await UserModel.create({
        id: userId,
        fullName: adminName.trim(),
        email: adminEmailClean,
        username: adminUsernameClean,
        role: 'admin',
        password: hashedPassword,
        status: 1,
        roleId: adminRole.id,
        tenantId: subdomainClean
      });

      await UserModel.assignRole(userId, adminRole.id);

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    return res.status(201).json({
      message: "Organization registered successfully!",
      subdomain: subdomainClean,
      tenantId
    });

  } catch (error: any) {
    console.error("Tenant registration error:", error);
    return res.status(500).json({ error: "Internal server error during tenant registration" });
  }
};
