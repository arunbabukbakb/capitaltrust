import { Request, Response } from 'express';
import { CollectionModel } from '../models/Collection';

const VALID_FREQUENCIES = ['weekly', 'monthly', 'yearly', 'dynamic'];

export const getCollectionTypes = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const list = await CollectionModel.listTypes(tenantId);
    const mapped = list.map(item => ({
      ...item,
      status: item.status === 1,
      frequency: item.frequency && VALID_FREQUENCIES.includes(String(item.frequency).toLowerCase()) ? String(item.frequency).toLowerCase() : 'monthly',
      amount: item.amount !== null && item.amount !== undefined && !isNaN(Number(item.amount)) ? Number(item.amount) : null
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Get collection types error", error);
    res.status(500).json({ error: "Error fetching collection types" });
  }
};

export const createCollectionType = async (req: Request, res: Response) => {
  try {
    const { typeName, status, frequency, amount } = req.body;
    if (!typeName || typeName.trim() === '') {
      return res.status(400).json({ error: "TypeName is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const trimmedName = typeName.trim();
    const existing = await CollectionModel.findTypeByName(trimmedName, tenantId);
    if (existing) {
      return res.status(409).json({ error: `Collection type "${trimmedName}" already exists.` });
    }

    const freq = frequency && VALID_FREQUENCIES.includes(String(frequency).toLowerCase()) ? String(frequency).toLowerCase() : 'monthly';
    const parsedAmount = (amount !== undefined && amount !== null && amount !== '' && !isNaN(Number(amount))) ? Number(amount) : null;
    const statusVal = status === false ? 0 : 1;
    const result = await CollectionModel.createType(trimmedName, tenantId, statusVal, freq, parsedAmount);

    const newType = {
      id: Number(result.lastID),
      typeName: trimmedName,
      status: statusVal === 1,
      frequency: freq,
      amount: parsedAmount
    };

    res.status(201).json(newType);
  } catch (error) {
    console.error("Create collection type error", error);
    res.status(500).json({ error: "Error creating collection type" });
  }
};

export const updateCollectionType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { typeName, status, frequency, amount } = req.body;
    if (!typeName || typeName.trim() === '') {
      return res.status(400).json({ error: "TypeName is required" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const trimmedName = typeName.trim();
    const duplicate = await CollectionModel.findTypeByNameExcludeId(trimmedName, tenantId, Number(id));
    if (duplicate) {
      return res.status(409).json({ error: `Collection type "${trimmedName}" already exists.` });
    }

    const freq = frequency && VALID_FREQUENCIES.includes(String(frequency).toLowerCase()) ? String(frequency).toLowerCase() : 'monthly';
    const parsedAmount = (amount !== undefined && amount !== null && amount !== '' && !isNaN(Number(amount))) ? Number(amount) : null;
    const statusVal = status === true || status === 1 ? 1 : 0;
    await CollectionModel.updateType(Number(id), trimmedName, statusVal, freq, parsedAmount);

    res.json({
      id: Number(id),
      typeName: trimmedName,
      status: statusVal === 1,
      frequency: freq,
      amount: parsedAmount
    });
  } catch (error) {
    console.error("Update collection type error", error);
    res.status(500).json({ error: "Error updating collection type" });
  }
};
