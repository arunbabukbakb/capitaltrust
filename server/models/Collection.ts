import { getDatabase } from '../database';

export interface CollectionType {
  id: number;
  typeName: string;
  status: number; // 0 or 1
  tenantId: string;
}

export interface CollectionGroup {
  id: number;
  collectionTypeId: number;
  collectionDate: string;
  tenantId: string;
  typeName?: string;
  membersCount?: number;
  totalAmount?: number;
}

export interface MemberCollection {
  id: number;
  collectionGroupId: number;
  userId: string;
  amount: number;
}

export const CollectionModel = {
  async listTypes(tenantId: string): Promise<CollectionType[]> {
    const db = getDatabase();
    return db.all<CollectionType[]>(
      "SELECT Id as id, TypeName as typeName, Status as status, tenantId FROM CollectionType WHERE tenantId = ? ORDER BY Id DESC",
      [tenantId]
    );
  },

  async findTypeByName(typeName: string, tenantId: string): Promise<CollectionType | undefined> {
    const db = getDatabase();
    return db.get<CollectionType>(
      "SELECT Id as id, TypeName as typeName, Status as status, tenantId FROM CollectionType WHERE TypeName = ? AND tenantId = ?",
      [typeName, tenantId]
    );
  },

  async findTypeByNameExcludeId(typeName: string, tenantId: string, id: number): Promise<CollectionType | undefined> {
    const db = getDatabase();
    return db.get<CollectionType>(
      "SELECT Id as id, TypeName as typeName, Status as status, tenantId FROM CollectionType WHERE TypeName = ? AND tenantId = ? AND Id != ?",
      [typeName, tenantId, id]
    );
  },

  async createType(typeName: string, tenantId: string, status: number = 1): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    return db.run("INSERT INTO CollectionType (TypeName, Status, tenantId) VALUES (?, ?, ?)", [typeName, status, tenantId]);
  },

  async updateType(id: number, typeName: string, status: number): Promise<void> {
    const db = getDatabase();
    await db.run("UPDATE CollectionType SET TypeName = ?, Status = ? WHERE Id = ?", [typeName, status, id]);
  },

  async createGroup(collectionTypeId: number, collectionDate: string, tenantId: string): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    return db.run(
      "INSERT INTO FundCollectionGroup (CollectionTypeId, CollectionDate, tenantId) VALUES (?, ?, ?)",
      [collectionTypeId, collectionDate, tenantId]
    );
  },

  async updateGroup(id: number, collectionTypeId: number, collectionDate: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      "UPDATE FundCollectionGroup SET CollectionTypeId = ?, CollectionDate = ? WHERE Id = ?",
      [collectionTypeId, collectionDate, id]
    );
  },

  async getGroupByIdAndTenant(id: number, tenantId: string): Promise<any | undefined> {
    const db = getDatabase();
    return db.get(
      "SELECT Id as id, CollectionTypeId as collectionTypeId, CollectionDate as date FROM FundCollectionGroup WHERE Id = ? AND tenantId = ?",
      [id, tenantId]
    );
  },

  async listGroupsByTenant(tenantId: string): Promise<CollectionGroup[]> {
    const db = getDatabase();
    return db.all<CollectionGroup[]>(
      `SELECT 
        fcg.Id as id, 
        fcg.CollectionTypeId as collectionTypeId,
        ct.TypeName as typeName, 
        fcg.CollectionDate as date, 
        COALESCE(SUM(mc.Amount), 0) as totalAmount
      FROM FundCollectionGroup fcg
      JOIN CollectionType ct ON fcg.CollectionTypeId = ct.Id
      LEFT JOIN MemberCollection mc ON fcg.Id = mc.CollectionGroupId
      WHERE fcg.tenantId = ?
      GROUP BY fcg.Id
      ORDER BY fcg.Id DESC`,
      [tenantId]
    );
  },

  async listGroupDetailsByTenant(groupId: number, tenantId: string): Promise<any[]> {
    const db = getDatabase();
    return db.all<any[]>(
      `SELECT 
        u.id as userId, 
        u.fullName, 
        u.email,
        COALESCE(mc.Amount, 0) as amount
      FROM users u
      LEFT JOIN MemberCollection mc ON u.id = mc.UserId AND mc.CollectionGroupId = ?
      WHERE u.tenantId = ?
      ORDER BY u.fullName`,
      [groupId, tenantId]
    );
  },

  async getCollectionSummary(typeId: number, tenantId: string): Promise<any | undefined> {
    const db = getDatabase();
    return db.get(
      `SELECT 
        COALESCE(SUM(mc.Amount), 0) as totalAmount,
        COUNT(DISTINCT mc.UserId) as membersCount
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      JOIN users u ON mc.UserId = u.id
      WHERE fcg.CollectionTypeId = ? AND u.tenantId = ?`,
      [typeId, tenantId]
    );
  },

  async getAuditReport(collectionTypeId: number, tenantId: string): Promise<any[]> {
    const db = getDatabase();
    return db.all<any[]>(
      `SELECT 
        u.id as userId, 
        u.fullName, 
        u.email, 
        u.phoneNumber,
        COALESCE(sub.totalAmount, 0) as amount,
        sub.lastDate as date
      FROM users u
      LEFT JOIN (
        SELECT 
          mc.UserId,
          SUM(mc.Amount) as totalAmount,
          MAX(fcg.CollectionDate) as lastDate
        FROM MemberCollection mc
        JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
        WHERE fcg.CollectionTypeId = ?
        GROUP BY mc.UserId
      ) sub ON u.id = sub.UserId
      WHERE u.tenantId = ?
      ORDER BY u.fullName`,
      [collectionTypeId, tenantId]
    );
  },

  async clearMemberCollectionsByGroup(groupId: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM MemberCollection WHERE CollectionGroupId = ?", [groupId]);
  },

  async addMemberCollection(groupId: number, userId: string, amount: number): Promise<void> {
    const db = getDatabase();
    await db.run(
      "INSERT INTO MemberCollection (CollectionGroupId, UserId, Amount) VALUES (?, ?, ?)",
      [groupId, userId, amount]
    );
  },

  async listMemberContributions(userId: string): Promise<any[]> {
    const db = getDatabase();
    return db.all<any[]>(
      `SELECT
        mc.Id         as id,
        fcg.CollectionDate as date,
        ct.TypeName   as typeName,
        mc.Amount     as amount
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      JOIN CollectionType ct        ON fcg.CollectionTypeId = ct.Id
      WHERE mc.UserId = ?
      ORDER BY fcg.CollectionDate DESC, mc.Id DESC`,
      [userId]
    );
  }
};
