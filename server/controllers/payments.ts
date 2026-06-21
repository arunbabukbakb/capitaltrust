import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getPayments = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { loanId } = req.query;
    
    if (loanId) {
      const lpPayments = await db.all(`
        SELECT 
          'TRX-' || lp.Id as id,
          lp.PaymentDate as date,
          lp.Amount as amount,
          'Manual Collection' as type,
          'Processed' as status,
          lm.LoanId as loanId,
          lp.InterestPaid as interestPaid,
          lp.PrincipalPaid as principalPaid
        FROM LoanPayment lp
        JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
        WHERE lm.LoanId = ?
        ORDER BY lp.PaymentDate DESC, lp.Id DESC
      `, [loanId]);
      return res.json(lpPayments);
    }

    const lpPayments = await db.all(`
      SELECT 
        'TRX-' || lp.Id as id,
        lp.PaymentDate as date,
        lp.Amount as amount,
        'Manual Collection' as type,
        'Processed' as status,
        lm.LoanId as loanId,
        lp.InterestPaid as interestPaid,
        lp.PrincipalPaid as principalPaid
      FROM LoanPayment lp
      JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
      ORDER BY lp.PaymentDate DESC, lp.Id DESC
    `);

    res.json(lpPayments);
  } catch (error) {
    console.error("Get payments ledger error", error);
    res.status(500).json({ error: "Error fetching payments ledger" });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  res.status(451).json({ error: "Repayment requests are deprecated. Payments must be posted directly by administrators." });
};
