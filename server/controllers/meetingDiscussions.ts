import { Request, Response } from 'express';
import { getDatabase } from '../database';
import jwt from 'jsonwebtoken';

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

export const getMeetingDiscussions = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    const tenantId = ctx ? ctx.tenantId : 1;
    const meetingId = req.query.meetingId ? Number(req.query.meetingId) : null;

    if (!meetingId || isNaN(meetingId)) {
      return res.status(400).json({ error: "meetingId is required." });
    }

    const sql = `
      SELECT md.*, u.fullName as createdByName
      FROM meeting_discussions md
      LEFT JOIN users u ON md.createdBy = u.id
      WHERE md.meetingId = ? AND md.organizationId = ?
      ORDER BY md.id ASC
    `;

    const discussions = await db.all(sql, [meetingId, tenantId]);
    res.json(discussions);
  } catch (error) {
    console.error("Get meeting discussions error:", error);
    res.status(500).json({ error: "Failed to fetch meeting discussions" });
  }
};

export const createMeetingDiscussion = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { meetingId, title, description, discussedBy, remarks } = req.body;

    if (!meetingId || isNaN(Number(meetingId))) {
      return res.status(400).json({ error: "meetingId is required." });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: "Discussion title is required." });
    }

    const meeting = await db.get(
      "SELECT id FROM meetings WHERE id = ? AND organizationId = ?",
      [meetingId, ctx.tenantId]
    );
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const result = await db.run(
      `INSERT INTO meeting_discussions
         (organizationId, meetingId, title, description, discussedBy, remarks, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ctx.tenantId,
        Number(meetingId),
        title.trim(),
        description?.trim() || null,
        discussedBy?.trim() || null,
        remarks?.trim() || null,
        ctx.userId
      ]
    );

    res.json({
      success: true,
      id: result.lastID,
      message: "Discussion topic created successfully"
    });
  } catch (error) {
    console.error("Create meeting discussion error:", error);
    res.status(500).json({ error: "Failed to create meeting discussion" });
  }
};

export const updateMeetingDiscussion = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    const { title, description, discussedBy, remarks } = req.body;

    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid discussion ID" });
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: "Discussion title is required." });
    }

    await db.run(
      `UPDATE meeting_discussions SET
         title = ?,
         description = ?,
         discussedBy = ?,
         remarks = ?,
         updatedBy = ?,
         updatedAt = NOW()
       WHERE id = ? AND organizationId = ?`,
      [
        title.trim(),
        description?.trim() || null,
        discussedBy?.trim() || null,
        remarks?.trim() || null,
        ctx.userId,
        id,
        ctx.tenantId
      ]
    );

    res.json({ success: true, message: "Discussion topic updated successfully" });
  } catch (error) {
    console.error("Update meeting discussion error:", error);
    res.status(500).json({ error: "Failed to update meeting discussion" });
  }
};

export const deleteMeetingDiscussion = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid discussion ID" });

    await db.run(
      "DELETE FROM meeting_discussions WHERE id = ? AND organizationId = ?",
      [id, ctx.tenantId]
    );

    res.json({ success: true, message: "Discussion topic deleted successfully" });
  } catch (error) {
    console.error("Delete meeting discussion error:", error);
    res.status(500).json({ error: "Failed to delete meeting discussion" });
  }
};
