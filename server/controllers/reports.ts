import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { LoanModel } from '../models/Loan';
import { getDuesForMember } from './loanPayments';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

export const getMemberLedgerData = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: "UserId is required" });
    }

    // 1. Member Profile Details
    const member = await db.get(
      "SELECT id, fullName, email, username, role, phoneNumber, status, profileImage FROM users WHERE id = ? AND tenantId = ?",
      [userId, tenantId]
    );

    if (!member) {
      return res.status(404).json({ error: "Member profile not found under this organization." });
    }

    // 2. Loan Summaries
    const activeLoansSummary = await db.get(
      `SELECT 
         COUNT(*) as activeCount,
         COALESCE(SUM(LoanShareAmount), 0) as totalShare,
         COALESCE(SUM(OutstandingPrincipal), 0) as totalOutstanding
       FROM LoanMember 
       WHERE UserId = ? AND Status = 'Active'`,
      [userId]
    );

    const loanPaymentsSummary = await db.get(
      `SELECT 
         COALESCE(SUM(lp.PrincipalPaid), 0) as totalPrincipalPaid,
         COALESCE(SUM(lp.InterestPaid), 0) as totalInterestPaid
       FROM LoanPayment lp
       JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
       WHERE lm.UserId = ?`,
      [userId]
    );

    const loansList = await db.all(
      `SELECT 
         lm.Id as loanMemberId,
         l.Id as loanId,
         l.LoanNo as loanNo,
         l.LoanType as loanType,
         lm.LoanShareAmount as shareAmount,
         lm.OutstandingPrincipal as outstandingPrincipal,
         lm.Status as status,
         l.StartDate as startDate,
         l.EndDate as endDate
       FROM LoanMember lm
       JOIN Loan l ON lm.LoanId = l.Id
       WHERE lm.UserId = ?
       ORDER BY lm.CreatedDate DESC`,
      [userId]
    );

    // 3. Collections Summaries & Types list
    const totalCollectedRes = await db.get(
      "SELECT COALESCE(SUM(Amount), 0) as totalCollected FROM MemberCollection WHERE UserId = ?",
      [userId]
    );

    const collectionTypesList = await db.all(
      `SELECT 
         ct.Id as typeId, 
         ct.TypeName as typeName, 
         COALESCE(SUM(mc.Amount), 0) as totalAmount
       FROM CollectionType ct
       LEFT JOIN FundCollectionGroup fcg ON ct.Id = fcg.CollectionTypeId
       LEFT JOIN MemberCollection mc ON fcg.Id = mc.CollectionGroupId AND mc.UserId = ?
       WHERE ct.tenantId = ?
       GROUP BY ct.Id, ct.TypeName
       ORDER BY ct.Id DESC`,
      [userId, tenantId]
    );

    // 4. Expenses Summaries & List
    const expenseSummaryRes = await db.get(
      "SELECT COALESCE(SUM(Amount), 0) as totalAmount FROM expenses WHERE COALESCE(ExpenseBy, CreatedBy) = ? AND TenantId = ? AND Status = 'Approved'",
      [userId, tenantId]
    );

    const expensesList = await db.all(
      `SELECT 
         Id as id, 
         ExpenseDate as expenseDate, 
         Amount as amount, 
         PaymentMode as paymentMode, 
         ReferenceNo as referenceNo, 
         Description as description, 
         Status as status 
       FROM expenses 
       WHERE COALESCE(ExpenseBy, CreatedBy) = ? AND TenantId = ? 
       ORDER BY CreatedAt DESC, ExpenseDate DESC`,
      [userId, tenantId]
    );

    // Assemble the complete ledger response payload
    return res.json({
      memberDetails: member,
      loans: {
        summary: {
          activeCount: activeLoansSummary?.activeCount || 0,
          totalShare: activeLoansSummary?.totalShare || 0,
          totalOutstanding: activeLoansSummary?.totalOutstanding || 0,
          totalPrincipalPaid: loanPaymentsSummary?.totalPrincipalPaid || 0,
          totalInterestPaid: loanPaymentsSummary?.totalInterestPaid || 0
        },
        list: loansList
      },
      collections: {
        summary: {
          totalCollected: totalCollectedRes?.totalCollected || 0
        },
        typesList: collectionTypesList
      },
      expenses: {
        summary: {
          totalAmount: expenseSummaryRes?.totalAmount || 0
        },
        list: expensesList
      }
    });

  } catch (error: any) {
    console.error("GetMemberLedgerData error:", error);
    return res.status(500).json({ error: error.message || "Failed to load member ledger data" });
  }
};

