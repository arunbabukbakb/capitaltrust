import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getStats = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
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
    const totalOutwardLoans = structuredLoansResult?.total || 0;

    const contributionsResult = await db.get<{ total: number }>(`
      SELECT COALESCE(SUM(mc.Amount), 0) as total
      FROM MemberCollection mc
    `);
    const totalPool = contributionsResult?.total || 0;

    const overdueResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan WHERE Status IN ('Overdue', 'OVERDUE')");
    const inArrearsCount = overdueResult?.count || 0;

    const activeResult = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM Loan WHERE Status IN ('Active', 'ACTIVE')");
    const activeCount = activeResult?.count || 0;

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
