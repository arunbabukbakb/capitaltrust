import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getDatabase } from '../database';
import { sendRegistrationPaymentEmail, sendAmcPaymentEmail } from '../utils/mailer';
import { TenantModel } from '../models/Tenant';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';

const getRazorpayDetails = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (keyId && keySecret) {
    return {
      client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
      keyId,
      keySecret,
      isMock: false
    };
  }
  return {
    client: null,
    keyId: '',
    keySecret: '',
    isMock: true
  };
};

export const registerTenant = async (req: Request, res: Response) => {
  try {
    const { companyName, subdomain, phone, address, adminName, adminEmail, adminUsername, adminPassword } = req.body;

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

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const countRes = await UserModel.countByPrefix('CT-');
    const nextIdNumber = 55001 + countRes;
    const userId = `CT-${nextIdNumber}`;

    const createdDate = new Date().toISOString();

    const db = getDatabase();
    let tenantId: number | undefined;

    await db.exec("BEGIN TRANSACTION;");
    try {
      const result = await TenantModel.create({
        name: companyName.trim(),
        subdomain: subdomainClean,
        adminEmail: adminEmailClean,
        phone: phone ? phone.trim() : '',
        address: address ? address.trim() : '',
        createdDate
      });

      tenantId = result.lastID;
      if (!tenantId) {
        throw new Error("Failed to retrieve auto-incremented tenant ID");
      }

      // Create default roles for this new tenant
      const adminRoleResult = await db.run(
        "INSERT INTO roles (roleName, roleType, tenantId) VALUES (?, ?, ?)",
        ['Administrator', 'admin', tenantId]
      );
      const managerRoleResult = await db.run(
        "INSERT INTO roles (roleName, roleType, tenantId) VALUES (?, ?, ?)",
        ['Manager', 'manager', tenantId]
      );
      const memberRoleResult = await db.run(
        "INSERT INTO roles (roleName, roleType, tenantId) VALUES (?, ?, ?)",
        ['Member', 'user', tenantId]
      );

      const adminRoleId = adminRoleResult.lastID as number;
      const managerRoleId = managerRoleResult.lastID as number;
      const memberRoleId = memberRoleResult.lastID as number;

      // Seed permissions for Administrator: gets all global menus
      const allMenus = await db.all<{ id: number }[]>("SELECT id FROM menus");
      for (const menu of allMenus) {
        await db.run(
          "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
          [adminRoleId, menu.id]
        );
      }

      // Seed permissions for Manager
      const managerMenus = [
        'dashboard',
        'liquidity', 'collection-types', 'fund-collection', 'fund-collection-audit',
        'credit', 'loan-repayment', 'loan-request', 'loan-list', 'loan-entry', 'loan-repayments',
        'users', 'role-management', 'user-management', 'expenses', 'reports', 'transactions', 'member-ledger'
      ];
      for (const mId of managerMenus) {
        const menu = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = ?", [mId]);
        if (menu) {
          await db.run(
            "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
            [managerRoleId, menu.id]
          );
        }
      }

      // Seed permissions for Member
      const memberMenus = ['dashboard', 'liquidity', 'fund-collection-audit', 'credit', 'loan-repayment', 'loan-request', 'expenses', 'reports', 'transactions', 'member-ledger'];
      for (const mId of memberMenus) {
        const menu = await db.get<{ id: number }>("SELECT id FROM menus WHERE menuId = ?", [mId]);
        if (menu) {
          await db.run(
            "INSERT IGNORE INTO role_menu_permissions (roleId, menuId) VALUES (?, ?)",
            [memberRoleId, menu.id]
          );
        }
      }

      await UserModel.create({
        id: userId,
        fullName: adminName.trim(),
        email: adminEmailClean,
        username: adminUsernameClean,
        role: 'admin',
        password: hashedPassword,
        status: 1,
        roleId: adminRoleId,
        tenantId: String(tenantId)
      });

      await UserModel.assignRole(userId, adminRoleId);

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    return res.status(201).json({
      message: "Organization registered successfully!",
      subdomain: subdomainClean,
      tenantId: String(tenantId)
    });

  } catch (error: any) {
    console.error("Tenant registration error:", error);
    return res.status(500).json({ error: "Internal server error during tenant registration" });
  }
};

export const payTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant header is missing." });
    }

    const db = getDatabase();
    const tenant = await db.get("SELECT * FROM tenants WHERE id = ?", [tenantId]);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    if (tenant.paymentStatus === 'Paid') {
      return res.json({ success: true, message: "Already paid." });
    }

    function toMySQLDateTime(dateInput?: Date | string | null): string {
      const d = dateInput ? new Date(dateInput) : new Date();
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }

    const paymentDateObj = new Date();
    const paymentDateStr = toMySQLDateTime(paymentDateObj);

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
    const invoiceNo = tenant.invoiceno || `INV-${new Date().getFullYear()}${String(tenantId).padStart(4, '0')}`;

    await db.exec("BEGIN TRANSACTION;");
    try {
      await db.run(
        "UPDATE tenants SET paymentStatus = 'Paid', paymentDate = ?, amount = ?, gst = ?, gstamount = ?, invoiceno = ? WHERE id = ?",
        [paymentDateStr, totalAmountPaid, gstPercent, gstAmount, invoiceNo, tenantId]
      );

      await db.run(
        "INSERT INTO amcdetails (tenantId, amcCharge, dueDate, paidDate, paidStatus) VALUES (?, ?, ?, NULL, 'Pending')",
        [tenantId, amcCharge, dueDateStr]
      );

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    return res.json({ success: true, message: "Payment recorded successfully." });
  } catch (error) {
    console.error("Pay tenant error:", error);
    return res.status(500).json({ error: "Failed to process payment." });
  }
};

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant header is missing." });
    }

    const db = getDatabase();
    const tenant = await db.get("SELECT name, adminEmail FROM tenants WHERE id = ?", [tenantId]);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    // Fetch price details
    let pricing = await db.get("SELECT price, tax FROM pricedetails LIMIT 1");
    const basePrice = pricing ? pricing.price : 0;
    const taxPercent = pricing ? pricing.tax : 0;
    const taxAmount = basePrice * (taxPercent / 100);
    const totalAmount = basePrice + taxAmount;

    // Razorpay expects amount in paise (1 Rupee = 100 paise)
    const amountInPaise = Math.round(totalAmount * 100);

    const rzpDetails = getRazorpayDetails();

    let orderId = `order_mock_${Math.random().toString(36).substring(2, 11)}`;
    let isMock = rzpDetails.isMock;

    if (rzpDetails.client) {
      try {
        const order = await rzpDetails.client.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: `receipt_tenant_${tenantId}_${Date.now()}`
        });
        orderId = order.id;
        isMock = false;
      } catch (err) {
        console.warn("Failed to create real Razorpay order, falling back to mock:", err);
        isMock = true;
      }
    }

    return res.json({
      success: true,
      orderId,
      amount: totalAmount,
      currency: "INR",
      keyId: rzpDetails.keyId || "rzp_test_mockKeyId",
      isMock,
      prefill: {
        name: tenant.name,
        email: tenant.adminEmail
      }
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return res.status(500).json({ error: "Failed to create payment order." });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant header is missing." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required payment details." });
    }

    const rzpDetails = getRazorpayDetails();

    // Verify signature
    if (!isMock && rzpDetails.client) {
      const generated_signature = crypto
        .createHmac('sha256', rzpDetails.keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
      }
    }

    const db = getDatabase();
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

    const existingTenant = await db.get("SELECT invoiceno FROM tenants WHERE id = ?", [tenantId]);
    const invoiceNo = existingTenant?.invoiceno || `INV-${new Date().getFullYear()}${String(tenantId).padStart(4, '0')}`;

    await db.exec("BEGIN TRANSACTION;");
    try {
      // 1. Update tenant with payment details
      await db.run(
        `UPDATE tenants 
         SET paymentStatus = 'Paid', 
             paymentDate = ?, 
             razorpayOrderId = ?, 
             razorpayPaymentId = ?, 
             razorpaySignature = ?,
             amount = ?,
             gst = ?,
             gstamount = ?,
             invoiceno = ?
         WHERE id = ?`,
        [paymentDateStr, razorpay_order_id, razorpay_payment_id, razorpay_signature, totalAmountPaid, gstPercent, gstAmount, invoiceNo, tenantId]
      );

      // 2. Insert next year's AMC
      await db.run(
        "INSERT INTO amcdetails (tenantId, amcCharge, dueDate, paidDate, paidStatus) VALUES (?, ?, ?, NULL, 'Pending')",
        [tenantId, amcCharge, dueDateStr]
      );

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    // Trigger Registration Payment Email Confirmation
    const tenant = await db.get("SELECT name, subdomain, adminEmail FROM tenants WHERE id = ?", [tenantId]);
    if (tenant && tenant.adminEmail) {
      let pricingDetails = await db.get("SELECT price, tax FROM pricedetails LIMIT 1");
      const price = pricingDetails ? pricingDetails.price : 0;
      const tax = pricingDetails ? pricingDetails.tax : 0;
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
      }).catch(err => console.error("Failed to send registration email:", err));
    }

    return res.json({
      success: true,
      message: "Payment successfully verified and workspace activated.",
      paymentStatus: "Paid",
      paymentDate: paymentDateStr
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return res.status(550).json({ error: "Failed to verify payment." });
  }
};

