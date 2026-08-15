import { Request, Response } from 'express';
import { MeetingModel } from '../models/Meeting';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

async function getTenantAndUserId(req: Request) {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const db = getDatabase();
    const user = await db.get<{ id: string; tenantId: number }>("SELECT id, tenantId FROM users WHERE id = ?", [payload.id]);
    if (!user) return null;
    return { userId: user.id, tenantId: Number(user.tenantId || 1) };
  } catch {
    return null;
  }
}

function getTenantIdFromReq(req: Request): number {
  const header = req.headers['x-tenant-id'] as string;
  const parsed = parseInt(header, 10);
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

export const getMeetingTypes = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromReq(req);
    const types = await MeetingModel.listMeetingTypes(tenantId);
    res.json(types);
  } catch (error) {
    console.error("Get meeting types error:", error);
    res.status(500).json({ error: "Failed to fetch meeting types" });
  }
};

export const createMeetingType = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { name, status } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Meeting type name is required." });
    }

    const isStatusActive = status === undefined || status === null ? 1 : (status ? 1 : 0);
    const result = await MeetingModel.createMeetingType(ctx.tenantId, name.trim(), isStatusActive, ctx.userId);
    res.json({ success: true, id: result.lastID, message: "Meeting type created successfully" });
  } catch (error: any) {
    console.error("Create meeting type error:", error);
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: "Meeting type name already exists." });
    }
    res.status(500).json({ error: "Failed to create meeting type" });
  }
};

export const updateMeetingType = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    const { name, status } = req.body;
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Meeting type name is required." });
    }

    const isStatusActive = status ? 1 : 0;
    await MeetingModel.updateMeetingType(id, ctx.tenantId, name.trim(), isStatusActive, ctx.userId);
    res.json({ success: true, message: "Meeting type updated successfully" });
  } catch (error: any) {
    console.error("Update meeting type error:", error);
    res.status(500).json({ error: "Failed to update meeting type" });
  }
};

export const deleteMeetingType = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await MeetingModel.deleteMeetingType(id, ctx.tenantId);
    res.json({ success: true, message: "Meeting type deleted successfully" });
  } catch (error: any) {
    console.error("Delete meeting type error:", error);
    res.status(500).json({ error: "Failed to delete meeting type" });
  }
};