export const getLoanRepaymentHistory = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { loanMemberId } = req.params;
    if (!loanMemberId) {
      return res.status(400).json({ error: "LoanMemberId is required" });
    }

    const history = await db.all(
      `SELECT 
         lp.Id as id, 
         lp.DueMonth as dueMonth, 
         lp.PaymentDate as paymentDate, 
         lp.Amount as amount, 
         lp.InterestPaid as interestPaid, 
         lp.PrincipalPaid as principalPaid, 
         COALESCE(u.fullName, u.username, lp.ApprovedBy) as approvedBy, 
         lp.ApprovedDate as approvedDate 
       FROM LoanPayment lp
       LEFT JOIN users u ON lp.ApprovedBy = u.id
       WHERE lp.LoanMemberId = ? 
       ORDER BY lp.DueMonth ASC`,
      [loanMemberId]
    );
    res.json(history);
  } catch (error: any) {
    console.error("GetLoanRepaymentHistory error:", error);
    res.status(500).json({ error: error.message || "Failed to load loan payment history" });
  }
};

export const getCollectionTypeHistory = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { collectionTypeId } = req.params;
    const { userId } = req.query;

    if (!collectionTypeId || !userId) {
      return res.status(400).json({ error: "CollectionTypeId and userId are required" });
    }

    const history = await db.all(
      `SELECT 
         mc.Id as id, 
         fcg.CollectionDate as date, 
         mc.Amount as amount 
       FROM MemberCollection mc 
       JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id 
       WHERE mc.UserId = ? AND fcg.CollectionTypeId = ? 
       ORDER BY fcg.CollectionDate DESC`,
      [userId, collectionTypeId]
    );
    res.json(history);
  } catch (error: any) {
    console.error("GetCollectionTypeHistory error:", error);
    res.status(500).json({ error: error.message || "Failed to load collection type history" });
  }
};

