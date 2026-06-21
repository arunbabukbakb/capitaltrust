import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getCollectionTypes = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const list = await db.all("SELECT Id as id, TypeName as typeName, Status as status FROM CollectionType ORDER BY Id DESC");
    const mapped = list.map(item => ({
      ...item,
      status: item.status === 1
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Get collection types error", error);
    res.status(500).json({ error: "Error fetching collection types" });
  }
};

export const createCollectionType = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { typeName, status } = req.body;
    if (!typeName || typeName.trim() === '') {
      return res.status(400).json({ error: "TypeName is required" });
    }

    const trimmedName = typeName.trim();
    // Check if it already exists
    const existing = await db.get("SELECT Id FROM CollectionType WHERE TypeName = ?", [trimmedName]);
    if (existing) {
      return res.status(409).json({ error: `Collection type "${trimmedName}" already exists.` });
    }

    const statusVal = status === false ? 0 : 1;
    const result = await db.run(
      "INSERT INTO CollectionType (TypeName, Status) VALUES (?, ?)",
      [trimmedName, statusVal]
    );

    const newType = {
      id: result.lastID,
      typeName: trimmedName,
      status: statusVal === 1
    };

    res.status(201).json(newType);
  } catch (error) {
    console.error("Create collection type error", error);
    res.status(500).json({ error: "Error creating collection type" });
  }
};

export const updateCollectionType = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { typeName, status } = req.body;
    if (!typeName || typeName.trim() === '') {
      return res.status(400).json({ error: "TypeName is required" });
    }

    const trimmedName = typeName.trim();
    
    // Check if name is taken by another ID
    const duplicate = await db.get("SELECT Id FROM CollectionType WHERE TypeName = ? AND Id != ?", [trimmedName, id]);
    if (duplicate) {
      return res.status(409).json({ error: `Collection type "${trimmedName}" already exists.` });
    }

    const statusVal = status === true || status === 1 ? 1 : 0;
    await db.run(
      "UPDATE CollectionType SET TypeName = ?, Status = ? WHERE Id = ?",
      [trimmedName, statusVal, id]
    );

    res.json({ id: Number(id), typeName: trimmedName, status: statusVal === 1 });
  } catch (error) {
    console.error("Update collection type error", error);
    res.status(500).json({ error: "Error updating collection type" });
  }
};
