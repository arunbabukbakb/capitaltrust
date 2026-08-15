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
    let globalSettings = await db.get("SELECT companyName, companyLogo, supportEmail, supportPhone, address, gstno, ismaintanance, message, resumetime FROM company_settings LIMIT 1");
    if (!globalSettings) {
      globalSettings = {
        companyName: 'CapitalTrust',
        companyLogo: '',
        supportEmail: 'contact@trustcaps.in',
        supportPhone: '916238920219',
        address: '',
        gstno: '',
        ismaintanance: false,
        message: '',
        resumetime: ''
      };
    } else {
      globalSettings = {
        ...globalSettings,
        ismaintanance: Boolean(globalSettings.ismaintanance),
        message: globalSettings.message || '',
        resumetime: globalSettings.resumetime || ''
      };
    }

    const pricing = await db.get("SELECT price, tax, amc, defaultUserLimit, additionalUserBlockSize, additionalUserBlockPrice FROM pricedetails LIMIT 1");
    const pricingObj = pricing ? {
      price: pricing.price,
      tax: pricing.tax,
      amc: pricing.amc,
      defaultUserLimit: pricing.defaultUserLimit ?? 25,
      additionalUserBlockSize: pricing.additionalUserBlockSize ?? 5,
      additionalUserBlockPrice: pricing.additionalUserBlockPrice ?? 0
    } : null;

    const tenantId = req.headers['x-tenant-id'] as string || null;
    if (tenantId) {
      const tenant = await db.get("SELECT id, name, subdomain, adminEmail, phone, address, invoiceno, amount, gst, gstamount, isActive, paymentStatus, paymentDate, logo, gstnumber, maxUserLimit FROM tenants WHERE id = ?", [tenantId]);
      if (!tenant) {
        return res.status(404).json({ error: "tenant_not_found" });
      }
      if (tenant.isActive === 0) {
        return res.status(403).json({ error: "tenant_deactivated" });
      }

      const amcRecord = await db.get(
        "SELECT id, amcCharge, dueDate, paidStatus FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Pending' ORDER BY dueDate ASC LIMIT 1",
        [tenantId]
      );

      const amcList = await db.all(
        "SELECT id, tenantId, amcCharge, dueDate, paidStatus, invoiceno, gst, gstamount FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Paid' ORDER BY dueDate DESC",
        [tenantId]
      );

      return res.json({
        companyName: globalSettings.companyName || 'CapitalTrust',
        companyLogo: globalSettings.companyLogo || '',
        supportEmail: globalSettings.supportEmail || 'contact@trustcaps.in',
        supportPhone: globalSettings.supportPhone || '',
        address: globalSettings.address || '',
        gstno: globalSettings.gstno || '',
        ismaintanance: globalSettings.ismaintanance,
        message: globalSettings.message,
        resumetime: globalSettings.resumetime,
        paymentStatus: tenant.paymentStatus,
        paymentDate: tenant.paymentDate,
        pricing: pricingObj,
        amcRecord: amcRecord ? {
          id: amcRecord.id,
          amcCharge: amcRecord.amcCharge,
          dueDate: amcRecord.dueDate,
          paidStatus: amcRecord.paidStatus
        } : null,
        tenantDetails: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          adminEmail: tenant.adminEmail,
          phone: tenant.phone || '',
          address: tenant.address || '',
          gstnumber: tenant.gstnumber || '',
          invoiceno: tenant.invoiceno || '',
          amount: tenant.amount || 0,
          gst: tenant.gst || 0,
          gstamount: tenant.gstamount || 0,
          paymentStatus: tenant.paymentStatus,
          paymentDate: tenant.paymentDate,
          logo: tenant.logo || '',
          maxUserLimit: tenant.maxUserLimit || 25
        },
        amcList: amcList || []
      });
    }

    return res.json({
      ...globalSettings,
      pricing: pricingObj
    });
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

    const { companyName, companyLogo, supportEmail, supportPhone, address, gstno, gstnumber } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const tenantGstVal = gstnumber !== undefined ? gstnumber : (gstno !== undefined ? gstno : '');

    const tenantId = req.headers['x-tenant-id'] as string || null;
    if (tenantId) {
      await db.run(
        "UPDATE tenants SET name = ?, adminEmail = ?, phone = ?, address = ?, logo = ?, gstnumber = ? WHERE id = ?",
        [companyName, supportEmail || '', supportPhone || '', address || '', companyLogo || '', tenantGstVal, tenantId]
      );
      return res.json({ message: "Company settings updated successfully" });
    }

    const existing = await db.get("SELECT id FROM company_settings LIMIT 1");
    if (existing) {
      await db.run(
        "UPDATE company_settings SET companyName = ?, companyLogo = ?, supportEmail = ?, supportPhone = ?, address = ?, gstno = ? WHERE id = ?",
        [companyName, companyLogo || '', supportEmail || '', supportPhone || '', address || '', gstno || '', existing.id]
      );
    } else {
      await db.run(
        "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone, address, gstno) VALUES (?, ?, ?, ?, ?, ?)",
        [companyName, companyLogo || '', supportEmail || '', supportPhone || '', address || '', gstno || '']
      );
    }

    res.json({ message: "Company settings updated successfully" });
  } catch (error) {
    console.error("Update company settings error", error);
    res.status(500).json({ error: "Error updating company settings" });
  }
};

