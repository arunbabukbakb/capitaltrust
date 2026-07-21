import { getDatabase } from '../database';

export interface Transaction {
  Id: string;
  TenantId: number | string;
  TransactionNo: string;
  TransactionDate: string;
  TransactionType: 'Collection' | 'LoanIssue' | 'LoanRepayment' | 'Expense' | 'OpeningBalance' | 'Adjustment';
  Amount: number;
  ReferenceType: string;
  ReferenceId: string;
  Narration: string;
  Status: string;
  CreatedBy: string;
  CreatedAt?: string;
  UpdatedBy?: string | null;
  UpdatedAt?: string | null;
  createdByName?: string;
}

export interface TransactionFilters {
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const TransactionModel = {
  async listByTenant(tenantId: string | number, filters?: TransactionFilters): Promise<Transaction[]> {
    const db = getDatabase();
    let query = `
      SELECT t.*, u.fullName as createdByName 
      FROM transactions t 
      LEFT JOIN users u ON t.CreatedBy = u.id 
      WHERE t.TenantId = ?
    `;
    const params: any[] = [tenantId];

    if (filters?.transactionType && filters.transactionType !== 'All') {
      query += ` AND t.TransactionType = ?`;
      params.push(filters.transactionType);
    }

    if (filters?.startDate) {
      query += ` AND (SUBSTR(t.TransactionDate, 1, 10) >= ? OR DATE(t.CreatedAt) >= DATE(?))`;
      params.push(filters.startDate, filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND (SUBSTR(t.TransactionDate, 1, 10) <= ? OR DATE(t.CreatedAt) <= DATE(?))`;
      params.push(filters.endDate, filters.endDate);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`;
      query += ` AND (t.TransactionNo LIKE ? OR t.Narration LIKE ? OR t.ReferenceId LIKE ? OR u.fullName LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY t.CreatedAt DESC, t.TransactionDate DESC`;

    return db.all<Transaction[]>(query, params);
  },

  async listPaginatedByTenant(
    tenantId: string | number,
    filters?: TransactionFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<Transaction>> {
    const db = getDatabase();
    let whereClause = ` WHERE t.TenantId = ?`;
    const params: any[] = [tenantId];

    if (filters?.transactionType && filters.transactionType !== 'All') {
      whereClause += ` AND t.TransactionType = ?`;
      params.push(filters.transactionType);
    }

    if (filters?.startDate) {
      whereClause += ` AND (SUBSTR(t.TransactionDate, 1, 10) >= ? OR DATE(t.CreatedAt) >= DATE(?))`;
      params.push(filters.startDate, filters.startDate);
    }

    if (filters?.endDate) {
      whereClause += ` AND (SUBSTR(t.TransactionDate, 1, 10) <= ? OR DATE(t.CreatedAt) <= DATE(?))`;
      params.push(filters.endDate, filters.endDate);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`;
      whereClause += ` AND (t.TransactionNo LIKE ? OR t.Narration LIKE ? OR t.ReferenceId LIKE ? OR u.fullName LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Count Total matching records
    const countSql = `
      SELECT COUNT(*) as count 
      FROM transactions t 
      LEFT JOIN users u ON t.CreatedBy = u.id 
      ${whereClause}
    `;
    const countRes = await db.get<{ count: number }>(countSql, params);
    const total = countRes?.count || 0;

    // Calculate Pagination Offset
    const pageNum = Math.max(1, Number(page || 1));
    const limitNum = Math.max(1, Number(limit || 10));
    const offset = (pageNum - 1) * limitNum;

    const dataSql = `
      SELECT t.*, u.fullName as createdByName 
      FROM transactions t 
      LEFT JOIN users u ON t.CreatedBy = u.id 
      ${whereClause} 
      ORDER BY t.CreatedAt DESC, t.TransactionDate DESC 
      LIMIT ? OFFSET ?
    `;

    const items = await db.all<Transaction[]>(dataSql, [...params, limitNum, offset]);
    const totalPages = Math.ceil(total / limitNum);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages || 1
    };
  },

  async findById(id: string, tenantId: string | number): Promise<Transaction | undefined> {
    const db = getDatabase();
    return db.get<Transaction>(
      `SELECT t.*, u.fullName as createdByName 
       FROM transactions t 
       LEFT JOIN users u ON t.CreatedBy = u.id 
       WHERE t.Id = ? AND t.TenantId = ?`,
      [id, tenantId]
    );
  },

  async create(txn: Omit<Transaction, 'CreatedAt' | 'createdByName'>): Promise<void> {
    const db = getDatabase();
    await db.run(
      `INSERT INTO transactions (
        Id, TenantId, TransactionNo, TransactionDate, TransactionType, 
        Amount, ReferenceType, ReferenceId, Narration, Status, CreatedBy, UpdatedBy, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txn.Id,
        txn.TenantId,
        txn.TransactionNo,
        txn.TransactionDate,
        txn.TransactionType,
        txn.Amount,
        txn.ReferenceType,
        txn.ReferenceId,
        txn.Narration,
        txn.Status || 'Completed',
        txn.CreatedBy,
        txn.UpdatedBy || null,
        txn.UpdatedAt || null
      ]
    );
  },

  async countByTenant(tenantId: string | number): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE TenantId = ?`,
      [tenantId]
    );
    return res?.count || 0;
  },

  async getSummaryByTenant(
    tenantId: string | number,
    filters?: TransactionFilters
  ): Promise<{ totalVolume: number; totalInflow: number; totalOutflow: number; totalCount: number }> {
    const db = getDatabase();
    let whereClause = ` WHERE t.TenantId = ?`;
    const params: any[] = [tenantId];

    if (filters?.transactionType && filters.transactionType !== 'All') {
      whereClause += ` AND t.TransactionType = ?`;
      params.push(filters.transactionType);
    }

    if (filters?.startDate) {
      whereClause += ` AND (SUBSTR(t.TransactionDate, 1, 10) >= ? OR DATE(t.CreatedAt) >= DATE(?))`;
      params.push(filters.startDate, filters.startDate);
    }

    if (filters?.endDate) {
      whereClause += ` AND (SUBSTR(t.TransactionDate, 1, 10) <= ? OR DATE(t.CreatedAt) <= DATE(?))`;
      params.push(filters.endDate, filters.endDate);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`;
      whereClause += ` AND (t.TransactionNo LIKE ? OR t.Narration LIKE ? OR t.ReferenceId LIKE ? OR u.fullName LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const query = `
      SELECT 
        COALESCE(SUM(t.Amount), 0) as totalVolume,
        COALESCE(SUM(CASE WHEN t.TransactionType IN ('Collection', 'LoanRepayment') THEN t.Amount ELSE 0 END), 0) as totalInflow,
        COALESCE(SUM(CASE WHEN t.TransactionType IN ('LoanIssue', 'Expense') THEN t.Amount ELSE 0 END), 0) as totalOutflow,
        COUNT(*) as totalCount
      FROM transactions t
      LEFT JOIN users u ON t.CreatedBy = u.id
      ${whereClause}
    `;

    const row = await db.get<{ totalVolume: number; totalInflow: number; totalOutflow: number; totalCount: number }>(query, params);
    return {
      totalVolume: Number(row?.totalVolume || 0),
      totalInflow: Number(row?.totalInflow || 0),
      totalOutflow: Number(row?.totalOutflow || 0),
      totalCount: Number(row?.totalCount || 0)
    };
  }
};
