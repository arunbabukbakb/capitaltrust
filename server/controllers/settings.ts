import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

function getUserIdAndRoleFromRequest(req: Request): { id: string; role: string } | null {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    return { id: payload.id, role: payload.role };
  } catch {
    return null;
  }
}

export const getCompanySettings = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const tenantId = req.headers['x-tenant-id'] as string || null;
    if (tenantId) {
      const tenant = await db.get("SELECT name, adminEmail, isActive, paymentStatus, paymentDate FROM tenants WHERE id = ?", [tenantId]);
      if (!tenant) {
        return res.status(404).json({ error: "tenant_not_found" });
      }
      if (tenant.isActive === 0) {
        return res.status(403).json({ error: "tenant_deactivated" });
      }
      
      const pricing = await db.get("SELECT price, tax, amc FROM pricedetails LIMIT 1");
      const amcRecord = await db.get(
        "SELECT id, amcCharge, dueDate, paidStatus FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Pending' ORDER BY dueDate ASC LIMIT 1",
        [tenantId]
      );

      return res.json({
        companyName: tenant.name,
        companyLogo: '',
        supportEmail: tenant.adminEmail,
        supportPhone: '+1 (555) 555-5555',
        paymentStatus: tenant.paymentStatus,
        paymentDate: tenant.paymentDate,
        pricing: pricing ? {
          price: pricing.price,
          tax: pricing.tax,
          amc: pricing.amc
        } : null,
        amcRecord: amcRecord ? {
          id: amcRecord.id,
          amcCharge: amcRecord.amcCharge,
          dueDate: amcRecord.dueDate,
          paidStatus: amcRecord.paidStatus
        } : null
      });
    }

    let settings = await db.get("SELECT companyName, companyLogo, supportEmail, supportPhone FROM company_settings LIMIT 1");
    if (!settings) {
      settings = {
        companyName: 'CapitalTrust',
        companyLogo: '',
        supportEmail: 'support@capitaltrust.com',
        supportPhone: '+1 (555) 555-5555'
      };
    }
    res.json(settings);
  } catch (error) {
    console.error("Get company settings error", error);
    res.status(500).json({ error: "Error fetching company settings" });
  }
};

export const updateCompanySettings = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const auth = getUserIdAndRoleFromRequest(req);
    if (!auth || auth.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Only administrators can update company settings." });
    }

    const { companyName, companyLogo, supportEmail, supportPhone } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string || null;
    if (tenantId) {
      await db.run(
        "UPDATE tenants SET name = ?, adminEmail = ? WHERE id = ?",
        [companyName, supportEmail || '', tenantId]
      );
      return res.json({ message: "Company settings updated successfully" });
    }

    const existing = await db.get("SELECT id FROM company_settings LIMIT 1");
    if (existing) {
      await db.run(
        "UPDATE company_settings SET companyName = ?, companyLogo = ?, supportEmail = ?, supportPhone = ? WHERE id = ?",
        [companyName, companyLogo || '', supportEmail || '', supportPhone || '', existing.id]
      );
    } else {
      await db.run(
        "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone) VALUES (?, ?, ?, ?)",
        [companyName, companyLogo || '', supportEmail || '', supportPhone || '']
      );
    }

    res.json({ message: "Company settings updated successfully" });
  } catch (error) {
    console.error("Update company settings error", error);
    res.status(500).json({ error: "Error updating company settings" });
  }
};
