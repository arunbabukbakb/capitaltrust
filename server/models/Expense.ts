import { getDatabase } from '../database';

export interface Expense {
  Id: string;
  TenantId: number | string;
  ExpenseDate: string;
  Amount: number;
  PaymentMode: 'Cash' | 'Bank' | 'UPI';
  ReferenceNo?: string | null;
  Description: string;
  ExpenseBy?: string | null;
  Status: 'Draft' | 'Approved' | 'Cancelled';
  CreatedBy: string;
  CreatedAt?: string;
  createdByName?: string;
  expenseByName?: string | null;
}

export const ExpenseModel = {
  async listByTenant(tenantId: string | number): Promise<Expense[]> {
    const db = getDatabase();
    return db.all<Expense[]>(
      `SELECT e.*, u.fullName as createdByName, u2.fullName as expenseByName 
       FROM expenses e 
       LEFT JOIN users u ON e.CreatedBy = u.id 
       LEFT JOIN users u2 ON e.ExpenseBy = u2.id
       WHERE e.TenantId = ? 
       ORDER BY e.CreatedAt DESC, e.ExpenseDate DESC`,
      [tenantId]
    );
  },

  async findById(id: string, tenantId: string | number): Promise<Expense | undefined> {
    const db = getDatabase();
    return db.get<Expense>(
      `SELECT e.*, u.fullName as createdByName, u2.fullName as expenseByName 
       FROM expenses e 
       LEFT JOIN users u ON e.CreatedBy = u.id 
       LEFT JOIN users u2 ON e.ExpenseBy = u2.id
       WHERE e.Id = ? AND e.TenantId = ?`,
      [id, tenantId]
    );
  },

  async create(expense: Omit<Expense, 'CreatedAt' | 'createdByName' | 'expenseByName'>): Promise<void> {
    const db = getDatabase();
    await db.run(
      `INSERT INTO expenses (Id, TenantId, ExpenseDate, Amount, PaymentMode, ReferenceNo, Description, ExpenseBy, Status, CreatedBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.Id,
        expense.TenantId,
        expense.ExpenseDate,
        expense.Amount,
        expense.PaymentMode,
        expense.ReferenceNo || null,
        expense.Description,
        expense.ExpenseBy || null,
        expense.Status,
        expense.CreatedBy
      ]
    );
  },

  async updateStatus(id: string, tenantId: string | number, status: 'Approved' | 'Cancelled'): Promise<void> {
    const db = getDatabase();
    await db.run(
      `UPDATE expenses SET Status = ? WHERE Id = ? AND TenantId = ?`,
      [status, id, tenantId]
    );
  },

  async update(id: string, tenantId: string | number, expense: Partial<Omit<Expense, 'Id' | 'TenantId' | 'CreatedAt' | 'CreatedBy'>>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (expense.ExpenseDate !== undefined) {
      fields.push('ExpenseDate = ?');
      values.push(expense.ExpenseDate);
    }
    if (expense.Amount !== undefined) {
      fields.push('Amount = ?');
      values.push(expense.Amount);
    }
    if (expense.PaymentMode !== undefined) {
      fields.push('PaymentMode = ?');
      values.push(expense.PaymentMode);
    }
    if (expense.ReferenceNo !== undefined) {
      fields.push('ReferenceNo = ?');
      values.push(expense.ReferenceNo);
    }
    if (expense.Description !== undefined) {
      fields.push('Description = ?');
      values.push(expense.Description);
    }
    if (expense.ExpenseBy !== undefined) {
      fields.push('ExpenseBy = ?');
      values.push(expense.ExpenseBy || null);
    }

    if (fields.length === 0) return;

    values.push(id, tenantId);
    await db.run(
      `UPDATE expenses SET ${fields.join(', ')} WHERE Id = ? AND TenantId = ?`,
      values
    );
  },

  async countByTenant(tenantId: string | number): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM expenses WHERE TenantId = ?`,
      [tenantId]
    );
    return res?.count || 0;
  },

  async getTodaySummary(tenantId: string | number, dateStr: string): Promise<{ totalAmount: number; count: number; totalLoggedCount: number }> {
    const db = getDatabase();
    const todayRes = await db.get<{ totalAmount: number; count: number }>(
      `SELECT COALESCE(SUM(Amount), 0) as totalAmount, COUNT(*) as count 
       FROM expenses 
       WHERE TenantId = ? AND ExpenseDate = ? AND Status != 'Cancelled'`,
      [tenantId, dateStr]
    );
    const totalRes = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM expenses WHERE TenantId = ?`,
      [tenantId]
    );
    return {
      totalAmount: todayRes?.totalAmount || 0,
      count: todayRes?.count || 0,
      totalLoggedCount: totalRes?.count || 0
    };
  }
};