export const uploadTenantLogo = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const auth = getUserIdAndRoleFromRequest(req);
    if (!auth || auth.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Only administrators can upload logo." });
    }

    const { logo, companyLogo } = req.body;
    const logoValue = logo || companyLogo || '';

    const tenantId = req.headers['x-tenant-id'] as string || null;
    if (tenantId) {
      await db.run("UPDATE tenants SET logo = ? WHERE id = ?", [logoValue, tenantId]);
      return res.json({ success: true, message: "Tenant logo updated successfully", logo: logoValue });
    } else {
      const existing = await db.get("SELECT id FROM company_settings LIMIT 1");
      if (existing) {
        await db.run("UPDATE company_settings SET companyLogo = ? WHERE id = ?", [logoValue, existing.id]);
      }
      return res.json({ success: true, message: "Company logo updated successfully", logo: logoValue });
    }
  } catch (error) {
    console.error("Upload tenant logo error", error);
    res.status(500).json({ error: "Error uploading logo" });
  }
};

function getTenantIdNumber(req: Request): number {
  const raw = req.headers['x-tenant-id'];
  const parsed = Number(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export const getOrgSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdNumber(req);
    const db = getDatabase();
    const settings = await db.get(
      "SELECT oneUserOneGroup FROM organization_settings WHERE tenantId = ?",
      [tenantId]
    );
    return res.json({
      oneUserOneGroup: settings ? Boolean(settings.oneUserOneGroup) : true
    });
  } catch (error) {
    console.error("Get organization settings error", error);
    res.status(500).json({ error: "Failed to fetch organization settings" });
  }
};

export const updateOrgSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdNumber(req);
    const { oneUserOneGroup } = req.body;
    const db = getDatabase();
    const val = oneUserOneGroup === true || oneUserOneGroup === 1 ? 1 : 0;

    const existing = await db.get("SELECT id FROM organization_settings WHERE tenantId = ?", [tenantId]);
    if (existing) {
      await db.run(
        "UPDATE organization_settings SET oneUserOneGroup = ?, updatedAt = CURRENT_TIMESTAMP WHERE tenantId = ?",
        [val, tenantId]
      );
    } else {
      await db.run(
        "INSERT INTO organization_settings (tenantId, oneUserOneGroup) VALUES (?, ?)",
        [tenantId, val]
      );
    }
    return res.json({ message: "Organization settings updated successfully", oneUserOneGroup: Boolean(val) });
  } catch (error) {
    console.error("Update organization settings error", error);
    res.status(500).json({ error: "Failed to update organization settings" });
  }
};
