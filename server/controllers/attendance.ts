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

export const getAttendance = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    const tenantId = ctx ? ctx.tenantId : 1;
    const meetingId = req.query.meetingId ? Number(req.query.meetingId) : null;

    if (!meetingId || isNaN(meetingId)) {
      return res.status(400).json({ error: "meetingId is required to view attendance." });
    }

    // Fetch meeting details
    const meeting = await db.get<{ id: number; meetingNo: string; meetingDate: string; groupId: number | null }>(
      "SELECT id, meetingNo, meetingDate, groupId FROM meetings WHERE id = ? AND organizationId = ?",
      [meetingId, tenantId]
    );

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    let groupName = null;
    let members: { memberId: string; fullName: string; email: string; attendanceStatus?: string; remarks?: string }[] = [];

    if (meeting.groupId) {
      const gRow = await db.get<{ name: string }>("SELECT name FROM tenant_groups WHERE id = ?", [meeting.groupId]);
      groupName = gRow?.name || null;

      members = await db.all(
        `SELECT u.id as memberId, u.fullName, u.email
         FROM group_members gm
         JOIN users u ON gm.userId = u.id
         WHERE gm.groupId = ? AND gm.tenantId = ? AND u.status = 1
         ORDER BY u.fullName ASC`,
        [meeting.groupId, tenantId]
      );
    } else {
      groupName = 'All Members';
      members = await db.all(
        `SELECT u.id as memberId, u.fullName, u.email
         FROM users u
         WHERE u.tenantId = ? AND u.status = 1
         ORDER BY u.fullName ASC`,
        [tenantId]
      );
    }

    // Fetch existing recorded attendance for this meeting
    const savedRecords = await db.all<{ memberId: string; attendanceStatus: string; remarks: string }[]>(
      "SELECT memberId, attendanceStatus, remarks FROM attendances WHERE meetingId = ? AND organizationId = ?",
      [meetingId, tenantId]
    );

    const savedMap = new Map<string, { attendanceStatus: string; remarks: string }>();
    savedRecords.forEach(r => savedMap.set(r.memberId, { attendanceStatus: r.attendanceStatus, remarks: r.remarks }));

    const attendanceData = members.map(m => {
      const saved = savedMap.get(m.memberId);
      return {
        memberId: m.memberId,
        fullName: m.fullName,
        email: m.email,
        attendanceStatus: saved ? saved.attendanceStatus : 'Present',
        remarks: saved ? (saved.remarks || '') : ''
      };
    });

    res.json({
      meeting: {
        id: meeting.id,
        meetingNo: meeting.meetingNo,
        meetingDate: meeting.meetingDate,
        groupId: meeting.groupId,
        groupName
      },
      members: attendanceData
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
};

export const saveAttendance = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { meetingId, records } = req.body;

    if (!meetingId || isNaN(Number(meetingId))) {
      return res.status(400).json({ error: "meetingId is required." });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: "records must be an array." });
    }

    const meeting = await db.get(
      "SELECT id FROM meetings WHERE id = ? AND organizationId = ?",
      [meetingId, ctx.tenantId]
    );
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    await db.run("BEGIN TRANSACTION");
    try {
      for (const rec of records) {
        if (!rec.memberId || !rec.attendanceStatus) continue;

        const validStatus = ['Present', 'Absent', 'Excused'].includes(rec.attendanceStatus)
          ? rec.attendanceStatus
          : 'Present';

        const existing = await db.get(
          "SELECT id FROM attendances WHERE meetingId = ? AND memberId = ?",
          [meetingId, rec.memberId]
        );

        if (existing) {
          await db.run(
            `UPDATE attendances SET
               attendanceStatus = ?,
               remarks = ?,
               updatedBy = ?,
               updatedAt = NOW()
             WHERE meetingId = ? AND memberId = ?`,
            [validStatus, rec.remarks?.trim() || null, ctx.userId, meetingId, rec.memberId]
          );
        } else {
          await db.run(
            `INSERT INTO attendances
               (organizationId, meetingId, memberId, attendanceStatus, remarks, createdBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ctx.tenantId, meetingId, rec.memberId, validStatus, rec.remarks?.trim() || null, ctx.userId]
          );
        }
      }

      await db.run("COMMIT");
      res.json({ success: true, message: "Attendance saved successfully" });
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Save attendance error:", error);
    res.status(500).json({ error: "Failed to save attendance" });
  }
};
