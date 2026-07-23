import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getDatabase } from '../database';
import {
  sendRegistrationPaymentEmail,
  sendAmcPaymentEmail,
  sendTenantBroadcastMessageEmail
} from '../utils/mailer';
import { runSeeders } from '../seeders';

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
    const tenants = await db.all("SELECT id, name, subdomain, adminEmail, createdDate, isActive, paymentStatus, paymentDate, address, phone, invoiceno, amount, gst, gstamount FROM tenants ORDER BY createdDate DESC");
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

export const updateTenantDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, adminEmail, subdomain, paymentStatus, isActive, address, phone } = req.body;

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

    // Check subdomain uniqueness if changed
    if (subdomain && subdomain.toLowerCase().trim() !== tenant.subdomain.toLowerCase()) {
      const existing = await db.get("SELECT id FROM tenants WHERE LOWER(subdomain) = ? AND id != ?", [subdomain.toLowerCase().trim(), id]);
      if (existing) {
        return res.status(400).json({ error: 'Subdomain is already taken by another organization.' });
      }
    }

    const newName = name?.trim() || tenant.name;
    const newAdminEmail = adminEmail?.trim() || tenant.adminEmail;
    const newSubdomain = subdomain?.toLowerCase().trim() || tenant.subdomain;
    const newPaymentStatus = paymentStatus || tenant.paymentStatus;
    const newIsActive = (isActive === 0 || isActive === 1) ? isActive : tenant.isActive;
    const newAddress = address !== undefined ? address : (tenant.address || '');
    const newPhone = phone !== undefined ? phone : (tenant.phone || '');

    let newAmount = tenant.amount || 0;
    let newGst = tenant.gst || 0;
    let newGstAmount = tenant.gstamount || 0;
    let newInvoiceNo = tenant.invoiceno;

    if (newPaymentStatus === 'Paid' && tenant.paymentStatus !== 'Paid') {
      const pricing = await db.get("SELECT price, tax FROM pricedetails LIMIT 1");
      const basePrice = pricing ? Number(pricing.price) || 0 : 0;
      newGst = pricing ? Number(pricing.tax) || 0 : 0;
      newGstAmount = basePrice * (newGst / 100);
      newAmount = basePrice + newGstAmount;
      if (!newInvoiceNo) {
        newInvoiceNo = `INV-${new Date().getFullYear()}${String(id).padStart(4, '0')}`;
      }
    }

    await db.run(
      "UPDATE tenants SET name = ?, adminEmail = ?, subdomain = ?, paymentStatus = ?, isActive = ?, address = ?, phone = ?, amount = ?, gst = ?, gstamount = ?, invoiceno = ? WHERE id = ?",
      [newName, newAdminEmail, newSubdomain, newPaymentStatus, newIsActive, newAddress, newPhone, newAmount, newGst, newGstAmount, newInvoiceNo, id]
    );

    return res.json({
      success: true,
      message: 'Tenant details updated successfully.',
      tenant: {
        id,
        name: newName,
        adminEmail: newAdminEmail,
        subdomain: newSubdomain,
        paymentStatus: newPaymentStatus,
        isActive: newIsActive,
        address: newAddress,
        phone: newPhone,
        amount: newAmount,
        gst: newGst,
        gstamount: newGstAmount,
        invoiceno: newInvoiceNo
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update tenant details.' });
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
    const paymentDateStr = paymentDateObj.toISOString().slice(0, 19).replace('T', ' ');
    
    // Calculate 1 year from payment date for AMC due date
    const dueDateObj = new Date(paymentDateObj);
    dueDateObj.setFullYear(paymentDateObj.getFullYear() + 1);
    const dueDateStr = dueDateObj.toISOString().slice(0, 10);

    // Fetch pricing details to calculate GST and total amount
    let pricing = await db.get("SELECT price, tax, amc FROM pricedetails LIMIT 1");
    const amcCharge = pricing ? pricing.amc : 0;
    const basePrice = pricing ? Number(pricing.price) || 0 : 0;
    const gstPercent = pricing ? Number(pricing.tax) || 0 : 0;
    const gstAmount = basePrice * (gstPercent / 100);
    const totalAmountPaid = basePrice + gstAmount;
    const invoiceNo = tenant.invoiceno || `INV-${new Date().getFullYear()}${String(id).padStart(4, '0')}`;

    await db.exec("BEGIN TRANSACTION;");
    try {
      // 1. Update tenant payment fields with amount, gst, gstamount, invoiceno
      await db.run(
        "UPDATE tenants SET paymentStatus = 'Paid', paymentDate = ?, amount = ?, gst = ?, gstamount = ?, invoiceno = ? WHERE id = ?",
        [paymentDateStr, totalAmountPaid, gstPercent, gstAmount, invoiceNo, id]
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

    // Trigger Registration Payment Email Confirmation
    if (tenant.adminEmail) {
      let pricing = await db.get("SELECT price, tax FROM pricedetails LIMIT 1");
      const price = pricing ? pricing.price : 0;
      const tax = pricing ? pricing.tax : 0;
      const totalAmount = price + (price * (tax / 100));

      const port = req.headers.host?.includes(':') ? `:${req.headers.host.split(':')[1]}` : '';
      const domainHost = req.hostname.includes('.') ? req.hostname.split('.').slice(1).join('.') : req.hostname;
      const loginUrl = `http://${tenant.subdomain}.${domainHost}${port}/user/login`;

      sendRegistrationPaymentEmail({
        to: tenant.adminEmail,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        amount: totalAmount,
        paidDate: paymentDateStr.slice(0, 10),
        loginUrl
      }).catch(err => console.error('Failed to send registration email:', err));
    }

    return res.json({
      success: true,
      message: 'Tenant registration payment recorded and AMC bill generated.',
      paymentStatus: 'Paid',
      paymentDate: paymentDateStr
    });
  } catch (error) {
    console.error('Confirm tenant payment error:', error);
    return res.status(500).json({ error: 'Failed to record tenant registration payment.' });
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

    const paidDateObj = new Date();
    const paidDate = paidDateObj.toISOString().slice(0, 19).replace('T', ' ');

    let pricingDetails = await db.get("SELECT tax FROM pricedetails LIMIT 1");
    const amcGstPercent = pricingDetails ? Number(pricingDetails.tax) || 0 : 0;
    const amcGstAmount = (Number(record.amcCharge) || 0) * (amcGstPercent / 100);
    const amcInvoiceNo = record.invoiceno || `AMC-INV-${new Date().getFullYear()}${String(id).padStart(4, '0')}`;

    await db.run(
      "UPDATE amcdetails SET paidStatus = 'Paid', paidDate = ?, invoiceno = ?, gst = ?, gstamount = ? WHERE id = ?",
      [paidDate, amcInvoiceNo, amcGstPercent, amcGstAmount, id]
    );

    // Rule: If previous due date is already passed (overdue), set next due date 1 year from paidDate.
    // Otherwise, set next due date 1 year from previous due date.
    const prevDueDateObj = record.dueDate ? new Date(record.dueDate) : paidDateObj;
    const isOverdue = prevDueDateObj.getTime() < paidDateObj.getTime();
    const baseDateForNextDue = isOverdue ? paidDateObj : prevDueDateObj;

    const nextDueDateObj = new Date(baseDateForNextDue);
    nextDueDateObj.setFullYear(baseDateForNextDue.getFullYear() + 1);
    const nextDueDateStr = nextDueDateObj.toISOString().slice(0, 10);

    const existingPending = await db.get(
      "SELECT id FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Pending' AND id != ?",
      [record.tenantId, id]
    );

    if (!existingPending) {
      let pricing = await db.get("SELECT amc FROM pricedetails LIMIT 1");
      const nextAmcCharge = pricing ? pricing.amc : record.amcCharge;
      await db.run(
        "INSERT INTO amcdetails (tenantId, amcCharge, dueDate, paidDate, paidStatus) VALUES (?, ?, ?, NULL, 'Pending')",
        [record.tenantId, nextAmcCharge, nextDueDateStr]
      );
    }

    // Trigger AMC Payment Receipt Email
    const tenant = await db.get("SELECT name, subdomain, adminEmail FROM tenants WHERE id = ?", [record.tenantId]);
    if (tenant && tenant.adminEmail) {
      sendAmcPaymentEmail({
        to: tenant.adminEmail,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        amcCharge: Number(record.amcCharge) || 0,
        gstPercent: amcGstPercent,
        gstAmount: amcGstAmount,
        invoiceNo: amcInvoiceNo,
        paidDate: paidDate.slice(0, 10),
        nextDueDate: nextDueDateStr
      }).catch(err => console.error('Failed to send AMC email:', err));
    }

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

export const sendTenantBroadcastMail = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { sendToAll, tenantIds, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message body are required.' });
    }

    const db = getDatabase();
    let recipients: { id: number; name: string; adminEmail: string }[] = [];

    if (sendToAll) {
      // Fetch all active tenants
      recipients = await db.all("SELECT id, name, adminEmail FROM tenants WHERE isActive = 1 AND adminEmail IS NOT NULL AND adminEmail != ''");
    } else {
      if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
        return res.status(400).json({ error: 'Please select at least one tenant organization.' });
      }
      const placeholders = tenantIds.map(() => '?').join(',');
      recipients = await db.all(`SELECT id, name, adminEmail FROM tenants WHERE id IN (${placeholders}) AND adminEmail IS NOT NULL AND adminEmail != ''`, tenantIds);
    }

    if (recipients.length === 0) {
      return res.status(404).json({ error: 'No valid recipient email addresses found for selection.' });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const result = await sendTenantBroadcastMessageEmail({
        to: recipient.adminEmail,
        tenantName: recipient.name,
        subject: subject.trim(),
        messageBody: message
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        errors.push(`${recipient.name} (${recipient.adminEmail}): ${result.error}`);
      }
    }

    return res.json({
      success: true,
      message: `Mail dispatched to ${successCount} organization(s). ${failCount > 0 ? `${failCount} failed.` : ''}`,
      totalRecipients: recipients.length,
      successCount,
      failCount,
      errors
    });
  } catch (error: any) {
    console.error('Send tenant broadcast mail error:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch email broadcast.' });
  }
};

export const listSmtpSettings = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const db = getDatabase();
    const records = await db.all("SELECT id, server, username, port, encryption, password, status FROM smtp_settings ORDER BY id DESC");
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch SMTP settings.' });
  }
};