export const createAmcOrder = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant header is missing." });
    }
    const db = getDatabase();
    const amcRecord = await db.get(
      "SELECT id, amcCharge FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Pending' ORDER BY dueDate ASC LIMIT 1",
      [tenantId]
    );

    if (!amcRecord) {
      return res.status(404).json({ error: "No pending AMC record found for this organization." });
    }

    const pricing = await db.get("SELECT tax FROM pricedetails LIMIT 1");
    const taxPercent = pricing ? (Number(pricing.tax) || 0) : 0;
    const baseCharge = Number(amcRecord.amcCharge) || 0;
    const gstAmount = baseCharge * (taxPercent / 100);
    const totalAmount = baseCharge + gstAmount;

    const rzpDetails = getRazorpayDetails();

    if (!rzpDetails.client) {
      return res.json({
        isMock: true,
        orderId: `mock_amc_order_${Date.now()}`,
        amount: totalAmount,
        baseCharge,
        gstPercent: taxPercent,
        gstAmount,
        currency: "INR",
        amcRecordId: amcRecord.id
      });
    }

    const order = await rzpDetails.client.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `amc_receipt_${amcRecord.id}_${Date.now()}`,
      notes: {
        tenantId,
        amcRecordId: amcRecord.id,
        type: 'amc'
      }
    });

    res.json({
      isMock: false,
      keyId: rzpDetails.keyId,
      orderId: order.id,
      amount: totalAmount,
      baseCharge,
      gstPercent: taxPercent,
      gstAmount,
      currency: "INR",
      amcRecordId: amcRecord.id
    });
  } catch (error: any) {
    console.error("Create AMC order error:", error);
    res.status(500).json({ error: error.message || "Failed to create AMC payment order." });
  }
};

