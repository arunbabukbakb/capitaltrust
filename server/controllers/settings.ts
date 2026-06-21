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