export const createSmtpSetting = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { server, username, port, encryption, password, status } = req.body;
    if (!server || !username || !password) {
      return res.status(400).json({ error: 'Server, username, and password are required.' });
    }

    const db = getDatabase();
    const shouldBeActive = status === 'Active';

    await db.exec("BEGIN TRANSACTION;");
    try {
      if (shouldBeActive) {
        await db.run("UPDATE smtp_settings SET status = 'Inactive'");
      }
      const resInsert = await db.run(
        "INSERT INTO smtp_settings (server, username, port, encryption, password, status) VALUES (?, ?, ?, ?, ?, ?)",
        [server.trim(), username.trim(), Number(port) || 587, encryption || 'STARTTLS', password, shouldBeActive ? 'Active' : 'Inactive']
      );
      await db.exec("COMMIT;");
      return res.json({ success: true, message: 'SMTP settings created successfully.', id: resInsert.lastID });
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create SMTP setting.' });
  }
};

export const updateSmtpSetting = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { id } = req.params;
    const { server, username, port, encryption, password, status } = req.body;

    const db = getDatabase();
    const existing = await db.get("SELECT * FROM smtp_settings WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: 'SMTP setting not found.' });

    const shouldBeActive = status === 'Active';

    await db.exec("BEGIN TRANSACTION;");
    try {
      if (shouldBeActive) {
        await db.run("UPDATE smtp_settings SET status = 'Inactive'");
      }
      await db.run(
        "UPDATE smtp_settings SET server = ?, username = ?, port = ?, encryption = ?, password = ?, status = ? WHERE id = ?",
        [
          server?.trim() || existing.server,
          username?.trim() || existing.username,
          Number(port) || existing.port,
          encryption || existing.encryption,
          password || existing.password,
          shouldBeActive ? 'Active' : 'Inactive',
          id
        ]
      );
      await db.exec("COMMIT;");
      return res.json({ success: true, message: 'SMTP settings updated successfully.' });
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update SMTP setting.' });
  }
};

