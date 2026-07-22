import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { ExpenseModel } from '../models/Expense';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
  const monthlyRate = (annualInterestRate || 12) / 12 / 100;
  if (monthlyRate === 0) {
    return tenureMonths ? principal / tenureMonths : 0;
  }
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi);
}

function getNextPaymentDueDate(startDateStr: string, repaymentCount: number): string {
  if (!startDateStr) return 'TBD';
  const date = new Date(startDateStr);
  date.setMonth(date.getMonth() + (repaymentCount || 0) + 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export const getStats = async (req: Request, res: Response) => {
  const db = getDatabase();
  const tenantId = req.headers['x-tenant-id'] as string;
  try {
    let totalOutwardLoans = 0;
    let totalPool = 0;
    let inArrearsCount = 0;
    let activeCount = 0;

    if (tenantId) {
      const structuredLoansResult = await db.get<{ total: number }>(`
        SELECT SUM(l.Amount - COALESCE(p.totalPaid, 0)) as total
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        LEFT JOIN (
          SELECT lm.LoanId, SUM(lp.Amount) as totalPaid
          FROM LoanPayment lp
          JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
          GROUP BY lm.LoanId
        ) p ON p.LoanId = l.Id
        WHERE l.Status NOT IN ('Closed', 'Cancelled')
      `, [tenantId]);
      totalOutwardLoans = structuredLoansResult?.total || 0;

      const contributionsResult = await db.get<{ total: number }>(`
        SELECT COALESCE(SUM(mc.Amount), 0) as total
        FROM MemberCollection mc
        JOIN users u ON mc.UserId = u.id AND u.tenantId = ?
      `, [tenantId]);
      totalPool = contributionsResult?.total || 0;

      const overdueResult = await db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT l.Id) as count
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        WHERE l.Status IN ('Overdue', 'OVERDUE')
      `, [tenantId]);
      inArrearsCount = overdueResult?.count || 0;

      const activeResult = await db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT l.Id) as count
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        WHERE l.Status IN ('Active', 'ACTIVE')
      `, [tenantId]);
      activeCount = activeResult?.count || 0;
    } else {
      const structuredLoansResult = await db.get<{ total: number }>(`
        SELECT SUM(l.Amount - COALESCE(p.totalPaid, 0)) as total
        FROM Loan l
        LEFT JOIN (
          SELECT lm.LoanId, SUM(lp.Amount) as totalPaid
          FROM LoanPayment lp
          JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
          GROUP BY lm.LoanId
        ) p ON p.LoanId = l.Id
        WHERE l.Status NOT IN ('Closed', 'Cancelled')
      `);
      totalOutwardLoans = structuredLoansResult?.total || 0;

      const contributionsResult = await db.get<{ total: number }>(`
        SELECT COALESCE(SUM(mc.Amount), 0) as total
        FROM MemberCollection mc
      `);
      totalPool = contributionsResult?.total || 0;

      const overdueResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan WHERE Status IN ('Overdue', 'OVERDUE')");
      inArrearsCount = overdueResult?.count || 0;

      const activeResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan WHERE Status IN ('Active', 'ACTIVE')");
      activeCount = activeResult?.count || 0;
    }

    res.json({
      totalOutwardLoans,
      totalPool,
      inArrearsCount,
      activeCount,
      monthlyTarget: 450000,
      monthlyTargetGoal: 510000,
      collectionHealthOk: 842,
      collectionHealthArrears: 48
    });
  } catch (error) {
    console.error("Dashboard stats error", error);
    res.status(500).json({ error: "Error fetching dashboard statistics" });
  }
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  const db = getDatabase();
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = getUserIdFromRequest(req) || (req.query.userId as string);

  try {
    // 1. Overall stats
    let totalOutwardLoans = 0;
    let totalPool = 0;
    let inArrearsCount = 0;
    let activeCount = 0;

    if (tenantId) {
      const structuredLoansResult = await db.get<{ total: number }>(`
        SELECT SUM(l.Amount - COALESCE(p.totalPaid, 0)) as total
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        LEFT JOIN (
          SELECT lm.LoanId, SUM(lp.Amount) as totalPaid
          FROM LoanPayment lp
          JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
          GROUP BY lm.LoanId
        ) p ON p.LoanId = l.Id
        WHERE l.Status NOT IN ('Closed', 'Cancelled', 'CLOSED', 'CANCELLED')
      `, [tenantId]);
      totalOutwardLoans = structuredLoansResult?.total || 0;

      const contributionsResult = await db.get<{ total: number }>(`
        SELECT COALESCE(SUM(mc.Amount), 0) as total
        FROM MemberCollection mc
        JOIN users u ON mc.UserId = u.id AND u.tenantId = ?
      `, [tenantId]);
      totalPool = contributionsResult?.total || 0;

      const overdueResult = await db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT l.Id) as count
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        WHERE l.Status IN ('Overdue', 'OVERDUE')
      `, [tenantId]);
      inArrearsCount = overdueResult?.count || 0;

      const activeResult = await db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT l.Id) as count
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        JOIN users u ON u.id = lm.UserId AND u.tenantId = ?
        WHERE l.Status IN ('Active', 'ACTIVE')
      `, [tenantId]);
      activeCount = activeResult?.count || 0;
    }

    // 2. User-specific Loan Summary & Upcoming Loans
    let userLoans: any[] = [];
    if (userId) {
      userLoans = await db.all<any[]>(`
        SELECT 
          l.Id as id,
          l.LoanNo as loanNo,
          l.LoanType as loanType,
          l.Amount as principal,
          l.InterestRate as interestRate,
          l.TenureMonths as tenureMonths,
          l.StartDate as startDate,
          l.Status as status,
          COALESCE(p.totalPaid, 0) as paidToDate,
          COALESCE(p.repaymentCount, 0) as repaymentCount
        FROM Loan l
        JOIN LoanMember lm ON lm.LoanId = l.Id
        LEFT JOIN (
          SELECT lm.LoanId, SUM(lp.Amount) as totalPaid, COUNT(lp.Id) as repaymentCount
          FROM LoanPayment lp
          JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
          GROUP BY lm.LoanId
        ) p ON p.LoanId = l.Id
        WHERE lm.UserId = ?
        ORDER BY l.CreatedDate DESC
      `, [userId]);
    }

    const activeUserLoans = userLoans.filter(l => 
      (l.status?.toUpperCase() === 'ACTIVE' || l.status?.toUpperCase() === 'OVERDUE') &&
      (l.principal - l.paidToDate) > 0
    );

    const totalOutstandingBalance = activeUserLoans.reduce((sum, l) => sum + Math.max(0, l.principal - l.paidToDate), 0);
    const totalPrincipal = activeUserLoans.reduce((sum, l) => sum + l.principal, 0);
    const totalPaid = activeUserLoans.reduce((sum, l) => sum + l.paidToDate, 0);
    const percentPaid = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;
    const totalLoansCount = userLoans.length;

    const upcomingLoans = activeUserLoans.map(l => {
      const emi = calculateEMI(l.principal, l.interestRate || 12, l.tenureMonths || 12);
      const nextDue = getNextPaymentDueDate(l.startDate, l.repaymentCount || 0);
      const isOverdue = l.status?.toUpperCase() === 'OVERDUE';
      return {
        id: l.id,
        loanNo: l.loanNo || l.id,
        type: l.loanType || 'Single Facility',
        principal: l.principal,
        outstandingBalance: Math.max(0, l.principal - l.paidToDate),
        interestRate: l.interestRate || 12,
        tenureMonths: l.tenureMonths || 12,
        repaymentCount: l.repaymentCount,
        nextDueDate: nextDue,
        emi,
        status: l.status,
        isOverdue
      };
    });

    // 3. User Contributions Summary
    let contributionSummary = { totalAmount: 0, count: 0, lastCollectionDate: null as string | null };
    if (userId) {
      const contribRow = await db.get<{ totalAmount: number; count: number; lastCollectionDate: string }>(`
        SELECT 
          COALESCE(SUM(mc.Amount), 0) as totalAmount,
          COUNT(mc.Id) as count,
          MAX(fcg.CollectionDate) as lastCollectionDate
        FROM MemberCollection mc
        JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
        WHERE mc.UserId = ?
      `, [userId]);
      if (contribRow) {
        contributionSummary = {
          totalAmount: contribRow.totalAmount || 0,
          count: contribRow.count || 0,
          lastCollectionDate: contribRow.lastCollectionDate || null
        };
      }
    }

    // 4. Today's Expenses Summary
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    let todayExpenseSummary = { totalAmount: 0, count: 0, totalLoggedCount: 0 };
    if (tenantId) {
      todayExpenseSummary = await ExpenseModel.getTodaySummary(tenantId, todayStr, userId || undefined);
    } else {
      let todaySql = `SELECT COALESCE(SUM(Amount), 0) as totalAmount, COUNT(*) as count FROM expenses WHERE ExpenseDate = ? AND Status != 'Cancelled'`;
      let totalSql = `SELECT COUNT(*) as count FROM expenses`;
      const todayParams: any[] = [todayStr];
      const totalParams: any[] = [];
      if (userId) {
        todaySql += ` AND (ExpenseBy = ? OR (ExpenseBy IS NULL AND CreatedBy = ?))`;
        todayParams.push(userId, userId);
        totalSql += ` WHERE (ExpenseBy = ? OR (ExpenseBy IS NULL AND CreatedBy = ?))`;
        totalParams.push(userId, userId);
      }
      const todayRes = await db.get<{ totalAmount: number; count: number }>(todaySql, todayParams);
      const totalRes = await db.get<{ count: number }>(totalSql, totalParams);
      todayExpenseSummary = {
        totalAmount: todayRes?.totalAmount || 0,
        count: todayRes?.count || 0,
        totalLoggedCount: totalRes?.count || 0
      };
    }

    // 5. Upcoming Collections (Active Collection Types that are not completed/closed)
    const activeTypes = await db.all<any[]>(`
      SELECT 
        ct.Id as id,
        ct.TypeName as typeName,
        ct.Frequency as frequency,
        ct.Amount as amount
      FROM CollectionType ct
      WHERE ct.Status = 1 ${tenantId ? 'AND ct.tenantId = ?' : ''}
      ORDER BY ct.Id DESC
    `, tenantId ? [tenantId] : []);

    const upcomingCollections = activeTypes.map(t => ({
      id: t.id,
      typeName: t.typeName,
      frequency: t.frequency || 'monthly',
      amount: t.amount,
      status: 'Scheduled',
      dueDate: 'Upcoming Cycle'
    }));

    res.json({
      stats: {
        totalOutwardLoans,
        totalPool,
        inArrearsCount,
        activeCount,
        monthlyTarget: 450000,
        monthlyTargetGoal: 510000
      },
      loanSummary: {
        totalOutstandingBalance,
        totalPrincipal,
        totalPaid,
        percentPaid,
        totalLoansCount
      },
      contributionSummary,
      todayExpenseSummary,
      upcomingLoans,
      upcomingCollections
    });
  } catch (error) {
    console.error("Dashboard summary error", error);
    res.status(500).json({ error: "Error fetching dashboard summary" });
  }
};

