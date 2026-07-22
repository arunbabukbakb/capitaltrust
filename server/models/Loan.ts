import { getDatabase } from '../database';

export interface Loan {
  Id: string;
  LoanNo: string;
  LoanType: 'Single' | 'Group';
  Amount: number;
  OutstandingPrincipal: number;
  TenureMonths: number;
  StartDate: string;
  EndDate: string;
  InterestMode: 'Fixed' | 'Variable';
  InterestRate?: number | null;
  IsCompound?: number | boolean;
  Status: 'Pending' | 'Active' | 'Closed' | 'Cancelled';
  CreatedBy?: string | null;
  CreatedDate: string;
}

export interface LoanMember {
  Id: number;
  LoanId: string;
  UserId: string;
  LoanShareAmount: number;
  OutstandingPrincipal: number;
  CreatedDate: string;
  Status: 'Active' | 'Closed' | 'Cancelled';
  fullName?: string;
}

export interface LoanInterestSlab {
  Id: number;
  LoanId: string;
  FromAmount: number;
  ToAmount: number;
  InterestRate: number;
}

export interface LoanDue {
  Id: number;
  LoanMemberId: number;
  DueMonth: number;
  OpeningPrincipal: number;
  PrincipalDue: number;
  InterestDue: number;
  CarryForwardInterest: number;
  TotalDue: number;
  PaidAmount: number;
  InterestPaid: number;
  PrincipalPaid: number;
  ClosingPrincipal: number;
  Status: 'Pending' | 'Partial' | 'Paid';
}

export interface LoanPayment {
  Id: number;
  LoanMemberId: number;
  DueMonth: number;
  PaymentDate: string;
  Amount: number;
  InterestPaid: number;
  PrincipalPaid: number;
  ApprovedBy?: string | null;
  ApprovedDate?: string | null;
}

