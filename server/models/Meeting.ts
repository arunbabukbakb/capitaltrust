import { getDatabase } from '../database';

export interface MeetingType {
  id: number;
  tenantId: number;
  name: string;
  status: number | boolean;
  createdBy: string;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface MeetingStatus {
  id: number;
  tenantId: number;
  name: string;
  isDefault: number | boolean;
  isSystem: number | boolean;
  status: number | boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface Meeting {
  id: number;
  organizationId: number;
  meetingNo: string;
  meetingDate: string;
  meetingTypeId: number;
  meetingStatusId: number;
  location?: string | null;
  groupId?: number | null;
  note?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string | null;

  // Joined display attributes
  typeName?: string;
  statusName?: string;
  groupName?: string;
  createdByName?: string;
}

export interface AttendanceRecord {
  id?: number;
  organizationId: number;
  meetingId: number;
  memberId: string;
  attendanceStatus: 'Present' | 'Absent' | 'Excused';
  remarks?: string | null;
  createdBy: string;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string | null;

  // Joined details
  memberName?: string;
  memberEmail?: string;
}

export interface MeetingDiscussion {
  id?: number;
  organizationId: number;
  meetingId: number;
  title: string;
  description?: string | null;
  discussedBy?: string | null;
  remarks?: string | null;
  createdBy: string;
  createdAt?: string;
  updatedBy?: string | null;
  updatedAt?: string | null;

  createdByName?: string;
}

export class MeetingModel {
  static async generateMeetingNo(organizationId: number): Promise<string> {
    const db = getDatabase();
    const row = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM meetings WHERE organizationId = ?",
      [organizationId]
    );
    const nextNum = (row?.count || 0) + 1;
    return `MTG-${String(nextNum).padStart(6, '0')}`;
  }

  // Master: Meeting Types
  static async ensureSystemDefaultTypes() {
    const db = getDatabase();
    const defaultMeetingTypes = ['Regular', 'Special', 'Emergency', 'Other'];
    for (const name of defaultMeetingTypes) {
      const exists = await db.get("SELECT id FROM meeting_types WHERE name = ? AND (tenantId IS NULL OR tenantId = 0)", [name]);
      if (!exists) {
        await db.run(
          "INSERT INTO meeting_types (tenantId, name, status, createdBy) VALUES (NULL, ?, 1, 'system')",
          [name]
        );
      }
    }
  }

  static async listMeetingTypes(tenantId: number): Promise<MeetingType[]> {
    const db = getDatabase();
    await this.ensureSystemDefaultTypes();
    return db.all<MeetingType[]>(
      "SELECT * FROM meeting_types WHERE tenantId = ? OR tenantId IS NULL OR tenantId = 0 ORDER BY id ASC",
      [tenantId]
    );
  }

  static async getMeetingTypeById(id: number, tenantId: number): Promise<MeetingType | undefined> {
    const db = getDatabase();
    return db.get<MeetingType>(
      "SELECT * FROM meeting_types WHERE id = ? AND (tenantId = ? OR tenantId IS NULL OR tenantId = 0)",
      [id, tenantId]
    );
  }

  static async createMeetingType(tenantId: number, name: string, status: number, createdBy: string) {
    const db = getDatabase();
    const existing = await db.get(
      "SELECT id FROM meeting_types WHERE LOWER(name) = LOWER(?) AND (tenantId = ? OR tenantId IS NULL OR tenantId = 0)",
      [name, tenantId]
    );
    if (existing) {
      throw new Error(`Meeting type "${name}" already exists.`);
    }
    return db.run(
      "INSERT INTO meeting_types (tenantId, name, status, createdBy) VALUES (?, ?, ?, ?)",
      [tenantId, name, status, createdBy]
    );
  }

  static async updateMeetingType(id: number, tenantId: number, name: string, status: number, updatedBy: string) {
    const db = getDatabase();
    return db.run(
      "UPDATE meeting_types SET name = ?, status = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ? AND (tenantId = ? OR tenantId IS NULL OR tenantId = 0)",
      [name, status, updatedBy, id, tenantId]
    );
  }

  static async deleteMeetingType(id: number, tenantId: number) {
    const db = getDatabase();
    const existing = await this.getMeetingTypeById(id, tenantId);
    if (!existing || existing.tenantId === null || existing.tenantId === 0 || existing.createdBy === 'system') {
      throw new Error("System default meeting types cannot be deleted.");
    }
    return db.run("DELETE FROM meeting_types WHERE id = ? AND tenantId = ?", [id, tenantId]);
  }

  // Master: Meeting Statuses
  static async ensureSystemDefaultStatuses() {
    const db = getDatabase();
    const defaultStatuses = [
      { name: 'Scheduled', isDefault: 1, isSystem: 1 },
      { name: 'Postponed', isDefault: 0, isSystem: 1 },
      { name: 'Completed', isDefault: 0, isSystem: 1 }
    ];
    for (const st of defaultStatuses) {
      const exists = await db.get("SELECT id FROM meeting_statuses WHERE name = ? AND (tenantId IS NULL OR tenantId = 0 OR isSystem = 1)", [st.name]);
      if (!exists) {
        await db.run(
          "INSERT INTO meeting_statuses (tenantId, name, isDefault, isSystem, status, createdBy) VALUES (NULL, ?, ?, ?, 1, 'system')",
          [st.name, st.isDefault, st.isSystem]
        );
      } else {
        await db.run("UPDATE meeting_statuses SET isSystem = 1 WHERE name = ?", [st.name]);
      }
    }
  }

  static async listMeetingStatuses(tenantId: number): Promise<MeetingStatus[]> {
    const db = getDatabase();
    await this.ensureSystemDefaultStatuses();
    return db.all<MeetingStatus[]>(
      "SELECT * FROM meeting_statuses WHERE tenantId = ? OR tenantId IS NULL OR tenantId = 0 OR isSystem = 1 ORDER BY id ASC",
      [tenantId]
    );
  }

  static async getMeetingStatusById(id: number, tenantId: number): Promise<MeetingStatus | undefined> {
    const db = getDatabase();
    return db.get<MeetingStatus>(
      "SELECT * FROM meeting_statuses WHERE id = ? AND (tenantId = ? OR tenantId IS NULL OR tenantId = 0 OR isSystem = 1)",
      [id, tenantId]
    );
  }

  static async createMeetingStatus(tenantId: number, name: string, status: number, createdBy: string) {
    const db = getDatabase();
    const existing = await db.get(
      "SELECT id FROM meeting_statuses WHERE LOWER(name) = LOWER(?) AND (tenantId = ? OR tenantId IS NULL OR tenantId = 0 OR isSystem = 1)",
      [name, tenantId]
    );
    if (existing) {
      throw new Error(`Meeting status "${name}" already exists.`);
    }
    return db.run(
      "INSERT INTO meeting_statuses (tenantId, name, isDefault, isSystem, status, createdBy) VALUES (?, ?, 0, 0, ?, ?)",
      [tenantId, name, status, createdBy]
    );
  }

  static async updateMeetingStatus(id: number, tenantId: number, name: string, status: number, updatedBy: string) {
    const db = getDatabase();
    const existing = await this.getMeetingStatusById(id, tenantId);
    if (existing?.isSystem || existing?.tenantId === null || existing?.tenantId === 0) {
      throw new Error("System default statuses cannot be modified.");
    }
    return db.run(
      "UPDATE meeting_statuses SET name = ?, status = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ? AND tenantId = ?",
      [name, status, updatedBy, id, tenantId]
    );
  }

  static async deleteMeetingStatus(id: number, tenantId: number) {
    const db = getDatabase();
    const existing = await this.getMeetingStatusById(id, tenantId);
    if (existing?.isSystem || existing?.tenantId === null || existing?.tenantId === 0) {
      throw new Error("System default statuses cannot be deleted.");
    }
    return db.run("DELETE FROM meeting_statuses WHERE id = ? AND tenantId = ?", [id, tenantId]);
  }
}