export const getDueReportData = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // Auth & Permission check (Only Admin or Manager)
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    let userRole: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
        userRole = decoded.role || null;
      } catch {
        userRole = null;
      }
    }
    
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ error: "Access denied. Due Report is accessible only for administrators and managers." });
    }

    const monthQuery = req.query.month ? parseInt(req.query.month as string) : parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    const filterLoanId = (req.query.loanId as string) || '';
    const filterUserId = (req.query.userId as string) || '';
    const currentCalendarMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));

    const structuredLoans = await LoanModel.listAllLoans(tenantId);
    
    const items: any[] = [];
    const loansFilterListMap = new Map<string, any>();
    const usersFilterListMap = new Map<string, any>();

    for (const loan of structuredLoans) {
      loansFilterListMap.set(loan.Id, { loanId: loan.Id, loanNo: loan.LoanNo, loanType: loan.LoanType });

      const isCompound = Boolean(loan.IsCompound === 1 || loan.IsCompound === true || loan.IsCompound === '1' || loan.IsCompound === 'true');
      const members = await LoanModel.listLoanMembers(loan.Id, tenantId);
      const slabs = await LoanModel.getSlabsByLoanIds([loan.Id]);

      for (const member of members) {
        usersFilterListMap.set(member.UserId, { userId: member.UserId, userName: member.fullName || member.UserId });

        if (filterLoanId && loan.Id !== filterLoanId && loan.LoanNo !== filterLoanId) {
          continue;
        }

        if (filterUserId && member.UserId !== filterUserId) {
          continue;
        }

        const dueRecord = await getDuesForMember(null, member, loan, monthQuery, slabs, false, isCompound);
        if (!dueRecord) continue;

        const approvedPayment = await LoanModel.getPaymentSumByMemberAndMonth(member.Id, monthQuery);
        const totalPaid = approvedPayment.totalPaid || 0;
        const netDue = Math.max(0, dueRecord.TotalDue - totalPaid);

        let dueStatus: 'Overdue' | 'Pending' | 'Paid' | 'Partial' = 'Pending';
        if (totalPaid >= dueRecord.TotalDue || dueRecord.Status === 'Paid') {
          dueStatus = 'Paid';
        } else if (monthQuery < currentCalendarMonth || dueRecord.CarryForwardInterest > 0) {
          dueStatus = 'Overdue';
        } else if (totalPaid > 0) {
          dueStatus = 'Partial';
        }

        // Strictly include ONLY due items (exclude fully Paid items or netDue <= 0)
        if (dueStatus === 'Paid' || netDue <= 0) {
          continue;
        }

        const currentInterestBase = isCompound ? (dueRecord.OpeningPrincipal + dueRecord.CarryForwardInterest) : dueRecord.OpeningPrincipal;
        let activeRate = loan.InterestRate || 0;
        if (loan.InterestMode === 'Variable') {
          const slab = slabs.find((s: any) => currentInterestBase >= s.FromAmount && currentInterestBase <= s.ToAmount);
          if (slab) activeRate = slab.InterestRate;
        }

        items.push({
          id: `due_${loan.Id}_${member.UserId}_${monthQuery}`,
          loanId: loan.Id,
          loanNo: loan.LoanNo,
          loanType: loan.LoanType,
          userId: member.UserId,
          userName: member.fullName || member.UserId,
          loanShareAmount: member.LoanShareAmount,
          openingPrincipal: dueRecord.OpeningPrincipal,
          outstandingBalance: currentInterestBase,
          principalDue: dueRecord.PrincipalDue,
          interestDue: dueRecord.InterestDue,
          carryForwardInterest: dueRecord.CarryForwardInterest,
          totalDue: dueRecord.TotalDue,
          amountPaid: totalPaid,
          netDue: netDue,
          dueStatus: dueStatus,
          month: monthQuery,
          startDate: loan.StartDate,
          endDate: loan.EndDate,
          interestRate: activeRate,
          interestMode: loan.InterestMode
        });
      }
    }

    // Group items by loan facility
    const groupedMap = new Map<string, any>();
    for (const item of items) {
      if (!groupedMap.has(item.loanId)) {
        groupedMap.set(item.loanId, {
          loanId: item.loanId,
          loanNo: item.loanNo,
          loanType: item.loanType,
          interestMode: item.interestMode,
          interestRate: item.interestRate,
          totalLoanDue: 0,
          totalPrincipalDue: 0,
          totalInterestDue: 0,
          dueMembersCount: 0,
          members: []
        });
      }
      const group = groupedMap.get(item.loanId);
      group.totalLoanDue += item.netDue;
      group.totalPrincipalDue += item.principalDue;
      group.totalInterestDue += (item.interestDue + item.carryForwardInterest);
      group.dueMembersCount += 1;
      group.members.push(item);
    }

    const grouped = Array.from(groupedMap.values());

    // Consolidated summaries
    const totalDueAmount = items.reduce((sum, i) => sum + i.netDue, 0);
    const totalPrincipalDue = items.reduce((sum, i) => sum + i.principalDue, 0);
    const totalInterestDue = items.reduce((sum, i) => sum + (i.interestDue + i.carryForwardInterest), 0);
    const totalFacilitiesCount = grouped.length;
    const totalMembersCount = new Set(items.map(i => i.userId)).size;

    return res.json({
      month: monthQuery,
      summary: {
        totalDueAmount,
        totalPrincipalDue,
        totalInterestDue,
        totalFacilitiesCount,
        totalMembersCount,
        totalItemsCount: items.length
      },
      grouped,
      items,
      filters: {
        loans: Array.from(loansFilterListMap.values()),
        users: Array.from(usersFilterListMap.values())
      }
    });
  } catch (error: any) {
    console.error("getDueReportData error:", error);
    res.status(500).json({ error: error.message || "Failed to generate due report" });
  }
};
