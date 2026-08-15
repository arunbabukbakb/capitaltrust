import { Request, Response } from 'express';
import { getDatabase } from '../database';

function getTenantId(req: Request): number {
  const raw = req.headers['x-tenant-id'];
  const parsed = Number(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export const getOrganizationInfo = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const db = getDatabase();

    const tenant = await db.get(`
      SELECT 
        t.id,
        t.name,
        t.subdomain,
        t.adminEmail,
        t.phone,
        t.createdDate,
        t.isActive,
        t.paymentStatus,
        t.paymentDate,
        t.address,
        t.logo,
        t.gstnumber,
        t.maxUserLimit,
        t.organizationTypeId,
        t.code,
        t.registerNumber,
        t.registerDate,
        t.establishedDate,
        t.contactPerson,
        t.website,
        t.addressLine1,
        t.addressLine2,
        t.country,
        t.state,
        t.city,
        t.pincode,
        ot.typeName as organizationTypeName,
        ot.code as organizationTypeCode
      FROM tenants t
      LEFT JOIN organization_types ot ON t.organizationTypeId = ot.id
      WHERE t.id = ?
    `, [tenantId]);

    if (!tenant) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    // Top Summary KPI Metrics
    const totalMembersRes = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE tenantId = ?",
      [tenantId]
    );
    const activeMembersRes = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE tenantId = ? AND status = 1",
      [tenantId]
    );
    const totalGroupsRes = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM tenant_groups WHERE tenantId = ?",
      [tenantId]
    );

    // Active Loans for tenant members
    const activeLoansRes = await db.get<{ count: number }>(
      `SELECT COUNT(DISTINCT l.Id) as count 
       FROM Loan l
       JOIN LoanMember lm ON l.Id = lm.LoanId
       JOIN users u ON lm.UserId = u.id
       WHERE u.tenantId = ? AND l.Status = 'Active'`,
      [tenantId]
    );

    const metrics = {
      totalMembers: totalMembersRes?.count || 0,
      activeMembers: activeMembersRes?.count || 0,
      totalGroups: totalGroupsRes?.count || 0,
      activeLoanCount: activeLoansRes?.count || 0
    };

    return res.json({
      organization: tenant,
      metrics
    });
  } catch (error) {
    console.error('Error fetching organization info:', error);
    return res.status(500).json({ error: 'Failed to fetch organization information.' });
  }
};

export const updateOrganizationInfo = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const db = getDatabase();

    const existing = await db.get("SELECT * FROM tenants WHERE id = ?", [tenantId]);
    if (!existing) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const {
      name,
      code,
      organizationTypeId,
      registerNumber,
      registerDate,
      establishedDate,
      status,
      contactPerson,
      phone,
      adminEmail,
      website,
      addressLine1,
      addressLine2,
      country,
      state,
      city,
      pincode
    } = req.body;

    const updatedName = name?.trim() || existing.name;
    const updatedCode = code ? code.trim().toUpperCase() : (existing.code || '');
    const updatedOrgTypeId = typeof organizationTypeId !== 'undefined' ? (organizationTypeId ? Number(organizationTypeId) : null) : (existing.organizationTypeId || null);
    const updatedRegNo = registerNumber !== undefined ? registerNumber : (existing.registerNumber || '');
    const updatedRegDate = registerDate !== undefined ? registerDate : (existing.registerDate || '');
    const updatedEstDate = establishedDate !== undefined ? establishedDate : (existing.establishedDate || '');
    const updatedIsActive = status === 'Active' || status === 1 || status === true ? 1 : (status === 'Inactive' || status === 0 || status === false ? 0 : existing.isActive);
    const updatedContactPerson = contactPerson !== undefined ? contactPerson : (existing.contactPerson || '');
    const updatedPhone = phone !== undefined ? phone : (existing.phone || '');
    const updatedAdminEmail = adminEmail !== undefined ? adminEmail : (existing.adminEmail || '');
    const updatedWebsite = website !== undefined ? website : (existing.website || '');
    const updatedAddr1 = addressLine1 !== undefined ? addressLine1 : (existing.addressLine1 || '');
    const updatedAddr2 = addressLine2 !== undefined ? addressLine2 : (existing.addressLine2 || '');
    const updatedCountry = country !== undefined ? country : (existing.country || 'India');
    const updatedState = state !== undefined ? state : (existing.state || '');
    const updatedCity = city !== undefined ? city : (existing.city || '');
    const updatedPincode = pincode !== undefined ? pincode : (existing.pincode || '');

    // Combine full address string for backward compatibility
    const combinedAddress = [updatedAddr1, updatedAddr2, updatedCity, updatedState, updatedCountry, updatedPincode]
      .filter(Boolean)
      .join(', ');

    await db.run(
      `UPDATE tenants SET 
        name = ?,
        code = ?,
        organizationTypeId = ?,
        registerNumber = ?,
        registerDate = ?,
        establishedDate = ?,
        isActive = ?,
        contactPerson = ?,
        phone = ?,
        adminEmail = ?,
        website = ?,
        addressLine1 = ?,
        addressLine2 = ?,
        country = ?,
        state = ?,
        city = ?,
        pincode = ?,
        address = ?
      WHERE id = ?`,
      [
        updatedName,
        updatedCode,
        updatedOrgTypeId,
        updatedRegNo,
        updatedRegDate,
        updatedEstDate,
        updatedIsActive,
        updatedContactPerson,
        updatedPhone,
        updatedAdminEmail,
        updatedWebsite,
        updatedAddr1,
        updatedAddr2,
        updatedCountry,
        updatedState,
        updatedCity,
        updatedPincode,
        combinedAddress,
        tenantId
      ]
    );

    return res.json({ message: 'Organization information updated successfully.' });
  } catch (error) {
    console.error('Error updating organization info:', error);
    return res.status(500).json({ error: 'Failed to update organization information.' });
  }
};
