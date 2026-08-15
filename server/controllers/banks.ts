import { Request, Response } from 'express';
import { getDatabase } from '../database';

function getTenantId(req: Request): number {
  const raw = req.headers['x-tenant-id'];
  const parsed = Number(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export const listBanks = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const db = getDatabase();

    const banks = await db.all(`
      SELECT 
        id,
        name,
        branch,
        accountNumber,
        ifsc,
        address,
        status,
        isPrimary,
        createdAt,
        updatedAt
      FROM tenant_banks
      WHERE tenantId = ?
      ORDER BY isPrimary DESC, name ASC
    `, [tenantId]);

    return res.json(banks);
  } catch (error) {
    console.error('Error listing bank accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch bank accounts.' });
  }
};

export const createBank = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { name, branch, accountNumber, ifsc, address, status, isPrimary } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Bank Name is required.' });
    }
    if (!branch || !branch.trim()) {
      return res.status(400).json({ error: 'Branch Name is required.' });
    }
    if (!accountNumber || !accountNumber.trim()) {
      return res.status(400).json({ error: 'Account Number is required.' });
    }
    if (!ifsc || !ifsc.trim()) {
      return res.status(400).json({ error: 'IFSC Code is required.' });
    }

    const cleanName = name.trim();
    const cleanBranch = branch.trim();
    const cleanAccNo = accountNumber.trim();
    const cleanIfsc = ifsc.trim().toUpperCase();
    const bankStatus = status === 'Inactive' ? 'Inactive' : 'Active';
    const primaryVal = isPrimary === 1 || isPrimary === true ? 1 : 0;

    const db = getDatabase();

    // Check if this is the first bank for the tenant; if so, make it primary automatically
    const countRes = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM tenant_banks WHERE tenantId = ?",
      [tenantId]
    );
    const isFirstBank = (!countRes || countRes.count === 0);
    const finalPrimary = (primaryVal === 1 || isFirstBank) ? 1 : 0;

    // Enforce single primary bank rule per tenant
    if (finalPrimary === 1) {
      await db.run("UPDATE tenant_banks SET isPrimary = 0 WHERE tenantId = ?", [tenantId]);
    }

    const result = await db.run(
      `INSERT INTO tenant_banks 
        (tenantId, name, branch, accountNumber, ifsc, address, status, isPrimary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, cleanName, cleanBranch, cleanAccNo, cleanIfsc, address ? address.trim() : null, bankStatus, finalPrimary]
    );

    return res.status(201).json({
      message: 'Bank account created successfully.',
      id: result.lastID
    });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return res.status(500).json({ error: 'Failed to create bank account.' });
  }
};

export const updateBank = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const bankId = parseInt(req.params.id, 10);
    if (isNaN(bankId)) {
      return res.status(400).json({ error: 'Invalid bank account ID.' });
    }

    const { name, branch, accountNumber, ifsc, address, status, isPrimary } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Bank Name is required.' });
    }
    if (!branch || !branch.trim()) {
      return res.status(400).json({ error: 'Branch Name is required.' });
    }
    if (!accountNumber || !accountNumber.trim()) {
      return res.status(400).json({ error: 'Account Number is required.' });
    }
    if (!ifsc || !ifsc.trim()) {
      return res.status(400).json({ error: 'IFSC Code is required.' });
    }

    const db = getDatabase();
    const existing = await db.get(
      "SELECT id, isPrimary FROM tenant_banks WHERE id = ? AND tenantId = ?",
      [bankId, tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found.' });
    }

    const cleanName = name.trim();
    const cleanBranch = branch.trim();
    const cleanAccNo = accountNumber.trim();
    const cleanIfsc = ifsc.trim().toUpperCase();
    const bankStatus = status === 'Inactive' ? 'Inactive' : 'Active';
    const primaryVal = isPrimary === 1 || isPrimary === true ? 1 : 0;

    // Enforce single primary bank rule per tenant
    if (primaryVal === 1) {
      await db.run("UPDATE tenant_banks SET isPrimary = 0 WHERE tenantId = ?", [tenantId]);
    }

    await db.run(
      `UPDATE tenant_banks SET 
        name = ?,
        branch = ?,
        accountNumber = ?,
        ifsc = ?,
        address = ?,
        status = ?,
        isPrimary = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND tenantId = ?`,
      [cleanName, cleanBranch, cleanAccNo, cleanIfsc, address ? address.trim() : null, bankStatus, primaryVal, bankId, tenantId]
    );

    return res.json({ message: 'Bank account updated successfully.' });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return res.status(500).json({ error: 'Failed to update bank account.' });
  }
};

export const setPrimaryBank = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const bankId = parseInt(req.params.id, 10);
    if (isNaN(bankId)) {
      return res.status(400).json({ error: 'Invalid bank account ID.' });
    }

    const db = getDatabase();
    const existing = await db.get(
      "SELECT id FROM tenant_banks WHERE id = ? AND tenantId = ?",
      [bankId, tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found.' });
    }

    // Unset primary for all banks of tenant, then set for target bank
    await db.run("UPDATE tenant_banks SET isPrimary = 0 WHERE tenantId = ?", [tenantId]);
    await db.run("UPDATE tenant_banks SET isPrimary = 1 WHERE id = ? AND tenantId = ?", [bankId, tenantId]);

    return res.json({ message: 'Bank set as primary account successfully.' });
  } catch (error) {
    console.error('Error setting primary bank:', error);
    return res.status(500).json({ error: 'Failed to set primary bank account.' });
  }
};

export const deleteBank = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const bankId = parseInt(req.params.id, 10);
    if (isNaN(bankId)) {
      return res.status(400).json({ error: 'Invalid bank account ID.' });
    }

    const db = getDatabase();
    const existing = await db.get(
      "SELECT id, isPrimary FROM tenant_banks WHERE id = ? AND tenantId = ?",
      [bankId, tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Bank account not found.' });
    }

    await db.run("DELETE FROM tenant_banks WHERE id = ? AND tenantId = ?", [bankId, tenantId]);

    // If deleted bank was primary, make the first remaining bank primary
    if (existing.isPrimary === 1) {
      const firstRemaining = await db.get<{ id: number }>(
        "SELECT id FROM tenant_banks WHERE tenantId = ? ORDER BY id ASC LIMIT 1",
        [tenantId]
      );
      if (firstRemaining) {
        await db.run("UPDATE tenant_banks SET isPrimary = 1 WHERE id = ?", [firstRemaining.id]);
      }
    }

    return res.json({ message: 'Bank account deleted successfully.' });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return res.status(500).json({ error: 'Failed to delete bank account.' });
  }
};
