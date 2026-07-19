import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

export const superAdminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = getDatabase();
    const admin = await db.get("SELECT * FROM superadmins WHERE username = ?", [username.toLowerCase().trim()]);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid superadmin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid superadmin credentials.' });
    }

    // Generate JWT token with superadmin role
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    return res.json({
      message: 'Superadmin login successful.',
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        role: 'superadmin'
      },
      token
    });
  } catch (error) {
    console.error('Superadmin login error:', error);
    return res.status(500).json({ error: 'Internal server error during superadmin login.' });
  }
};

export const getSuperAdminProfile = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    const admin = await db.get("SELECT id, username, email, fullName FROM superadmins WHERE id = ?", [decoded.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Superadmin profile not found.' });
    }

    return res.json({
      user: {
        ...admin,
        role: 'superadmin'
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const listTenants = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    const tenants = await db.all("SELECT id, name, subdomain, adminEmail, createdDate, isActive, paymentStatus, paymentDate FROM tenants ORDER BY createdDate DESC");
    return res.json(tenants);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const toggleTenantStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    if (isActive !== 0 && isActive !== 1) {
      return res.status(400).json({ error: 'Invalid active status. Must be 0 or 1.' });
    }

    const db = getDatabase();
    const tenant = await db.get("SELECT * FROM tenants WHERE id = ?", [id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    await db.run("UPDATE tenants SET isActive = ? WHERE id = ?", [isActive, id]);

    return res.json({
      success: true,
      message: `Tenant status updated successfully to ${isActive ? 'Active' : 'Suspended'}.`,
      tenantId: id,
      isActive
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const updateSuperAdminProfile = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const { fullName, email, password } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }

    const db = getDatabase();

    // Check if email already used by another superadmin
    const emailCheck = await db.get("SELECT id FROM superadmins WHERE email = ? AND id != ?", [email.toLowerCase().trim(), decoded.id]);
    if (emailCheck) {
      return res.status(400).json({ error: 'Email is already in use by another super administrator.' });
    }

    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run(
        "UPDATE superadmins SET fullName = ?, email = ?, password = ? WHERE id = ?",
        [fullName.trim(), email.toLowerCase().trim(), hashedPassword, decoded.id]
      );
    } else {
      await db.run(
        "UPDATE superadmins SET fullName = ?, email = ? WHERE id = ?",
        [fullName.trim(), email.toLowerCase().trim(), decoded.id]
      );
    }

    const updatedAdmin = await db.get("SELECT id, username, email, fullName FROM superadmins WHERE id = ?", [decoded.id]);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        ...updatedAdmin,
        role: 'superadmin'
      }
    });
  } catch (error) {
    console.error('Update superadmin profile error:', error);
    return res.status(500).json({ error: 'Internal server error updating profile.' });
  }
};

export const getPriceDetails = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    let price = await db.get("SELECT * FROM pricedetails LIMIT 1");
    if (!price) {
      await db.run("INSERT INTO pricedetails (price, tax, amc) VALUES (0, 0, 0)");
      price = { id: 1, price: 0, tax: 0, amc: 0 };
    }
    return res.json(price);
  } catch (error) {
    console.error('Fetch price details error:', error);
    return res.status(500).json({ error: 'Failed to fetch price details.' });
  }
};

export const updatePriceDetails = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const { price, tax, amc } = req.body;
    const db = getDatabase();
    const existing = await db.get("SELECT id FROM pricedetails LIMIT 1");
    if (existing) {
      await db.run(
        "UPDATE pricedetails SET price = ?, tax = ?, amc = ? WHERE id = ?",
        [Number(price) || 0, Number(tax) || 0, Number(amc) || 0, existing.id]
      );
    } else {
      await db.run(
        "INSERT INTO pricedetails (price, tax, amc) VALUES (?, ?, ?)",
        [Number(price) || 0, Number(tax) || 0, Number(amc) || 0]
      );
    }
    return res.json({ success: true, message: 'Price details updated successfully.' });
  } catch (error) {
    console.error('Update price details error:', error);
    return res.status(500).json({ error: 'Failed to update price details.' });
  }
};

export const confirmTenantPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    const tenant = await db.get("SELECT * FROM tenants WHERE id = ?", [id]);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const paymentDateObj = new Date();
    const paymentDateStr = paymentDateObj.toISOString();
    
    // Calculate 1 year from payment date for AMC due date
    const dueDateObj = new Date(paymentDateObj);
    dueDateObj.setFullYear(paymentDateObj.getFullYear() + 1);
    const dueDateStr = dueDateObj.toISOString();

    // Fetch AMC charge from pricedetails table
    let pricing = await db.get("SELECT amc FROM pricedetails LIMIT 1");
    const amcCharge = pricing ? pricing.amc : 0;

    await db.exec("BEGIN TRANSACTION;");
    try {
      // 1. Update tenant payment fields
      await db.run(
        "UPDATE tenants SET paymentStatus = 'Paid', paymentDate = ? WHERE id = ?",
        [paymentDateStr, id]
      );

      // 2. Insert new AMC record
      await db.run(
        "INSERT INTO amcdetails (tenantId, amcCharge, dueDate, paidDate, paidStatus) VALUES (?, ?, ?, NULL, 'Pending')",
        [id, amcCharge, dueDateStr]
      );

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    return res.json({
      success: true,
      message: 'Tenant registration payment recorded and AMC bill generated.',
      paymentStatus: 'Paid',
      paymentDate: paymentDateStr
    });
  } catch (error) {
    console.error('Confirm tenant payment error:', error);
    return res.status(550).json({ error: 'Failed to record tenant registration payment.' });
  }
};

export const listTenantAmcRecords = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    const records = await db.all("SELECT * FROM amcdetails WHERE tenantId = ? ORDER BY dueDate DESC", [id]);
    return res.json(records);
  } catch (error) {
    console.error('List AMC records error:', error);
    return res.status(500).json({ error: 'Failed to fetch AMC billing records.' });
  }
};

export const payTenantAmcRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // amc record id
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const db = getDatabase();
    const record = await db.get("SELECT * FROM amcdetails WHERE id = ?", [id]);
    if (!record) {
      return res.status(404).json({ error: 'AMC billing record not found.' });
    }

    const paidDate = new Date().toISOString();
    await db.run(
      "UPDATE amcdetails SET paidStatus = 'Paid', paidDate = ? WHERE id = ?",
      [paidDate, id]
    );

    return res.json({
      success: true,
      message: 'AMC record successfully marked as paid.',
      paidStatus: 'Paid',
      paidDate
    });
  } catch (error) {
    console.error('Pay AMC record error:', error);
    return res.status(500).json({ error: 'Failed to record AMC payment.' });
  }
};