export const activateSmtpSetting = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { id } = req.params;
    const db = getDatabase();

    await db.exec("BEGIN TRANSACTION;");
    try {
      await db.run("UPDATE smtp_settings SET status = 'Inactive'");
      await db.run("UPDATE smtp_settings SET status = 'Active' WHERE id = ?", [id]);
      await db.exec("COMMIT;");
      return res.json({ success: true, message: 'SMTP configuration activated successfully.' });
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to activate SMTP setting.' });
  }
};

export const deleteSmtpSetting = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { id } = req.params;
    const db = getDatabase();
    const existing = await db.get("SELECT * FROM smtp_settings WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: 'SMTP setting not found.' });

    await db.exec("BEGIN TRANSACTION;");
    try {
      await db.run("DELETE FROM smtp_settings WHERE id = ?", [id]);
      if (existing.status === 'Active') {
        const remaining = await db.get("SELECT id FROM smtp_settings ORDER BY id DESC LIMIT 1");
        if (remaining) {
          await db.run("UPDATE smtp_settings SET status = 'Active' WHERE id = ?", [remaining.id]);
        }
      }
      await db.exec("COMMIT;");
      return res.json({ success: true, message: 'SMTP setting deleted successfully.' });
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete SMTP setting.' });
  }
};

