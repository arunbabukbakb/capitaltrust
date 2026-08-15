import { Request, Response } from 'express';
import { OrganizationTypeModel } from '../models/OrganizationType';

export const listOrganizationTypes = async (req: Request, res: Response) => {
  try {
    const types = await OrganizationTypeModel.findAll();
    return res.json(types);
  } catch (error) {
    console.error('Error listing organization types:', error);
    return res.status(500).json({ error: 'Failed to fetch organization types.' });
  }
};

export const getActiveOrganizationTypes = async (req: Request, res: Response) => {
  try {
    const types = await OrganizationTypeModel.findActive();
    return res.json(types);
  } catch (error) {
    console.error('Error listing active organization types:', error);
    return res.status(500).json({ error: 'Failed to fetch active organization types.' });
  }
};

export const createOrganizationType = async (req: Request, res: Response) => {
  try {
    const { typeName, code, description, status, orderNumber } = req.body;

    if (!typeName || !typeName.trim()) {
      return res.status(400).json({ error: 'Organization Type Name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Organization Type Code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanTypeName = typeName.trim();

    // Check code uniqueness
    const existingCode = await OrganizationTypeModel.findByCode(cleanCode);
    if (existingCode) {
      return res.status(400).json({ error: `Organization Type Code "${cleanCode}" already exists.` });
    }

    // Check name uniqueness
    const existingName = await OrganizationTypeModel.findByTypeName(cleanTypeName);
    if (existingName) {
      return res.status(400).json({ error: `Organization Type Name "${cleanTypeName}" already exists.` });
    }

    const orderNum = typeof orderNumber === 'number' ? orderNumber : parseInt(orderNumber, 10) || 0;

    const result = await OrganizationTypeModel.create({
      typeName: cleanTypeName,
      code: cleanCode,
      description,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      orderNumber: orderNum
    });

    return res.status(201).json({
      message: 'Organization type created successfully.',
      id: result.lastID
    });
  } catch (error) {
    console.error('Error creating organization type:', error);
    return res.status(500).json({ error: 'Failed to create organization type.' });
  }
};

export const updateOrganizationType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid organization type ID.' });
    }

    const { typeName, code, description, status, orderNumber } = req.body;

    if (!typeName || !typeName.trim()) {
      return res.status(400).json({ error: 'Organization Type Name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Organization Type Code is required.' });
    }

    const existing = await OrganizationTypeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Organization type not found.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanTypeName = typeName.trim();

    // Check code uniqueness excluding current id
    const existingCode = await OrganizationTypeModel.findByCode(cleanCode, id);
    if (existingCode) {
      return res.status(400).json({ error: `Organization Type Code "${cleanCode}" is already in use by another type.` });
    }

    // Check name uniqueness excluding current id
    const existingName = await OrganizationTypeModel.findByTypeName(cleanTypeName, id);
    if (existingName) {
      return res.status(400).json({ error: `Organization Type Name "${cleanTypeName}" is already in use by another type.` });
    }

    const orderNum = typeof orderNumber === 'number' ? orderNumber : parseInt(orderNumber, 10) || 0;

    await OrganizationTypeModel.update(id, {
      typeName: cleanTypeName,
      code: cleanCode,
      description,
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      orderNumber: orderNum
    });

    return res.json({ message: 'Organization type updated successfully.' });
  } catch (error) {
    console.error('Error updating organization type:', error);
    return res.status(500).json({ error: 'Failed to update organization type.' });
  }
};

export const toggleOrganizationTypeStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid organization type ID.' });
    }

    const { status } = req.body;
    const newStatus = status === 'Inactive' ? 'Inactive' : 'Active';

    const existing = await OrganizationTypeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Organization type not found.' });
    }

    await OrganizationTypeModel.toggleStatus(id, newStatus);
    return res.json({ message: `Organization type status set to ${newStatus}.` });
  } catch (error) {
    console.error('Error toggling organization type status:', error);
    return res.status(500).json({ error: 'Failed to update status.' });
  }
};

export const deleteOrganizationType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid organization type ID.' });
    }

    const existing = await OrganizationTypeModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Organization type not found.' });
    }

    const tenantCount = await OrganizationTypeModel.getTenantCount(id);
    if (tenantCount > 0) {
      return res.status(400).json({
        error: `Cannot delete Organization Type "${existing.typeName}" because it is currently assigned to ${tenantCount} tenant(s).`
      });
    }

    await OrganizationTypeModel.delete(id);
    return res.json({ message: 'Organization type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting organization type:', error);
    return res.status(500).json({ error: 'Failed to delete organization type.' });
  }
};
