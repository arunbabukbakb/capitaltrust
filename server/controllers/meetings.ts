import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { MeetingModel } from '../models/Meeting';
import { sendPushNotification } from '../firebaseAdmin';
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

async function notifyUsersForMeeting(tenantId: number, groupId: number | null | undefined, title: string, body: string, meetingId: number) {
  try {
    const db = getDatabase();
    let targetUserIds: string[] = [];
    if (groupId) {
      const rows = await db.all<{ userId: string }[]>(
        "SELECT userId FROM group_members WHERE groupId = ? AND tenantId = ?",
        [groupId, tenantId]
      );
      targetUserIds = rows.map(r => r.userId);
    } else {
      const rows = await db.all<{ id: string }[]>(
        "SELECT id FROM users WHERE tenantId = ? AND status = 1",
        [tenantId]
      );
      targetUserIds = rows.map(r => r.id);
    }
    if (targetUserIds.length > 0) {
      setImmediate(() => {
        sendPushNotification(targetUserIds, title, body, `/meetings/${meetingId}`).catch(err =>
          console.error("Meeting notification dispatch error:", err)
        );
      });
    }
  } catch (err) {
    console.error("Failed to send meeting notification:", err);
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

export const getMeetings = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const tenantId = getTenantIdFromReq(req);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const meetingTypeId = req.query.meetingTypeId ? Number(req.query.meetingTypeId) : null;
    const meetingStatusId = req.query.meetingStatusId ? Number(req.query.meetingStatusId) : null;
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;

    let whereClause = "WHERE m.organizationId = ?";
    const params: any[] = [tenantId];

    if (search) {
      whereClause += " AND (m.meetingNo LIKE ? OR m.location LIKE ? OR m.note LIKE ?)";
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (meetingTypeId) {
      whereClause += " AND m.meetingTypeId = ?";
      params.push(meetingTypeId);
    }

    if (meetingStatusId) {
      whereClause += " AND m.meetingStatusId = ?";
      params.push(meetingStatusId);
    }

    if (groupId) {
      whereClause += " AND m.groupId = ?";
      params.push(groupId);
    }

    if (startDate) {
      whereClause += " AND m.meetingDate >= ?";
      params.push(startDate);
    }

    if (endDate) {
      whereClause += " AND m.meetingDate <= ?";
      params.push(endDate);
    }

    const countRow = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM meetings m ${whereClause}`,
      params
    );

    const sql = `
      SELECT 
        m.*,
        mt.name as typeName,
        ms.name as statusName,
        tg.name as groupName,
        u.fullName as createdByName
      FROM meetings m
      LEFT JOIN meeting_types mt ON m.meetingTypeId = mt.id
      LEFT JOIN meeting_statuses ms ON m.meetingStatusId = ms.id
      LEFT JOIN tenant_groups tg ON m.groupId = tg.id
      LEFT JOIN users u ON m.createdBy = u.id
      ${whereClause}
      ORDER BY m.meetingDate DESC, m.id DESC
      LIMIT ? OFFSET ?
    `;

    const meetings = await db.all(sql, [...params, limit, offset]);

    res.json({
      data: meetings,
      pagination: {
        page,
        limit,
        total: countRow?.total || 0,
        totalPages: Math.ceil((countRow?.total || 0) / limit)
      }
    });
  } catch (error) {
    console.error("Get meetings error:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

export const getMeetingById = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    const tenantId = ctx ? ctx.tenantId : 1;
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "Invalid meeting ID" });
    }

    const sql = `
      SELECT 
        m.*,
        mt.name as typeName,
        ms.name as statusName,
        tg.name as groupName,
        u.fullName as createdByName
      FROM meetings m
      LEFT JOIN meeting_types mt ON m.meetingTypeId = mt.id
      LEFT JOIN meeting_statuses ms ON m.meetingStatusId = ms.id
      LEFT JOIN tenant_groups tg ON m.groupId = tg.id
      LEFT JOIN users u ON m.createdBy = u.id
      WHERE m.id = ? AND m.organizationId = ?
    `;

    const meeting = await db.get(sql, [id, tenantId]);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Get meeting by ID error:", error);
    res.status(500).json({ error: "Failed to fetch meeting details" });
  }
};

export const createMeeting = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const { meetingDate, meetingTypeId, location, groupId, note } = req.body;

    if (!meetingDate) {
      return res.status(400).json({ error: "Meeting Date is required." });
    }
    if (!meetingTypeId) {
      return res.status(400).json({ error: "Meeting Type is required." });
    }

    // Default status = Scheduled
    let scheduledStatus = await db.get<{ id: number }>(
      "SELECT id FROM meeting_statuses WHERE tenantId = ? AND name = 'Scheduled'",
      [ctx.tenantId]
    );
    if (!scheduledStatus) {
      scheduledStatus = await db.get<{ id: number }>(
        "SELECT id FROM meeting_statuses WHERE tenantId = ? AND isDefault = 1",
        [ctx.tenantId]
      );
    }
    if (!scheduledStatus) {
      // Fallback first status
      scheduledStatus = await db.get<{ id: number }>(
        "SELECT id FROM meeting_statuses WHERE tenantId = ? LIMIT 1",
        [ctx.tenantId]
      );
    }

    if (!scheduledStatus) {
      return res.status(400).json({ error: "No Meeting Status available. Please create a meeting status first." });
    }

    const meetingNo = await MeetingModel.generateMeetingNo(ctx.tenantId);

    const result = await db.run(
      `INSERT INTO meetings 
       (organizationId, meetingNo, meetingDate, meetingTypeId, meetingStatusId, location, groupId, note, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ctx.tenantId,
        meetingNo,
        meetingDate,
        Number(meetingTypeId),
        scheduledStatus.id,
        location?.trim() || null,
        groupId ? Number(groupId) : null,
        note?.trim() || null,
        ctx.userId
      ]
    );

    const newMeetingId = Number(result.lastID);

    // Send push notification
    const typeRow = await db.get<{ name: string }>("SELECT name FROM meeting_types WHERE id = ?", [meetingTypeId]);
    const groupRow = groupId ? await db.get<{ name: string }>("SELECT name FROM tenant_groups WHERE id = ?", [groupId]) : null;

    const notifTitle = `New Meeting Scheduled: ${meetingNo}`;
    const notifBody = `Meeting scheduled for ${meetingDate}${location ? ` at ${location}` : ''}${groupRow ? ` (${groupRow.name})` : ''}.`;
    notifyUsersForMeeting(ctx.tenantId, groupId ? Number(groupId) : null, notifTitle, notifBody, newMeetingId);

    res.json({
      success: true,
      id: newMeetingId,
      meetingNo,
      message: "Meeting created successfully"
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const updateMeeting = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid meeting ID" });

    const existing = await db.get<{ id: number; meetingNo: string; meetingStatusId: number; groupId: number }>(
      "SELECT id, meetingNo, meetingStatusId, groupId FROM meetings WHERE id = ? AND organizationId = ?",
      [id, ctx.tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const { meetingDate, meetingTypeId, meetingStatusId, location, groupId, note } = req.body;

    const updatedTypeId = meetingTypeId ? Number(meetingTypeId) : undefined;
    const updatedStatusId = meetingStatusId ? Number(meetingStatusId) : undefined;
    const updatedGroupId = groupId !== undefined ? (groupId ? Number(groupId) : null) : existing.groupId;

    await db.run(
      `UPDATE meetings SET
         meetingDate = COALESCE(?, meetingDate),
         meetingTypeId = COALESCE(?, meetingTypeId),
         meetingStatusId = COALESCE(?, meetingStatusId),
         location = ?,
         groupId = ?,
         note = ?,
         updatedBy = ?,
         updatedAt = NOW()
       WHERE id = ? AND organizationId = ?`,
      [
        meetingDate || null,
        updatedTypeId || null,
        updatedStatusId || null,
        location !== undefined ? (location?.trim() || null) : null,
        updatedGroupId,
        note !== undefined ? (note?.trim() || null) : null,
        ctx.userId,
        id,
        ctx.tenantId
      ]
    );

    // If status changed, notify users
    if (updatedStatusId && updatedStatusId !== existing.meetingStatusId) {
      const statusRow = await db.get<{ name: string }>("SELECT name FROM meeting_statuses WHERE id = ?", [updatedStatusId]);
      const statusName = statusRow?.name || 'Updated';
      const notifTitle = `Meeting ${existing.meetingNo} Update`;
      const notifBody = `The meeting status has been updated to "${statusName}".`;
      notifyUsersForMeeting(ctx.tenantId, updatedGroupId, notifTitle, notifBody, id);
    }

    res.json({ success: true, message: "Meeting updated successfully" });
  } catch (error) {
    console.error("Update meeting error:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

export const startMeeting = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid meeting ID" });

    const existing = await db.get<{ id: number; startedAt: string; meetingNo: string; groupId: number }>(
      "SELECT id, startedAt, meetingNo, groupId FROM meetings WHERE id = ? AND organizationId = ?",
      [id, ctx.tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (!existing.startedAt) {
      await db.run(
        "UPDATE meetings SET startedAt = NOW(), updatedBy = ?, updatedAt = NOW() WHERE id = ?",
        [ctx.userId, id]
      );
    }

    res.json({ success: true, message: `Meeting ${existing.meetingNo} started successfully` });
  } catch (error) {
    console.error("Start meeting error:", error);
    res.status(500).json({ error: "Failed to start meeting" });
  }
};

export const completeMeeting = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid meeting ID" });

    const existing = await db.get<{ id: number; meetingNo: string; groupId: number }>(
      "SELECT id, meetingNo, groupId FROM meetings WHERE id = ? AND organizationId = ?",
      [id, ctx.tenantId]
    );

    if (!existing) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const completedStatus = await db.get<{ id: number }>(
      "SELECT id FROM meeting_statuses WHERE tenantId = ? AND name = 'Completed'",
      [ctx.tenantId]
    );

    await db.run(
      `UPDATE meetings SET
         completedAt = NOW(),
         meetingStatusId = COALESCE(?, meetingStatusId),
         updatedBy = ?,
         updatedAt = NOW()
       WHERE id = ?`,
      [completedStatus?.id || null, ctx.userId, id]
    );

    // Push Notification
    notifyUsersForMeeting(ctx.tenantId, existing.groupId, `Meeting ${existing.meetingNo} Completed`, `The meeting ${existing.meetingNo} has been marked as Completed.`, id);

    res.json({ success: true, message: `Meeting ${existing.meetingNo} completed successfully` });
  } catch (error) {
    console.error("Complete meeting error:", error);
    res.status(500).json({ error: "Failed to complete meeting" });
  }
};

export const deleteMeeting = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ error: "Invalid meeting ID" });

    await db.run("DELETE FROM meetings WHERE id = ? AND organizationId = ?", [id, ctx.tenantId]);
    res.json({ success: true, message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Delete meeting error:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

export const getMeetingSummary = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const ctx = await getTenantAndUserId(req);
    const tenantId = ctx ? ctx.tenantId : 1;
    const meetingId = Number(req.params.id);

    if (!meetingId || isNaN(meetingId)) {
      return res.status(400).json({ error: "Invalid meeting ID" });
    }

    const meeting = await db.get(
      `SELECT m.*, mt.name as typeName, ms.name as statusName, tg.name as groupName 
       FROM meetings m
       LEFT JOIN meeting_types mt ON m.meetingTypeId = mt.id
       LEFT JOIN meeting_statuses ms ON m.meetingStatusId = ms.id
       LEFT JOIN tenant_groups tg ON m.groupId = tg.id
       WHERE m.id = ? AND m.organizationId = ?`,
      [meetingId, tenantId]
    );

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // 1. Attendance Summary
    const attCounts = await db.all<{ attendanceStatus: string; cnt: number }[]>(
      "SELECT attendanceStatus, COUNT(*) as cnt FROM attendances WHERE meetingId = ? GROUP BY attendanceStatus",
      [meetingId]
    );
    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    attCounts.forEach(r => {
      if (r.attendanceStatus === 'Present') presentCount = r.cnt;
      if (r.attendanceStatus === 'Absent') absentCount = r.cnt;
      if (r.attendanceStatus === 'Excused') excusedCount = r.cnt;
    });
    const attendanceTotal = presentCount + absentCount + excusedCount;

    // 2. Collections Summary
    const collectionRow = await db.get<{ count: number; total: number }>(
      `SELECT COUNT(mc.Id) as count, COALESCE(SUM(mc.Amount), 0) as total
       FROM MemberCollection mc
       JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
       WHERE fcg.meetingId = ? AND fcg.tenantId = ?`,
      [meetingId, tenantId]
    );

    // 3. Loan Repayments Summary
    const repaymentRow = await db.get<{ count: number; principal: number; interest: number; total: number }>(
      `SELECT 
         COUNT(*) as count, 
         COALESCE(SUM(PrincipalPaid), 0) as principal, 
         COALESCE(SUM(InterestPaid), 0) as interest, 
         COALESCE(SUM(Amount), 0) as total
       FROM LoanPayment
       WHERE meetingId = ?`,
      [meetingId]
    );

    // 4. Expenses Summary
    const expenseRow = await db.get<{ count: number; total: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(Amount), 0) as total
       FROM expenses
       WHERE meetingId = ? AND TenantId = ?`,
      [meetingId, tenantId]
    );

    // 5. Discussions Summary
    const discussionRow = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM meeting_discussions WHERE meetingId = ? AND organizationId = ?`,
      [meetingId, tenantId]
    );

    res.json({
      meeting,
      attendance: {
        total: attendanceTotal,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount
      },
      collections: {
        count: collectionRow?.count || 0,
        total: collectionRow?.total || 0
      },
      repayments: {
        count: repaymentRow?.count || 0,
        principal: repaymentRow?.principal || 0,
        interest: repaymentRow?.interest || 0,
        total: repaymentRow?.total || 0
      },
      expenses: {
        count: expenseRow?.count || 0,
        total: expenseRow?.total || 0
      },
      discussions: {
        count: discussionRow?.count || 0
      }
    });
  } catch (error) {
    console.error("Get meeting summary error:", error);
    res.status(500).json({ error: "Failed to load meeting summary" });
  }
};
