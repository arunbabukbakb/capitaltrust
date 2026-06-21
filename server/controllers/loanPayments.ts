import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

// Helper to calculate and generate LoanDue ledger entries consecutively up to targetMonth
async function getDuesForMember(db: any, member: any, loan: any, targetMonth: number, slabs: any[], saveToDb = false): Promise<any> {
  const startDateStr = loan.StartDate;
  const tenureMonths = Number(loan.TenureMonths || 12);
  const interestRate = Number(loan.InterestRate || 0);
  const interestMode = loan.InterestMode;
  const shareAmount = Number(member.LoanShareAmount || loan.Amount);

  // Convert start date to components
  const start = new Date(startDateStr);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // 0-indexed

  // Convert targetMonth YYYYMM to Year and Month
  const targetYear = Math.floor(targetMonth / 100);
  const targetMonthNum = (targetMonth % 100) - 1; // 0-indexed
  const targetDate = new Date(targetYear, targetMonthNum, 1);

  let curr = new Date(startYear, startMonth, 1);
  let previousDueRecord: any = null;

  while (curr <= targetDate) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const m = parseInt(`${yyyy}${mm}`);

    // Check if LoanDue record exists
    let dueRecord = await db.get(
      "SELECT * FROM LoanDue WHERE LoanMemberId = ? AND DueMonth = ?",
      [member.Id, m]
    );

    if (!dueRecord) {
      // Determine Opening Principal
      let openingPrincipal = shareAmount;
      let carryForwardInterest = 0;
      if (previousDueRecord) {
        openingPrincipal = previousDueRecord.ClosingPrincipal;
        carryForwardInterest = Math.max(0, previousDueRecord.InterestDue + previousDueRecord.CarryForwardInterest - previousDueRecord.InterestPaid);
      }

      // Determine rate
      let rate = interestRate;
      if (interestMode === 'Variable') {
        const slab = slabs.find(s => openingPrincipal >= s.FromAmount && openingPrincipal <= s.ToAmount);
        if (slab) rate = slab.InterestRate;
      }

      const interestDue = openingPrincipal * (rate / 100) / 12;
      const principalDue = Math.min(openingPrincipal, shareAmount / tenureMonths);
      const totalDue = principalDue + interestDue + carryForwardInterest;

      dueRecord = {
        LoanMemberId: member.Id,
        DueMonth: m,
        OpeningPrincipal: openingPrincipal,
        PrincipalDue: principalDue,
        InterestDue: interestDue,
        CarryForwardInterest: carryForwardInterest,
        TotalDue: totalDue,
        PaidAmount: 0,
        InterestPaid: 0,
        PrincipalPaid: 0,
        ClosingPrincipal: openingPrincipal,
        Status: 'Pending'
      };

      if (saveToDb) {
        // Insert record into LoanDue
        const result = await db.run(
          `INSERT INTO LoanDue (
            LoanMemberId, DueMonth, OpeningPrincipal, PrincipalDue, InterestDue, CarryForwardInterest, TotalDue, PaidAmount, InterestPaid, PrincipalPaid, ClosingPrincipal, Status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dueRecord.LoanMemberId,
            dueRecord.DueMonth,
            dueRecord.OpeningPrincipal,
            dueRecord.PrincipalDue,
            dueRecord.InterestDue,
            dueRecord.CarryForwardInterest,
            dueRecord.TotalDue,
            dueRecord.PaidAmount,
            dueRecord.InterestPaid,
            dueRecord.PrincipalPaid,
            dueRecord.ClosingPrincipal,
            dueRecord.Status
          ]
        );
        dueRecord.Id = result.lastID;
      } else {
        dueRecord.Id = null;
      }
    }

    previousDueRecord = dueRecord;
    curr.setMonth(curr.getMonth() + 1);
  }

  return previousDueRecord;
}

export const getLoanPaymentsList = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { loanId, type, month } = req.query;
    const currentMonth = month ? parseInt(month as string) : parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));

    // Check auth
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    let decodedUserId: string | null = null;
    let userRole: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
        decodedUserId = decoded.id;
        userRole = decoded.role || null;
      } catch {
        decodedUserId = null;
      }
    }

    let loans: any[] = [];
    const queryType = userRole === 'user' ? 'my' : type;

    if (loanId) {
      const l = await db.get("SELECT * FROM Loan WHERE Id = ?", [loanId]);
      if (l) loans.push(l);
    } else if (queryType === 'single') {
      loans = await db.all(`
        SELECT DISTINCT l.* FROM Loan l
        LEFT JOIN LoanMember lm ON l.Id = lm.LoanId
        LEFT JOIN LoanPayment lp ON lm.Id = lp.LoanMemberId AND lp.DueMonth = ?
        WHERE l.LoanType = 'Single' AND (l.Status = 'Active' OR (l.Status = 'Closed' AND lp.Id IS NOT NULL))
      `, [currentMonth]);
    } else if (queryType === 'my') {
      if (!decodedUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      loans = await db.all(
        `SELECT l.* FROM Loan l 
         JOIN LoanMember lm ON l.Id = lm.LoanId 
         WHERE lm.UserId = ? AND l.Status = 'Active'`,
        [decodedUserId]
      );
    }

    const result: any[] = [];

    for (const loan of loans) {
      const members = await db.all(
        `SELECT lm.*, u.fullName 
         FROM LoanMember lm 
         JOIN users u ON lm.UserId = u.id 
         WHERE lm.LoanId = ?`,
        [loan.Id]
      );

      const slabs = await db.all("SELECT * FROM LoanInterestSlab WHERE LoanId = ? ORDER BY FromAmount", [loan.Id]);

      for (const member of members) {
        if (queryType === 'my' && member.UserId !== decodedUserId) {
          continue;
        }

        // Ensure historical LoanDue records exist up to the current month in-memory
        const dueRecord = await getDuesForMember(db, member, loan, currentMonth, slabs, false);

        // Fetch cumulative finalized payments in LoanPayment for this month
        const approvedPayment = await db.get(
          "SELECT SUM(Amount) as totalPaid, SUM(InterestPaid) as intPaid, SUM(PrincipalPaid) as prinPaid FROM LoanPayment WHERE LoanMemberId = ? AND DueMonth = ?",
          [member.Id, currentMonth]
        );
        const totalPaid = approvedPayment?.totalPaid || 0;
        const interestPaid = approvedPayment?.intPaid || 0;
        const principalPaid = approvedPayment?.prinPaid || 0;

        const isApproved = totalPaid > 0 || dueRecord.Status === 'Paid' || dueRecord.Status === 'Partial';

        // Find the maximum DueMonth that has a payment for this member to implement last-payment edit constraint
        const lastPaymentRecord = await db.get(
          "SELECT MAX(DueMonth) as maxMonth FROM LoanPayment WHERE LoanMemberId = ?",
          [member.Id]
        );
        const lastPaidMonth = lastPaymentRecord?.maxMonth || 0;
        const canEdit = lastPaidMonth === 0 || currentMonth >= lastPaidMonth;

        result.push({
          id: `virtual_${loan.Id}_${member.UserId}_${currentMonth}`,
          loanId: loan.Id,
          loanNo: loan.LoanNo,
          userId: member.UserId,
          userName: member.fullName,
          loanAmount: member.LoanShareAmount,
          dueAmount: dueRecord.TotalDue,
          interestDue: dueRecord.InterestDue + dueRecord.CarryForwardInterest,
          principalDue: dueRecord.PrincipalDue,
          amountPaid: totalPaid,
          interestAmount: interestPaid,
          principalAmount: principalPaid,
          month: currentMonth,
          approved: isApproved,
          hasRequest: totalPaid > 0,
          requestId: null,
          requestedAmount: 0,
          loanMemberId: member.Id,
          canEdit: canEdit
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Get loan payments list error", error);
    res.status(500).json({ error: "Error fetching loan payments list" });
  }
};

export const finalSubmitLoanPayments = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    // Check auth
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (decoded.role !== 'admin' && decoded.role !== 'manager') {
      return res.status(403).json({ error: "Only admin and manager can finalize repayments" });
    }

    const { payments, month } = req.body;
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: "No payments provided for final submit" });
    }

    const currentMonth = month ? parseInt(month) : parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    const currentDate = new Date().toISOString().split('T')[0];

    await db.run("BEGIN TRANSACTION");
    try {
      for (const item of payments) {
        // item: { loanMemberId: number, approved: boolean, amountPaid: number, requestId?: number }
        const member = await db.get("SELECT * FROM LoanMember WHERE Id = ?", [item.loanMemberId]);
        if (!member) continue;

        const loan = await db.get("SELECT * FROM Loan WHERE Id = ?", [member.LoanId]);
        if (!loan) continue;

        const slabs = await db.all("SELECT * FROM LoanInterestSlab WHERE LoanId = ? ORDER BY FromAmount", [loan.Id]);

        // Ensure dues records exist and are saved in DB
        const dueRecord = await getDuesForMember(db, member, loan, currentMonth, slabs, true);

        const amountPaid = Number(item.amountPaid || 0);

        // Check if there is already an existing payment for this member and month
        const existingPayment = await db.get(
          "SELECT * FROM LoanPayment WHERE LoanMemberId = ? AND DueMonth = ?",
          [member.Id, currentMonth]
        );

        if (amountPaid === 0) {
          // If amount is 0, delete the payment if it exists
          if (existingPayment) {
            await db.run("DELETE FROM LoanPayment WHERE Id = ?", [existingPayment.Id]);
          }

          // Reset the dues record in database to unpaid
          await db.run(
            `UPDATE LoanDue SET 
              PaidAmount = 0, InterestPaid = 0, PrincipalPaid = 0, 
              ClosingPrincipal = OpeningPrincipal, Status = 'Pending'
             WHERE Id = ?`,
            [dueRecord.Id]
          );
        } else {
          // Reset local dueRecord for new allocation calculation
          dueRecord.PaidAmount = 0;
          dueRecord.InterestPaid = 0;
          dueRecord.PrincipalPaid = 0;
          dueRecord.ClosingPrincipal = dueRecord.OpeningPrincipal;
          dueRecord.Status = 'Pending';

          // Allocate payment: Interest first, then Principal
          const interestRemaining = Math.max(0, (dueRecord.InterestDue + dueRecord.CarryForwardInterest) - dueRecord.InterestPaid);
          const interestPaid = Math.min(amountPaid, interestRemaining);
          const principalRemaining = Math.max(0, dueRecord.OpeningPrincipal - dueRecord.PrincipalPaid);
          const principalPaid = Math.min(amountPaid - interestPaid, principalRemaining);

          if (existingPayment) {
            // UPDATE existing LoanPayment record
            await db.run(
              `UPDATE LoanPayment SET 
                Amount = ?, InterestPaid = ?, PrincipalPaid = ?, PaymentDate = ?, ApprovedDate = ?, ApprovedBy = ?
               WHERE Id = ?`,
              [
                amountPaid,
                interestPaid,
                principalPaid,
                currentDate,
                currentDate,
                decoded.id,
                existingPayment.Id
              ]
            );
          } else {
            // INSERT new LoanPayment record
            await db.run(
              `INSERT INTO LoanPayment (
                LoanMemberId, DueMonth, PaymentDate, Amount, InterestPaid, PrincipalPaid, ApprovedBy, ApprovedDate
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                member.Id,
                currentMonth,
                currentDate,
                amountPaid,
                interestPaid,
                principalPaid,
                decoded.id,
                currentDate
              ]
            );
          }

          // Update LoanDue record with the totals
          const updatedPaidAmount = amountPaid;
          const updatedInterestPaid = interestPaid;
          const updatedPrincipalPaid = principalPaid;
          const updatedClosingPrincipal = dueRecord.OpeningPrincipal - updatedPrincipalPaid;
          const updatedStatus = updatedPaidAmount >= dueRecord.TotalDue ? 'Paid' : (updatedPaidAmount > 0 ? 'Partial' : 'Pending');

          await db.run(
            `UPDATE LoanDue SET 
              PaidAmount = ?, InterestPaid = ?, PrincipalPaid = ?, ClosingPrincipal = ?, Status = ?
             WHERE Id = ?`,
            [updatedPaidAmount, updatedInterestPaid, updatedPrincipalPaid, updatedClosingPrincipal, updatedStatus, dueRecord.Id]
          );
        }

        // Recalculate OutstandingPrincipal of LoanMember
        const latestDue = await db.get("SELECT ClosingPrincipal FROM LoanDue WHERE LoanMemberId = ? AND DueMonth = ?", [member.Id, currentMonth]);
        const newOutstanding = latestDue ? latestDue.ClosingPrincipal : member.LoanShareAmount;
        await db.run(
          "UPDATE LoanMember SET OutstandingPrincipal = ? WHERE Id = ?",
          [newOutstanding, member.Id]
        );

        // Recalculate OutstandingPrincipal of Loan
        const totalOutstandingResult = await db.get<{ total: number }>(
          "SELECT SUM(OutstandingPrincipal) as total FROM LoanMember WHERE LoanId = ?",
          [loan.Id]
        );
        const newLoanOutstanding = totalOutstandingResult?.total || 0;
        const newLoanStatus = newLoanOutstanding <= 0 ? 'Closed' : 'Active';

        await db.run(
          "UPDATE Loan SET OutstandingPrincipal = ?, Status = ? WHERE Id = ?",
          [newLoanOutstanding, newLoanStatus, loan.Id]
        );
      }

      await db.run("COMMIT");
      res.json({ success: true, message: "Repayments finalized and balances updated." });
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }
  } catch (error) {
    console.error("Final submit repayment error", error);
    res.status(500).json({ error: "Error finalizing repayment batch" });
  }
};

// Legacy single approve endpoint (no-op or success response to prevent routing errors)
export const approveLoanPayment = async (req: Request, res: Response) => {
  res.status(405).json({ error: "Endpoint deprecated. Use final-submit batch endpoint instead." });
};