export const testSmtpConnection = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Access denied.' });

    const { id } = req.params;
    const { testEmail } = req.body;
    if (!testEmail) {
      return res.status(400).json({ error: 'Recipient test email address is required.' });
    }

    const db = getDatabase();
    const config = await db.get("SELECT * FROM smtp_settings WHERE id = ?", [id]);
    if (!config) {
      return res.status(404).json({ error: 'SMTP setting not found.' });
    }

    const isSsl = Number(config.port) === 465;
    const transporter = nodemailer.createTransport({
      host: config.server,
      port: Number(config.port) || 587,
      secure: isSsl,
      auth: {
        user: config.username,
        pass: config.password || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const subject = `🧪 SMTP Connection Test - CapitalTrust`;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; padding-bottom: 16px; border-b: 1px solid #1e293b;">
          <h2 style="color: #10b981; margin: 0; font-size: 20px;">SMTP Test Succeeded</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            This email confirms that your SMTP server configuration on CapitalTrust is correct and able to dispatch messages successfully.
          </p>
          <div style="background-color: #111827; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; font-family: monospace;">
            Host: ${config.server}<br/>
            Port: ${config.port}<br/>
            User: ${config.username}<br/>
            Encryption: ${config.encryption}
          </div>
        </div>
        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          &copy; ${new Date().getFullYear()} CapitalTrust Platform.
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"CapitalTrust Test" <${config.username}>`,
      to: testEmail,
      subject,
      html
    });

    return res.json({ success: true, message: `SMTP connection test succeeded! Test mail dispatched to ${testEmail}.` });
  } catch (error: any) {
    console.error('SMTP test connection error:', error);
    return res.status(500).json({ error: error.message || 'SMTP Connection failed.' });
  }
};

export const resetFullData = async (req: Request, res: Response) => {
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

    await db.run("BEGIN TRANSACTION");
    try {
      // 1. Delete all operational data across all tenants
      await db.exec("DELETE FROM LoanPayment;");
      await db.exec("DELETE FROM LoanDue;");
      await db.exec("DELETE FROM LoanInterestSlab;");
      await db.exec("DELETE FROM LoanMember;");
      await db.exec("DELETE FROM Loan;");
      await db.exec("DELETE FROM MemberCollection;");
      await db.exec("DELETE FROM FundCollectionGroup;");
      await db.exec("DELETE FROM CollectionType;");
      await db.exec("DELETE FROM transactions;");
      await db.exec("DELETE FROM expenses;");
      await db.exec("DELETE FROM contributions;");
      await db.exec("DELETE FROM user_push_tokens;");
      await db.exec("DELETE FROM password_reset_tokens;");
      await db.exec("DELETE FROM role_menu_permissions;");
      await db.exec("DELETE FROM user_roles;");
      await db.exec("DELETE FROM users;");
      await db.exec("DELETE FROM roles;");
      await db.exec("DELETE FROM menus;");
      await db.exec("DELETE FROM company_settings;");

      // 2. Delete all non-demo tenant details and AMC records
      await db.exec("DELETE FROM amcdetails WHERE tenantId != 1;");
      await db.exec("DELETE FROM tenants WHERE id != 1 AND LOWER(subdomain) != 'demo';");

      // 3. Reset demo tenant 1 status
      await db.exec("UPDATE tenants SET name = 'CapitalTrust Demo', subdomain = 'demo', isActive = 1, paymentStatus = 'Paid' WHERE id = 1 OR LOWER(subdomain) = 'demo';");

      await db.run("COMMIT");
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }

    // Re-seed default application data for the demo tenant
    await runSeeders(db);

    return res.json({
      success: true,
      message: 'Full system data and all non-demo tenant details have been reset to default initial state.'
    });
  } catch (error: any) {
    console.error('Reset full data error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reset system data.' });
  }
};

export const getGlobalCompanyDetails = async (req: Request, res: Response) => {
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
    let settings = await db.get("SELECT companyName, companyLogo, supportEmail, supportPhone, address, gstno, ismaintanance, message, resumetime FROM company_settings LIMIT 1");
    if (!settings) {
      settings = {
        companyName: 'CapitalTrust',
        companyLogo: '',
        supportEmail: 'support@capitaltrust.com',
        supportPhone: '',
        address: '',
        gstno: '',
        ismaintanance: false,
        message: '',
        resumetime: ''
      };
    } else {
      settings = {
        ...settings,
        ismaintanance: Boolean(settings.ismaintanance),
        message: settings.message || '',
        resumetime: settings.resumetime || ''
      };
    }

    return res.json(settings);
  } catch (error) {
    console.error('Get global company details error:', error);
    return res.status(500).json({ error: 'Failed to fetch global company details.' });
  }
};

export const updateGlobalCompanyDetails = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }

    const { companyName, companyLogo, supportEmail, supportPhone, address, gstno, ismaintanance, message, resumetime } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    const isMaintBool = Boolean(ismaintanance) ? 1 : 0;
    const maintMsg = message ? String(message) : '';
    const resumeVal = resumetime ? String(resumetime) : '';

    const db = getDatabase();
    const existing = await db.get("SELECT id FROM company_settings LIMIT 1");

    if (existing) {
      await db.run(
        "UPDATE company_settings SET companyName = ?, companyLogo = ?, supportEmail = ?, supportPhone = ?, address = ?, gstno = ?, ismaintanance = ?, message = ?, resumetime = ? WHERE id = ?",
        [companyName.trim(), companyLogo || '', supportEmail || '', supportPhone || '', address || '', gstno || '', isMaintBool, maintMsg, resumeVal, existing.id]
      );
    } else {
      await db.run(
        "INSERT INTO company_settings (companyName, companyLogo, supportEmail, supportPhone, address, gstno, ismaintanance, message, resumetime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [companyName.trim(), companyLogo || '', supportEmail || '', supportPhone || '', address || '', gstno || '', isMaintBool, maintMsg, resumeVal]
      );
    }

    let updated = await db.get("SELECT companyName, companyLogo, supportEmail, supportPhone, address, gstno, ismaintanance, message, resumetime FROM company_settings LIMIT 1");
    if (updated) {
      updated = {
        ...updated,
        ismaintanance: Boolean(updated.ismaintanance),
        message: updated.message || '',
        resumetime: updated.resumetime || ''
      };
    }
    return res.json({
      success: true,
      message: 'Global company details updated successfully.',
      companyDetails: updated
    });
  } catch (error: any) {
    console.error('Update global company details error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update global company details.' });
  }
};

