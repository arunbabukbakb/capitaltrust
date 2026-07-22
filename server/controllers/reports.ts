import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

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
         Id as id, 
         DueMonth as dueMonth, 
         PaymentDate as paymentDate, 
         Amount as amount, 
         InterestPaid as interestPaid, 
         PrincipalPaid as principalPaid, 
         ApprovedBy as approvedBy, 
         ApprovedDate as approvedDate 
       FROM LoanPayment 
       WHERE LoanMemberId = ? 
       ORDER BY DueMonth ASC`,
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
