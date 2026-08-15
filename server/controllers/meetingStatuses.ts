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

export const getMeetingStatuses = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromReq(req);
    const statuses = await MeetingModel.listMeetingStatuses(tenantId);
    res.json(statuses);
  } catch (error) {
    console.error("Get meeting statuses error:", error);
    res.status(500).json({ error: "Failed to fetch meeting statuses" });
  }
};

export const createMeetingStatus = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { name, status } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Meeting status name is required." });
    }

    const isStatusActive = status === undefined || status === null ? 1 : (status ? 1 : 0);
    const result = await MeetingModel.createMeetingStatus(ctx.tenantId, name.trim(), isStatusActive, ctx.userId);
    res.json({ success: true, id: result.lastID, message: "Meeting status created successfully" });
  } catch (error: any) {
    console.error("Create meeting status error:", error);
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: "Meeting status name already exists." });
    }
    res.status(500).json({ error: "Failed to create meeting status" });
  }
};

export const updateMeetingStatus = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    const { name, status } = req.body;
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Meeting status name is required." });
    }

    const isStatusActive = status ? 1 : 0;
    await MeetingModel.updateMeetingStatus(id, ctx.tenantId, name.trim(), isStatusActive, ctx.userId);
    res.json({ success: true, message: "Meeting status updated successfully" });
  } catch (error: any) {
    console.error("Update meeting status error:", error);
    res.status(400).json({ error: error.message || "Failed to update meeting status" });
  }
};

export const deleteMeetingStatus = async (req: Request, res: Response) => {
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await MeetingModel.deleteMeetingStatus(id, ctx.tenantId);
    res.json({ success: true, message: "Meeting status deleted successfully" });
  } catch (error: any) {
    console.error("Delete meeting status error:", error);
    res.status(400).json({ error: error.message || "Failed to delete meeting status" });
  }
};
