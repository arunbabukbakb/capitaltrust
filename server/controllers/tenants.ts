import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getDatabase } from '../database';
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
    let tenantId: number | undefined;

    await db.exec("BEGIN TRANSACTION;");
    try {
      const result = await TenantModel.create({
        name: companyName.trim(),
        subdomain: subdomainClean,
        adminEmail: adminEmailClean,
        createdDate
      });

      tenantId = result.lastID;
      if (!tenantId) {
        throw new Error("Failed to retrieve auto-incremented tenant ID");
      }

      await UserModel.create({
        id: userId,
        fullName: adminName.trim(),
        email: adminEmailClean,
        username: adminUsernameClean,
        role: 'admin',
        password: hashedPassword,
        status: 1,
        roleId: adminRole.id,
        tenantId: String(tenantId)
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
      await db.run(
        "UPDATE tenants SET paymentStatus = 'Paid', paymentDate = ? WHERE id = ?",
        [paymentDateStr, tenantId]
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
      // 1. Update tenant with payment details
      await db.run(
        `UPDATE tenants 
         SET paymentStatus = 'Paid', 
             paymentDate = ?, 
             razorpayOrderId = ?, 
             razorpayPaymentId = ?, 
             razorpaySignature = ? 
         WHERE id = ?`,
        [paymentDateStr, razorpay_order_id, razorpay_payment_id, razorpay_signature, tenantId]
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
