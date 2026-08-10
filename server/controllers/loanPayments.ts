import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { LoanModel } from '../models/Loan';
import { sendPushNotification } from '../firebaseAdmin';
import { recordTransaction } from '../services/transactionService';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

// Helper to calculate and generate LoanDue ledger entries consecutively up to targetMonth
export async function getDuesForMember(db: any, member: any, loan: any, targetMonth: number, slabs: any[], saveToDb = false, isCompound = false): Promise<any> {
  const startDateStr = (loan.OpeningDate && String(loan.OpeningDate).trim() !== '') ? loan.OpeningDate : loan.StartDate;
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
  let elapsedMonths = 0;

  while (curr <= targetDate) {
    elapsedMonths++;
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const m = parseInt(`${yyyy}${mm}`);

    // Check if LoanDue record exists in DB
    let dbDueRecord = await LoanModel.findDueByMemberAndMonth(member.Id, m);
    // Check if LoanPayment exists in DB for month m
    const payment = await LoanModel.getPaymentSumByMemberAndMonth(member.Id, m);

    // Determine Opening Principal & Carry Forward Interest for current month m
    const memberOutstanding = Number(member.OutstandingPrincipal ?? shareAmount);
    let openingPrincipal = (memberOutstanding > 0 && memberOutstanding < shareAmount) ? memberOutstanding : shareAmount;
    let carryForwardInterest = 0;
    let totalPrincipalPaidBefore = 0;

    if (previousDueRecord) {
      openingPrincipal = previousDueRecord.ClosingPrincipal;
      carryForwardInterest = Math.max(
        0,
        previousDueRecord.InterestDue + previousDueRecord.CarryForwardInterest - previousDueRecord.InterestPaid
      );
      totalPrincipalPaidBefore = (previousDueRecord.totalPrincipalPaidBefore || 0) + previousDueRecord.PrincipalPaid;
    }

    // Base for interest calculation:
    // If isCompound is true, all accumulated unpaid interest (carryForwardInterest) is added to openingPrincipal
    const interestBase = isCompound ? (openingPrincipal + carryForwardInterest) : openingPrincipal;

    let rate = interestRate;
    if (interestMode === 'Variable') {
      const slab = slabs.find(s => interestBase >= s.FromAmount && interestBase <= s.ToAmount);
      if (slab) rate = slab.InterestRate;
    }

    const interestDue = interestBase * (rate / 100) / 12;
    
    // Principal due accumulated for unpaid elapsed months
    const monthlyPrincipalShare = shareAmount / tenureMonths;
    const accumulatedTargetPrincipal = Math.min(shareAmount, elapsedMonths * monthlyPrincipalShare);
    const principalDue = Math.min(openingPrincipal, Math.max(0, accumulatedTargetPrincipal - totalPrincipalPaidBefore));

    const totalDue = principalDue + interestDue + carryForwardInterest;

    let paidAmount = 0;
    let interestPaid = 0;
    let principalPaid = 0;
    let status = 'Pending';

    if (payment && payment.totalPaid > 0) {
      paidAmount = payment.totalPaid;
      interestPaid = payment.interestPaid;
      principalPaid = payment.principalPaid;
      status = (openingPrincipal - principalPaid <= 0) ? 'Paid' : 'Partial';
    } else if (dbDueRecord) {
      paidAmount = dbDueRecord.PaidAmount || 0;
      interestPaid = dbDueRecord.InterestPaid || 0;
      principalPaid = dbDueRecord.PrincipalPaid || 0;
      status = dbDueRecord.Status || 'Pending';
    }

    const closingPrincipal = Math.max(0, openingPrincipal - principalPaid);

    let dueRecord: any = {
      Id: dbDueRecord ? dbDueRecord.Id : 0,
      LoanMemberId: member.Id,
      DueMonth: m,
      OpeningPrincipal: openingPrincipal,
      PrincipalDue: principalDue,
      InterestDue: interestDue,
      CarryForwardInterest: carryForwardInterest,
      TotalDue: totalDue,
      PaidAmount: paidAmount,
      InterestPaid: interestPaid,
      PrincipalPaid: principalPaid,
      ClosingPrincipal: closingPrincipal,
      Status: status,
      totalPrincipalPaidBefore: totalPrincipalPaidBefore
    };

    if (saveToDb) {
      if (dbDueRecord) {
        await LoanModel.updateLoanDue(dbDueRecord.Id, {
          OpeningPrincipal: dueRecord.OpeningPrincipal,
          PrincipalDue: dueRecord.PrincipalDue,
          InterestDue: dueRecord.InterestDue,
          CarryForwardInterest: dueRecord.CarryForwardInterest,
          TotalDue: dueRecord.TotalDue,
          ClosingPrincipal: dueRecord.ClosingPrincipal
        });
      } else {
        const result = await LoanModel.createDueSchedule({
          LoanMemberId: dueRecord.LoanMemberId,
          DueMonth: dueRecord.DueMonth,
          OpeningPrincipal: dueRecord.OpeningPrincipal,
          PrincipalDue: dueRecord.PrincipalDue,
          InterestDue: dueRecord.InterestDue,
          CarryForwardInterest: dueRecord.CarryForwardInterest,
          TotalDue: dueRecord.TotalDue,
          PaidAmount: dueRecord.PaidAmount,
          InterestPaid: dueRecord.InterestPaid,
          PrincipalPaid: dueRecord.PrincipalPaid,
          ClosingPrincipal: dueRecord.ClosingPrincipal,
          Status: dueRecord.Status as any
        });
        dueRecord.Id = result.lastID ? Number(result.lastID) : 0;
      }
    }

    previousDueRecord = dueRecord;
    curr.setMonth(curr.getMonth() + 1);
  }

  return previousDueRecord;
}