export const LoanModel = {
  async listAllLoans(tenantId?: string): Promise<any[]> {
    const db = getDatabase();
    if (tenantId) {
      return db.all<any[]>(`
        SELECT
          l.Id,
          l.LoanNo,
          l.LoanType,
          l.Amount,
          l.OutstandingPrincipal,
          l.TenureMonths,
          l.StartDate,
          l.EndDate,
          l.InterestMode,
          l.InterestRate,
          l.IsCompound,
          l.Status,
          l.CreatedBy,
          l.CreatedDate,
          COALESCE(p.PaidToDate, 0) as PaidToDate,
          GROUP_CONCAT(u.fullName SEPARATOR ', ') as MemberNames,
          GROUP_CONCAT(lm.UserId SEPARATOR ', ') as MemberIds
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        LEFT JOIN (
          SELECT lm.LoanId, SUM(lp.Amount) as PaidToDate
          FROM LoanPayment lp
          JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
          GROUP BY lm.LoanId
        ) p ON p.LoanId = l.Id
        GROUP BY l.Id
        ORDER BY l.CreatedDate DESC
      `, [tenantId]);
    }
    return db.all<any[]>(`
      SELECT
        l.Id,
        l.LoanNo,
        l.LoanType,
        l.Amount,
        l.OutstandingPrincipal,
        l.TenureMonths,
        l.StartDate,
        l.EndDate,
        l.InterestMode,
        l.InterestRate,
        l.IsCompound,
        l.Status,
        l.CreatedBy,
        l.CreatedDate,
        COALESCE(p.PaidToDate, 0) as PaidToDate,
        GROUP_CONCAT(u.fullName SEPARATOR ', ') as MemberNames,
        GROUP_CONCAT(lm.UserId SEPARATOR ', ') as MemberIds
      FROM Loan l
      LEFT JOIN LoanMember lm ON lm.LoanId = l.Id
      LEFT JOIN users u ON u.id = lm.UserId
      LEFT JOIN (
        SELECT lm.LoanId, SUM(lp.Amount) as PaidToDate
        FROM LoanPayment lp
        JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
        GROUP BY lm.LoanId
      ) p ON p.LoanId = l.Id
      GROUP BY l.Id
      ORDER BY l.CreatedDate DESC
    `);
  },

  async getSlabsByLoanIds(loanIds: string[]): Promise<LoanInterestSlab[]> {
    const db = getDatabase();
    if (loanIds.length === 0) return [];
    return db.all<LoanInterestSlab[]>(
      `SELECT * FROM LoanInterestSlab WHERE LoanId IN (${loanIds.map(() => "?").join(",")}) ORDER BY FromAmount`,
      loanIds
    );
  },

  async getPaymentsCountByLoanIds(loanIds: string[]): Promise<{ LoanId: string; RepaymentCount: number }[]> {
    const db = getDatabase();
    if (loanIds.length === 0) return [];
    return db.all<{ LoanId: string; RepaymentCount: number }[]>(
      `SELECT lm.LoanId, COUNT(*) as RepaymentCount FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id WHERE lm.LoanId IN (${loanIds.map(() => "?").join(",")}) GROUP BY lm.LoanId`,
      loanIds
    );
  },

  async getMembersByLoanIds(loanIds: string[]): Promise<any[]> {
    const db = getDatabase();
    if (loanIds.length === 0) return [];
    return db.all<any[]>(
      `SELECT lm.*, u.fullName FROM LoanMember lm LEFT JOIN users u ON u.id = lm.UserId WHERE LoanId IN (${loanIds.map(() => "?").join(",")}) ORDER BY lm.Id`,
      loanIds
    );
  },

  async findById(id: string): Promise<any | undefined> {
    const db = getDatabase();
    return db.get("SELECT * FROM Loan WHERE Id = ?", [id]);
  },

  async findMemberById(id: number): Promise<any | undefined> {
    const db = getDatabase();
    return db.get("SELECT * FROM LoanMember WHERE Id = ?", [id]);
  },

  async countAll(): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan");
    return res?.count || 0;
  },

  async createLoan(loan: Omit<Loan, 'OutstandingPrincipal'>): Promise<void> {
    const db = getDatabase();
    await db.run(
      `INSERT INTO Loan (Id, LoanNo, LoanType, Amount, OutstandingPrincipal, TenureMonths, StartDate, EndDate, InterestMode, InterestRate, IsCompound, Status, CreatedBy, CreatedDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loan.Id, loan.LoanNo, loan.LoanType, loan.Amount, loan.Amount, loan.TenureMonths, loan.StartDate, loan.EndDate, loan.InterestMode, loan.InterestRate || null, loan.IsCompound ? 1 : 0, loan.Status, loan.CreatedBy || null, loan.CreatedDate]
    );
  },

  async addLoanMember(member: Omit<LoanMember, 'Id' | 'OutstandingPrincipal'>): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    return db.run(
      "INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate, Status) VALUES (?, ?, ?, ?, ?, ?)",
      [member.LoanId, member.UserId, member.LoanShareAmount, member.LoanShareAmount, member.CreatedDate, member.Status]
    );
  },

  async addInterestSlab(slab: Omit<LoanInterestSlab, 'Id'>): Promise<void> {
    const db = getDatabase();
    await db.run(
      "INSERT INTO LoanInterestSlab (LoanId, FromAmount, ToAmount, InterestRate) VALUES (?, ?, ?, ?)",
      [slab.LoanId, slab.FromAmount, slab.ToAmount, slab.InterestRate]
    );
  },

  async createDueSchedule(due: Omit<LoanDue, 'Id'>): Promise<{ lastID?: number | string; changes?: number }> {
    const db = getDatabase();
    return db.run(
      `INSERT INTO LoanDue (LoanMemberId, DueMonth, OpeningPrincipal, PrincipalDue, InterestDue, CarryForwardInterest, TotalDue, PaidAmount, InterestPaid, PrincipalPaid, ClosingPrincipal, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [due.LoanMemberId, due.DueMonth, due.OpeningPrincipal, due.PrincipalDue, due.InterestDue, due.CarryForwardInterest, due.TotalDue, due.PaidAmount, due.InterestPaid, due.PrincipalPaid, due.ClosingPrincipal, due.Status]
    );
  },

  async deleteLoan(id: string): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM Loan WHERE Id = ?", [id]);
  },

  async listLoanMembers(loanId: string, tenantId?: string | number): Promise<any[]> {
    const db = getDatabase();
    if (tenantId) {
      return db.all<any[]>(
        "SELECT lm.*, u.fullName, u.email FROM LoanMember lm JOIN users u ON lm.UserId = u.id WHERE lm.LoanId = ? AND u.tenantId = ?",
        [loanId, tenantId]
      );
    }
    return db.all<any[]>(
      "SELECT lm.*, u.fullName, u.email FROM LoanMember lm JOIN users u ON lm.UserId = u.id WHERE lm.LoanId = ?",
      [loanId]
    );
  },

  async listDuesByMember(memberId: number): Promise<LoanDue[]> {
    const db = getDatabase();
    return db.all<LoanDue[]>("SELECT * FROM LoanDue WHERE LoanMemberId = ? ORDER BY DueMonth", [memberId]);
  },

  async listPaymentsByMember(memberId: number): Promise<LoanPayment[]> {
    const db = getDatabase();
    return db.all<LoanPayment[]>("SELECT * FROM LoanPayment WHERE LoanMemberId = ? ORDER BY DueMonth", [memberId]);
  },

  async updateLoan(loanId: string, loan: Partial<Loan>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(loan).forEach(([key, val]) => {
      fields.push(`${key} = ?`);
      values.push(val);
    });
    values.push(loanId);
    await db.run(`UPDATE Loan SET ${fields.join(', ')} WHERE Id = ?`, values);
  },

  async deleteLoanMembers(loanId: string): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM LoanMember WHERE LoanId = ?", [loanId]);
  },

  async deleteInterestSlabs(loanId: string): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM LoanInterestSlab WHERE LoanId = ?", [loanId]);
  },

  async getPaidAmountByLoanId(loanId: string): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ total: number }>(
      "SELECT COALESCE(SUM(lp.Amount), 0) as total FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id WHERE lm.LoanId = ?",
      [loanId]
    );
    return res?.total || 0;
  },

  async updateLoanOutstanding(loanId: string, outstanding: number): Promise<void> {
    const db = getDatabase();
    await db.run("UPDATE Loan SET OutstandingPrincipal = ? WHERE Id = ?", [outstanding, loanId]);
  },

  async updateLoanMemberOutstanding(memberId: number, outstanding: number): Promise<void> {
    const db = getDatabase();
    await db.run("UPDATE LoanMember SET OutstandingPrincipal = ? WHERE Id = ?", [outstanding, memberId]);
  },

  async updateLoanDue(dueId: number, due: Partial<LoanDue>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    Object.entries(due).forEach(([key, val]) => {
      fields.push(`${key} = ?`);
      values.push(val);
    });
    values.push(dueId);
    await db.run(`UPDATE LoanDue SET ${fields.join(', ')} WHERE Id = ?`, values);
  },

  async addPayment(payment: Omit<LoanPayment, 'Id'>): Promise<{ lastID?: number | string }> {
    const db = getDatabase();
    return db.run(
      `INSERT INTO LoanPayment (LoanMemberId, DueMonth, PaymentDate, Amount, InterestPaid, PrincipalPaid, ApprovedBy, ApprovedDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment.LoanMemberId, payment.DueMonth, payment.PaymentDate, payment.Amount, payment.InterestPaid, payment.PrincipalPaid, payment.ApprovedBy || null, payment.ApprovedDate || null]
    );
  },

  async findDueByMemberAndMonth(memberId: number, month: number): Promise<LoanDue | undefined> {
    const db = getDatabase();
    return db.get<LoanDue>("SELECT * FROM LoanDue WHERE LoanMemberId = ? AND DueMonth = ?", [memberId, month]);
  },

  async getPaymentSumByMemberAndMonth(memberId: number, month: number): Promise<{ totalPaid: number; interestPaid: number; principalPaid: number }> {
    const db = getDatabase();
    const res = await db.get(
      "SELECT SUM(Amount) as totalPaid, SUM(InterestPaid) as intPaid, SUM(PrincipalPaid) as prinPaid FROM LoanPayment WHERE LoanMemberId = ? AND DueMonth = ?",
      [memberId, month]
    );
    return {
      totalPaid: Number(res?.totalPaid || 0),
      interestPaid: Number(res?.intPaid || 0),
      principalPaid: Number(res?.prinPaid || 0)
    };
  },

  async getMaxPaymentMonthByMember(memberId: number): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ maxMonth: number }>(
      "SELECT MAX(DueMonth) as maxMonth FROM LoanPayment WHERE LoanMemberId = ?",
      [memberId]
    );
    return res?.maxMonth || 0;
  },

  async listSingleLoansByMonth(month: number, tenantId: string | number): Promise<any[]> {
    const db = getDatabase();
    return db.all<any[]>(
      `SELECT DISTINCT l.* FROM Loan l
       JOIN LoanMember lm ON l.Id = lm.LoanId
       JOIN users u ON lm.UserId = u.id AND u.tenantId = ?
       LEFT JOIN LoanPayment lp ON lm.Id = lp.LoanMemberId AND lp.DueMonth = ?
       WHERE l.LoanType = 'Single' AND (l.Status = 'Active' OR (l.Status = 'Closed' AND lp.Id IS NOT NULL))`,
      [tenantId, month]
    );
  },

  async listActiveLoansByUserId(userId: string): Promise<any[]> {
    const db = getDatabase();
    return db.all<any[]>(
      `SELECT l.* FROM Loan l 
       JOIN LoanMember lm ON l.Id = lm.LoanId 
       WHERE lm.UserId = ? AND l.Status = 'Active'`,
      [userId]
    );
  },

  async findPaymentByMemberAndMonth(memberId: number, month: number): Promise<LoanPayment | undefined> {
    const db = getDatabase();
    return db.get<LoanPayment>("SELECT * FROM LoanPayment WHERE LoanMemberId = ? AND DueMonth = ?", [memberId, month]);
  },

  async deletePayment(id: number): Promise<void> {
    const db = getDatabase();
    await db.run("DELETE FROM LoanPayment WHERE Id = ?", [id]);
  },

  async getLatestClosingPrincipal(memberId: number, month: number): Promise<number | null> {
    const db = getDatabase();
    const res = await db.get<{ ClosingPrincipal: number }>(
      "SELECT ClosingPrincipal FROM LoanDue WHERE LoanMemberId = ? AND DueMonth = ?",
      [memberId, month]
    );
    return res ? res.ClosingPrincipal : null;
  },

  async getSumOutstandingPrincipalByLoan(loanId: string): Promise<number> {
    const db = getDatabase();
    const res = await db.get<{ total: number }>(
      "SELECT SUM(OutstandingPrincipal) as total FROM LoanMember WHERE LoanId = ?",
      [loanId]
    );
    return res?.total || 0;
  },

  async updatePayment(id: number, payment: Partial<LoanPayment>): Promise<void> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(payment).forEach(([key, val]) => {
      fields.push(`${key} = ?`);
      values.push(val);
    });
    values.push(id);
    await db.run(`UPDATE LoanPayment SET ${fields.join(', ')} WHERE Id = ?`, values);
  }
};