export const verifyAmcPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant header is missing." });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;
    const rzpDetails = getRazorpayDetails();

    if (!isMock && rzpDetails.client) {
      const generated_signature = crypto
        .createHmac('sha256', rzpDetails.keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
      }
    }

    const db = getDatabase();
    const amcRecord = await db.get(
      "SELECT id, amcCharge, dueDate FROM amcdetails WHERE tenantId = ? AND paidStatus = 'Pending' ORDER BY dueDate ASC LIMIT 1",
      [tenantId]
    );

    if (!amcRecord) {
      return res.status(404).json({ error: "No pending AMC record found." });
    }

    const paidDateObj = new Date();
    const paidDateStr = paidDateObj.toISOString().slice(0, 19).replace('T', ' ');

    // Rule: If previous due date is already passed (overdue), set next due date 1 year from paidDate.
    // Otherwise, set next due date 1 year from previous due date.
    const prevDueDateObj = amcRecord.dueDate ? new Date(amcRecord.dueDate) : paidDateObj;
    const isOverdue = prevDueDateObj.getTime() < paidDateObj.getTime();
    const baseDateForNextDue = isOverdue ? paidDateObj : prevDueDateObj;

    const nextDueDateObj = new Date(baseDateForNextDue);
    nextDueDateObj.setFullYear(baseDateForNextDue.getFullYear() + 1);
    const nextDueDateStr = nextDueDateObj.toISOString().slice(0, 10);

    let pricing = await db.get("SELECT amc, tax FROM pricedetails LIMIT 1");
    const nextAmcCharge = pricing ? pricing.amc : amcRecord.amcCharge;
    const amcGstPercent = pricing ? Number(pricing.tax) || 0 : 0;
    const amcGstAmount = (Number(amcRecord.amcCharge) || 0) * (amcGstPercent / 100);
    const amcInvoiceNo = `AMC-INV-${new Date().getFullYear()}${String(amcRecord.id).padStart(4, '0')}`;

    await db.exec("BEGIN TRANSACTION;");
    try {
      // Mark current AMC paid with invoice, gst, and gstamount
      await db.run(
        "UPDATE amcdetails SET paidStatus = 'Paid', paidDate = ?, invoiceno = ?, gst = ?, gstamount = ? WHERE id = ?",
        [paidDateStr, amcInvoiceNo, amcGstPercent, amcGstAmount, amcRecord.id]
      );

      // Insert next year AMC
      await db.run(
        "INSERT INTO amcdetails (tenantId, amcCharge, dueDate, paidDate, paidStatus) VALUES (?, ?, ?, NULL, 'Pending')",
        [tenantId, nextAmcCharge, nextDueDateStr]
      );

      await db.exec("COMMIT;");
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }

    // Trigger AMC Payment Receipt Email
    const tenant = await db.get("SELECT name, subdomain, adminEmail FROM tenants WHERE id = ?", [tenantId]);
    if (tenant && tenant.adminEmail) {
      sendAmcPaymentEmail({
        to: tenant.adminEmail,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        amcCharge: Number(amcRecord.amcCharge) || 0,
        gstPercent: amcGstPercent,
        gstAmount: amcGstAmount,
        invoiceNo: amcInvoiceNo,
        paidDate: paidDateStr.slice(0, 10),
        nextDueDate: nextDueDateStr
      }).catch(err => console.error("Failed to send AMC email:", err));
    }

    res.json({ message: "AMC Payment confirmed successfully! Renewal complete.", success: true });
  } catch (error: any) {
    console.error("Verify AMC payment error:", error);
    res.status(500).json({ error: error.message || "Failed to verify AMC payment." });
  }
};