export const getLoanPaymentsList = async (req: Request, res: Response) => {
  try {
    const { loanId, type, month } = req.query;
    const currentMonth = month ? parseInt(month as string) : parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    const currentCalendarMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    const tenantId = req.headers['x-tenant-id'] as string;

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
      const l = await LoanModel.findById(loanId as string);
      if (l) loans.push(l);
    } else if (queryType === 'single') {
      loans = await LoanModel.listSingleLoansByMonth(currentMonth, tenantId);
    } else if (queryType === 'my') {
      if (!decodedUserId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      loans = await LoanModel.listActiveLoansByUserId(decodedUserId);
    }

    const result: any[] = [];

    for (const loan of loans) {
      const isCompound = Boolean(loan.IsCompound === 1 || loan.IsCompound === true || loan.IsCompound === '1' || loan.IsCompound === 'true');
      const members = await LoanModel.listLoanMembers(loan.Id, tenantId);
      const slabs = await LoanModel.getSlabsByLoanIds([loan.Id]);

      for (const member of members) {
        if (queryType === 'my' && member.UserId !== decodedUserId) {
          continue;
        }

        // Ensure historical LoanDue records exist up to the current month in-memory
        const dueRecord = await getDuesForMember(null, member, loan, currentMonth, slabs, false, isCompound);
        if (!dueRecord) {
          continue;
        }

        // Fetch cumulative finalized payments in LoanPayment for this month
        const approvedPayment = await LoanModel.getPaymentSumByMemberAndMonth(member.Id, currentMonth);
        const totalPaid = approvedPayment.totalPaid;
        const interestPaid = approvedPayment.interestPaid;
        const principalPaid = approvedPayment.principalPaid;

        const isApproved = totalPaid > 0 || dueRecord.Status === 'Paid' || dueRecord.Status === 'Partial';

        // Find the maximum DueMonth that has a payment for this member to implement last-payment edit constraint
        const lastPaidMonth = await LoanModel.getMaxPaymentMonthByMember(member.Id);
        const canEdit = lastPaidMonth === 0 || currentMonth >= lastPaidMonth;

        const currentInterestBase = isCompound ? (dueRecord.OpeningPrincipal + dueRecord.CarryForwardInterest) : dueRecord.OpeningPrincipal;
        let activeRate = loan.InterestRate || 0;
        if (loan.InterestMode === 'Variable') {
          const slab = slabs.find((s: any) => currentInterestBase >= s.FromAmount && currentInterestBase <= s.ToAmount);
          if (slab) activeRate = slab.InterestRate;
        }

        // Calculate status and overdue flag
        let dueStatus: 'Overdue' | 'Pending' | 'Paid' | 'Partial' = 'Pending';
        if (totalPaid >= dueRecord.TotalDue || dueRecord.Status === 'Paid') {
          dueStatus = 'Paid';
        } else if (currentMonth < currentCalendarMonth || dueRecord.CarryForwardInterest > 0) {
          dueStatus = 'Overdue';
        } else if (totalPaid > 0) {
          dueStatus = 'Partial';
        }

        result.push({
          id: `virtual_${loan.Id}_${member.UserId}_${currentMonth}`,
          loanId: loan.Id,
          loanNo: loan.LoanNo,
          userId: member.UserId,
          userName: member.fullName,
          loanAmount: member.LoanShareAmount,
          outstandingBalance: currentInterestBase,
          dueAmount: dueRecord.TotalDue,
          interestDue: dueRecord.InterestDue,
          carryForwardInterest: dueRecord.CarryForwardInterest,
          principalDue: dueRecord.PrincipalDue,
          amountPaid: totalPaid,
          interestAmount: interestPaid,
          principalAmount: principalPaid,
          month: currentMonth,
          approved: isApproved,
          dueStatus: dueStatus,
          hasRequest: totalPaid > 0,
          requestId: null,
          requestedAmount: 0,
          loanMemberId: member.Id,
          canEdit: canEdit,
          interestRate: activeRate,
          interestMode: loan.InterestMode,
          startDate: loan.StartDate
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

      const notificationsToSend: { userId: string; amount: number; loanNo: string }[] = [];

      await db.run("BEGIN TRANSACTION");
      try {
        for (const item of payments) {
          // item: { loanMemberId: number, approved: boolean, amountPaid: number, requestId?: number }
          const member = await LoanModel.findMemberById(item.loanMemberId);
          if (!member) continue;

          const loan = await LoanModel.findById(member.LoanId);
          if (!loan) continue;

          const slabs = await LoanModel.getSlabsByLoanIds([loan.Id]);
          const isLoanCompound = Boolean(loan.IsCompound === 1 || loan.IsCompound === true || loan.IsCompound === '1' || loan.IsCompound === 'true');

          // Ensure dues records exist and are saved in DB
          const dueRecord = await getDuesForMember(db, member, loan, currentMonth, slabs, true, isLoanCompound);
          if (!dueRecord) continue;

          const amountPaid = Number(item.amountPaid || 0);

          // Check if there is already an existing payment for this member and month
          const existingPayment = await LoanModel.findPaymentByMemberAndMonth(member.Id, currentMonth);

          if (amountPaid === 0) {
            // If amount is 0, delete the payment if it exists
            if (existingPayment) {
              await LoanModel.deletePayment(existingPayment.Id);
            }

            // Reset the dues record in database to unpaid
            await LoanModel.updateLoanDue(dueRecord.Id, {
              PaidAmount: 0,
              InterestPaid: 0,
              PrincipalPaid: 0,
              ClosingPrincipal: dueRecord.OpeningPrincipal,
              Status: 'Pending'
            });
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
              await LoanModel.updatePayment(existingPayment.Id, {
                Amount: amountPaid,
                InterestPaid: interestPaid,
                PrincipalPaid: principalPaid,
                PaymentDate: currentDate,
                ApprovedDate: currentDate,
                ApprovedBy: decoded.id
              });
            } else {
              // INSERT new LoanPayment record
              await LoanModel.addPayment({
                LoanMemberId: member.Id,
                DueMonth: currentMonth,
                PaymentDate: currentDate,
                Amount: amountPaid,
                InterestPaid: interestPaid,
                PrincipalPaid: principalPaid,
                ApprovedBy: decoded.id,
                ApprovedDate: currentDate
              });
            }

            // Update LoanDue record with the totals
            const updatedPaidAmount = amountPaid;
            const updatedInterestPaid = interestPaid;
            const updatedPrincipalPaid = principalPaid;
            const updatedClosingPrincipal = dueRecord.OpeningPrincipal - updatedPrincipalPaid;
            const updatedStatus = updatedPaidAmount >= dueRecord.TotalDue ? 'Paid' : (updatedPaidAmount > 0 ? 'Partial' : 'Pending');

            await LoanModel.updateLoanDue(dueRecord.Id, {
              PaidAmount: updatedPaidAmount,
              InterestPaid: updatedInterestPaid,
              PrincipalPaid: updatedPrincipalPaid,
              ClosingPrincipal: updatedClosingPrincipal,
              Status: updatedStatus as any
            });

            await recordTransaction({
              tenantId: (req.headers['x-tenant-id'] as string) || 1,
              transactionDate: currentDate,
              transactionType: 'LoanRepayment',
              amount: amountPaid,
              referenceType: 'LoanRepayment',
              referenceId: `LP-${member.Id}-${currentMonth}`,
              narration: `EMI Repayment for Loan ${loan.LoanNo} (Month: ${currentMonth})`,
              createdBy: decoded.id
            });

            // Add to notification list to send post-commit
            notificationsToSend.push({
              userId: member.UserId,
              amount: amountPaid,
              loanNo: loan.LoanNo
            });
          }

          // Recalculate OutstandingPrincipal of LoanMember
          const latestClosingPrincipal = await LoanModel.getLatestClosingPrincipal(member.Id, currentMonth);
          const newOutstanding = latestClosingPrincipal !== null ? latestClosingPrincipal : member.LoanShareAmount;
          await LoanModel.updateLoanMemberOutstanding(member.Id, newOutstanding);

          // Recalculate OutstandingPrincipal of Loan
          const newLoanOutstanding = await LoanModel.getSumOutstandingPrincipalByLoan(loan.Id);
          const newLoanStatus = newLoanOutstanding <= 0 ? 'Closed' : 'Active';

          await LoanModel.updateLoanOutstanding(loan.Id, newLoanOutstanding);
          await LoanModel.updateLoan(loan.Id, { Status: newLoanStatus });
        }

        await db.run("COMMIT");

        // Send notifications asynchronously
        if (notificationsToSend.length > 0) {
          setImmediate(() => {
            notificationsToSend.forEach(async (notif) => {
              try {
                const notifAmount = new Intl.NumberFormat('en-IN').format(notif.amount);
                await sendPushNotification(
                  [notif.userId],
                  'Repayment Posted Successfully',
                  `A repayment of ₹${notifAmount} has been recorded for your loan ${notif.loanNo}.`,
                  '/loan-repayment'
                );
              } catch (notifError) {
                console.error('Failed to send repayment notification:', notifError);
              }
            });
          });
        }

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

export const approveLoanPayment = async (req: Request, res: Response) => {
  res.status(405).json({ error: "Endpoint deprecated. Use final-submit batch endpoint instead." });
};
