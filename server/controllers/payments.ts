import { Request, Response } from 'express';
import { getDatabase } from '../database';

export const getPayments = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { loanId } = req.query;
    
    // Fetch all slabs to calculate variable rate if needed
    const slabs = await db.all(`SELECT * FROM LoanInterestSlab`);

    let lpPayments: any[] = [];
    if (loanId) {
      lpPayments = await db.all(`
        SELECT 
          CONCAT('TRX-', lp.Id) as id,
          lp.PaymentDate as date,
          lp.Amount as amount,
          'Manual Collection' as type,
          'Processed' as status,
          lm.LoanId as loanId,
          lm.UserId as userId,
          lp.InterestPaid as interestPaid,
          lp.PrincipalPaid as principalPaid,
          l.InterestMode as interestMode,
          l.InterestRate as loanInterestRate,
          ld.OpeningPrincipal as openingPrincipal
        FROM LoanPayment lp
        JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
        JOIN Loan l ON lm.LoanId = l.Id
        LEFT JOIN LoanDue ld ON ld.LoanMemberId = lp.LoanMemberId AND ld.DueMonth = lp.DueMonth
        WHERE lm.LoanId = ?
        ORDER BY lp.PaymentDate DESC, lp.Id DESC
      `, [loanId]);
    } else {
      lpPayments = await db.all(`
        SELECT 
          CONCAT('TRX-', lp.Id) as id,
          lp.PaymentDate as date,
          lp.Amount as amount,
          'Manual Collection' as type,
          'Processed' as status,
          lm.LoanId as loanId,
          lm.UserId as userId,
          lp.InterestPaid as interestPaid,
          lp.PrincipalPaid as principalPaid,
          l.InterestMode as interestMode,
          l.InterestRate as loanInterestRate,
          ld.OpeningPrincipal as openingPrincipal
        FROM LoanPayment lp
        JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
        JOIN Loan l ON lm.LoanId = l.Id
        LEFT JOIN LoanDue ld ON ld.LoanMemberId = lp.LoanMemberId AND ld.DueMonth = lp.DueMonth
        ORDER BY lp.PaymentDate DESC, lp.Id DESC
      `);
    }

    const mapped = lpPayments.map((payment: any) => {
      let interestRate = payment.loanInterestRate || 0;
      if (payment.interestMode === 'Variable') {
        const matchingSlabs = slabs.filter((s: any) => s.LoanId === payment.loanId);
        const op = payment.openingPrincipal || 0;
        const slab = matchingSlabs.find((s: any) => op >= s.FromAmount && op <= s.ToAmount);
        if (slab) {
          interestRate = slab.InterestRate;
        }
      }
      return {
        id: payment.id,
        date: payment.date,
        amount: Number(payment.amount),
        type: payment.type,
        status: payment.status,
        loanId: payment.loanId,
        userId: payment.userId,
        interestPaid: Number(payment.interestPaid || 0),
        principalPaid: Number(payment.principalPaid || 0),
        interestRate: Number(interestRate)
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Get payments ledger error", error);
    res.status(500).json({ error: "Error fetching payments ledger" });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  res.status(451).json({ error: "Repayment requests are deprecated. Payments must be posted directly by administrators." });
};
