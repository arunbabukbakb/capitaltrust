import { Request, Response } from 'express';
import { getDatabase } from '../database';
import { LoanModel } from '../models/Loan';
import { getDuesForMember } from './loanPayments';

export const getMemberPassbookData = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { memberId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const { groupId, startDate, endDate } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    const startStr = startDate ? String(startDate).trim() : '';
    const endStr = endDate ? String(endDate).trim() : '';

    // 1. Fetch Member Profile
    const member = await db.get(
      `SELECT id, fullName, email, username, phoneNumber, status, profileImage, memberNumber 
       FROM users 
       WHERE id = ? AND tenantId = ?`,
      [memberId, tenantId]
    );

    if (!member) {
      return res.status(404).json({ error: "Member profile not found under this organization." });
    }

    if (!member.memberNumber) {
      member.memberNumber = `CT-${String(member.id).padStart(5, '0')}`;
    }

    // 2. Member Assigned Groups
    let groupQuery = `
      SELECT g.id, g.name, g.code 
      FROM group_members gm 
      JOIN tenant_groups g ON gm.groupId = g.id 
      WHERE gm.userId = ? AND gm.tenantId = ?
    `;
    const groupQueryParams: any[] = [memberId, tenantId];
    if (groupId && groupId !== 'All') {
      groupQuery += ` AND g.id = ?`;
      groupQueryParams.push(groupId);
    }
    const memberGroups = await db.all(groupQuery, groupQueryParams);

    // 3. Savings Calculations (Period Opening Balance & Period Collections)
    const openingBalanceRes = await db.get(
      `SELECT COALESCE(SUM(Amount), 0) as totalOpening 
       FROM MemberOpeningBalance 
       WHERE UserId = ? AND tenantId = ?`,
      [memberId, tenantId]
    );

    // Sum of collections prior to startStr
    let priorCollectionsQuery = `
      SELECT COALESCE(SUM(mc.Amount), 0) as priorCollections 
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      WHERE mc.UserId = ? AND fcg.tenantId = ?
    `;
    const priorCollectionsParams: any[] = [memberId, tenantId];
    if (startStr) {
      priorCollectionsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) < ?`;
      priorCollectionsParams.push(startStr);
    } else {
      priorCollectionsQuery += ` AND 1 = 0`;
    }
    const priorCollectionsRes = await db.get(priorCollectionsQuery, priorCollectionsParams);

    // Sum of collections in period (between startStr and endStr)
    let collectionsQuery = `
      SELECT COALESCE(SUM(mc.Amount), 0) as totalCollections 
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      WHERE mc.UserId = ? AND fcg.tenantId = ?
    `;
    const collectionsParams: any[] = [memberId, tenantId];
    if (startStr) {
      collectionsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) >= ?`;
      collectionsParams.push(startStr);
    }
    if (endStr) {
      collectionsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) <= ?`;
      collectionsParams.push(endStr);
    }

    const collectionsRes = await db.get(collectionsQuery, collectionsParams);

    const initialOpening = Number(openingBalanceRes?.totalOpening || 0);
    const priorCollections = Number(priorCollectionsRes?.priorCollections || 0);
    const openingBalance = Math.round(initialOpening + priorCollections);
    const totalContributions = Math.round(Number(collectionsRes?.totalCollections || 0));
    const totalWithdrawals = 0;
    const currentSavingsBalance = Math.round(openingBalance + totalContributions - totalWithdrawals);

    // 4. Loan Summaries & Loans List
    const loansList = await db.all(
      `SELECT 
         lm.Id as loanMemberId,
         l.Id as loanId,
         l.LoanNo as loanNo,
         l.LoanType as loanType,
         lm.LoanShareAmount as loanAmount,
         lm.OutstandingPrincipal as outstandingPrincipal,
         lm.Status as status,
         l.StartDate as startDate,
         l.EndDate as endDate,
         l.InterestMode as interestMode,
         l.InterestRate as interestRate
       FROM LoanMember lm
       JOIN Loan l ON lm.LoanId = l.Id
       WHERE lm.UserId = ?
       ORDER BY lm.CreatedDate DESC`,
      [memberId]
    );

    let loanPaymentsQuery = `
      SELECT 
         COALESCE(SUM(lp.Amount), 0) as totalPaid,
         COALESCE(SUM(lp.PrincipalPaid), 0) as principalPaid,
         COALESCE(SUM(lp.InterestPaid), 0) as interestPaid
       FROM LoanPayment lp
       JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
       WHERE lm.UserId = ?
    `;
    const loanPaymentsParams: any[] = [memberId];
    if (startStr) {
      loanPaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) >= ?`;
      loanPaymentsParams.push(startStr);
    }
    if (endStr) {
      loanPaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) <= ?`;
      loanPaymentsParams.push(endStr);
    }

    const loanPaymentsSummary = await db.get(loanPaymentsQuery, loanPaymentsParams);

    const totalLoansCount = loansList.length;
    const activeLoans = loansList.filter((l: any) => l.status === 'Active');
    const activeLoansCount = activeLoans.length;
    const totalBorrowed = Math.round(loansList.reduce((sum: number, l: any) => sum + Number(l.loanAmount || 0), 0));
    const totalOutstandingPrincipal = Math.round(loansList.reduce((sum: number, l: any) => sum + Number(l.outstandingPrincipal || 0), 0));
    const totalPaid = Math.round(Number(loanPaymentsSummary?.totalPaid || 0));
    const principalPaid = Math.round(Number(loanPaymentsSummary?.principalPaid || 0));
    const interestPaid = Math.round(Number(loanPaymentsSummary?.interestPaid || 0));

    // Calculate pending installment dues matching Due Report logic
    const currentCalendarMonth = parseInt(new Date().toISOString().slice(0, 7).replace('-', ''));
    let calculatedTotalDue = 0;

    for (const loanItem of loansList) {
      if (loanItem.status !== 'Active') continue;
      try {
        const loanObj = await LoanModel.findById(loanItem.loanId);
        if (!loanObj) continue;
        const memberObj = await LoanModel.findMemberById(loanItem.loanMemberId);
        if (!memberObj) continue;
        const slabs = await LoanModel.getSlabsByLoanIds([loanObj.Id]);
        const isCompound = Boolean(loanObj.IsCompound === 1 || loanObj.IsCompound === true || loanObj.IsCompound === '1' || loanObj.IsCompound === 'true');

        const dueRecord = await getDuesForMember(db, memberObj, loanObj, currentCalendarMonth, slabs, false, isCompound);
        if (dueRecord) {
          const approvedPayment = await LoanModel.getPaymentSumByMemberAndMonth(memberObj.Id, currentCalendarMonth);
          const totalPaidMonth = approvedPayment.totalPaid || 0;
          const netDue = Math.max(0, dueRecord.TotalDue - totalPaidMonth);
          calculatedTotalDue += netDue;
        }
      } catch (err) {
        console.error("Error computing loan due for passbook:", err);
      }
    }

    const currentDue = Math.round(calculatedTotalDue);

    // 5. Recent Financial Activity (Date filtered)
    let recentSavingsQuery = `
      SELECT 
         mc.Id as rawId,
         fcg.CollectionDate as date,
         CONCAT('COL-', mc.Id) as reference,
         'Savings Collection' as type,
         COALESCE(ct.TypeName, 'Savings Collection') as particulars,
         mc.Amount as credit,
         0 as debit,
         fcg.meetingId as meetingId,
         m.meetingNo as meetingNo
       FROM MemberCollection mc
       JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
       LEFT JOIN CollectionType ct ON fcg.CollectionTypeId = ct.Id
       LEFT JOIN meetings m ON fcg.meetingId = m.id
       WHERE mc.UserId = ? AND fcg.tenantId = ?
    `;
    const recentSavingsParams: any[] = [memberId, tenantId];
    if (startStr) {
      recentSavingsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) >= ?`;
      recentSavingsParams.push(startStr);
    }
    if (endStr) {
      recentSavingsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) <= ?`;
      recentSavingsParams.push(endStr);
    }
    recentSavingsQuery += ` ORDER BY fcg.CollectionDate DESC, mc.Id DESC LIMIT 10`;

    let recentRepaymentsQuery = `
      SELECT 
         lp.Id as rawId,
         lp.PaymentDate as date,
         CONCAT('PAY-', lp.Id) as reference,
         'Loan Repayment' as type,
         CONCAT('Loan Repayment (', l.LoanNo, ')') as particulars,
         lp.Amount as credit,
         0 as debit,
         lp.meetingId as meetingId,
         m.meetingNo as meetingNo
       FROM LoanPayment lp
       JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
       JOIN Loan l ON lm.LoanId = l.Id
       LEFT JOIN meetings m ON lp.meetingId = m.id
       WHERE lm.UserId = ?
    `;
    const recentRepaymentsParams: any[] = [memberId];
    if (startStr) {
      recentRepaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) >= ?`;
      recentRepaymentsParams.push(startStr);
    }
    if (endStr) {
      recentRepaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) <= ?`;
      recentRepaymentsParams.push(endStr);
    }
    recentRepaymentsQuery += ` ORDER BY lp.PaymentDate DESC, lp.Id DESC LIMIT 10`;

    let recentDisbursementsQuery = `
      SELECT 
         lm.Id as rawId,
         l.StartDate as date,
         l.LoanNo as reference,
         'Loan Disbursement' as type,
         CONCAT('Loan Issued (', l.LoanNo, ')') as particulars,
         0 as credit,
         lm.LoanShareAmount as debit,
         NULL as meetingId,
         NULL as meetingNo
       FROM LoanMember lm
       JOIN Loan l ON lm.LoanId = l.Id
       WHERE lm.UserId = ?
    `;
    const recentDisbursementsParams: any[] = [memberId];
    if (startStr) {
      recentDisbursementsQuery += ` AND SUBSTR(l.StartDate, 1, 10) >= ?`;
      recentDisbursementsParams.push(startStr);
    }
    if (endStr) {
      recentDisbursementsQuery += ` AND SUBSTR(l.StartDate, 1, 10) <= ?`;
      recentDisbursementsParams.push(endStr);
    }
    recentDisbursementsQuery += ` ORDER BY l.StartDate DESC, lm.Id DESC LIMIT 10`;

    const [recentSavings, recentRepayments, recentDisbursements] = await Promise.all([
      db.all(recentSavingsQuery, recentSavingsParams),
      db.all(recentRepaymentsQuery, recentRepaymentsParams),
      db.all(recentDisbursementsQuery, recentDisbursementsParams)
    ]);

    let combinedRecent = [...recentSavings, ...recentRepayments, ...recentDisbursements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    let runningSavings = openingBalance;
    combinedRecent = combinedRecent.reverse().map((tx) => {
      if (tx.type === 'Savings Collection') {
        runningSavings += Math.round(tx.credit);
      }
      return {
        ...tx,
        credit: Math.round(tx.credit),
        debit: Math.round(tx.debit),
        balance: Math.round(runningSavings)
      };
    }).reverse();

    return res.json({
      member: {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        username: member.username,
        phoneNumber: member.phoneNumber,
        status: member.status ? 'Active' : 'Inactive',
        profileImage: member.profileImage,
        memberNumber: member.memberNumber
      },
      groups: memberGroups,
      summary: {
        savingsBalance: currentSavingsBalance,
        loanOutstanding: totalOutstandingPrincipal,
        totalPaid: totalPaid,
        currentDue: currentDue
      },
      savings: {
        openingBalance: openingBalance,
        totalContributions: totalContributions,
        totalWithdrawals: totalWithdrawals,
        currentBalance: currentSavingsBalance
      },
      loanSummary: {
        totalLoans: totalLoansCount,
        activeLoans: activeLoansCount,
        totalBorrowed: totalBorrowed,
        principalPaid: principalPaid,
        outstandingPrincipal: totalOutstandingPrincipal,
        interestPaid: interestPaid,
        interestDue: currentDue
      },
      loans: loansList.map((l: any) => ({
        ...l,
        loanAmount: Math.round(l.loanAmount),
        outstandingPrincipal: Math.round(l.outstandingPrincipal)
      })),
      recentTransactions: combinedRecent
    });

  } catch (error: any) {
    console.error("GetMemberPassbookData error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch member passbook data" });
  }
};

export const getMemberPassbookTransactions = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { memberId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, type, page = '1', limit = '100' } = req.query;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    const startStr = startDate ? String(startDate).trim() : '';
    const endStr = endDate ? String(endDate).trim() : '';

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.max(1, Math.min(500, parseInt(String(limit))));
    const offset = (pageNum - 1) * limitNum;

    // 1. Fetch Savings Collections
    let savingsQuery = `
      SELECT 
        mc.Id as rawId,
        fcg.CollectionDate as date,
        CONCAT('COL-', mc.Id) as reference,
        'Savings Collection' as type,
        COALESCE(ct.TypeName, 'Savings Collection') as particulars,
        mc.Amount as credit,
        0 as debit,
        fcg.meetingId as meetingId,
        m.meetingNo as meetingNo
      FROM MemberCollection mc
      JOIN FundCollectionGroup fcg ON mc.CollectionGroupId = fcg.Id
      LEFT JOIN CollectionType ct ON fcg.CollectionTypeId = ct.Id
      LEFT JOIN meetings m ON fcg.meetingId = m.id
      WHERE mc.UserId = ? AND fcg.tenantId = ?
    `;
    const savingsParams: any[] = [memberId, tenantId];

    if (startStr) {
      savingsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) >= ?`;
      savingsParams.push(startStr);
    }
    if (endStr) {
      savingsQuery += ` AND SUBSTR(fcg.CollectionDate, 1, 10) <= ?`;
      savingsParams.push(endStr);
    }

    // 2. Fetch Loan Repayments
    let repaymentsQuery = `
      SELECT 
        lp.Id as rawId,
        lp.PaymentDate as date,
        CONCAT('PAY-', lp.Id) as reference,
        'Loan Repayment' as type,
        CONCAT('Loan Repayment (', l.LoanNo, ')') as particulars,
        lp.Amount as credit,
        0 as debit,
        lp.meetingId as meetingId,
        m.meetingNo as meetingNo
      FROM LoanPayment lp
      JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
      JOIN Loan l ON lm.LoanId = l.Id
      LEFT JOIN meetings m ON lp.meetingId = m.id
      WHERE lm.UserId = ?
    `;
    const repaymentsParams: any[] = [memberId];

    if (startStr) {
      repaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) >= ?`;
      repaymentsParams.push(startStr);
    }
    if (endStr) {
      repaymentsQuery += ` AND SUBSTR(lp.PaymentDate, 1, 10) <= ?`;
      repaymentsParams.push(endStr);
    }

    // 3. Fetch Loan Disbursements
    let disbursementsQuery = `
      SELECT 
        lm.Id as rawId,
        l.StartDate as date,
        l.LoanNo as reference,
        'Loan Disbursement' as type,
        CONCAT('Loan Issued (', l.LoanNo, ')') as particulars,
        0 as credit,
        lm.LoanShareAmount as debit,
        NULL as meetingId,
        NULL as meetingNo
      FROM LoanMember lm
      JOIN Loan l ON lm.LoanId = l.Id
      WHERE lm.UserId = ?
    `;
    const disbursementsParams: any[] = [memberId];

    if (startStr) {
      disbursementsQuery += ` AND SUBSTR(l.StartDate, 1, 10) >= ?`;
      disbursementsParams.push(startStr);
    }
    if (endStr) {
      disbursementsQuery += ` AND SUBSTR(l.StartDate, 1, 10) <= ?`;
      disbursementsParams.push(endStr);
    }

    const [savingsRows, repaymentsRows, disbursementsRows] = await Promise.all([
      db.all(savingsQuery, savingsParams),
      db.all(repaymentsQuery, repaymentsParams),
      db.all(disbursementsQuery, disbursementsParams)
    ]);

    let allTransactions = [...savingsRows, ...repaymentsRows, ...disbursementsRows];

    if (type && type !== 'All') {
      allTransactions = allTransactions.filter(t => t.type === type);
    }

    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    allTransactions = allTransactions.map(tx => {
      if (tx.type === 'Savings Collection') {
        runningBalance += Math.round(tx.credit);
      } else if (tx.type === 'Savings Withdrawal') {
        runningBalance -= Math.round(tx.debit);
      }
      return {
        ...tx,
        credit: Math.round(tx.credit),
        debit: Math.round(tx.debit),
        balance: Math.round(runningBalance)
      };
    });

    const totalItems = allTransactions.length;
    const totalPages = Math.ceil(totalItems / limitNum);

    const paginatedItems = allTransactions.reverse().slice(offset, offset + limitNum);

    return res.json({
      items: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages
      }
    });

  } catch (error: any) {
    console.error("GetMemberPassbookTransactions error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch passbook transactions" });
  }
};
