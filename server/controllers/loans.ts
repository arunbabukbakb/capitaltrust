import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { LoanModel } from '../models/Loan';
import { UserModel } from '../models/User';
import { sendPushNotification } from '../firebaseAdmin';
import { recordTransaction } from '../services/transactionService';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

interface LoanMemberInput {
  userId: string;
  loanShareAmount: number;
}

interface LoanInterestSlabInput {
  fromAmount: number;
  toAmount: number;
  interestRate: number;
}

const validateStructuredLoanPayload = async (payload: any) => {
  const {
    loanType,
    amount,
    tenureMonths,
    startDate,
    interestMode,
    interestRate,
    members,
    slabs,
  } = payload;

  const parsedAmount = Number(amount);
  const parsedTenure = Number(tenureMonths);
  const normalizedLoanType = loanType === "Group" ? "Group" : "Single";
  const normalizedInterestMode = interestMode === "Variable" ? "Variable" : "Fixed";
  const loanMembers: LoanMemberInput[] = Array.isArray(members) ? members : [];
  const interestSlabs: LoanInterestSlabInput[] = Array.isArray(slabs) ? slabs : [];

  if (!parsedAmount || parsedAmount <= 0 || !parsedTenure || parsedTenure <= 0 || !startDate) {
    return { error: "Amount, tenure, and start date are required" };
  }

  if (normalizedLoanType === "Single" && loanMembers.length !== 1) {
    return { error: "Single loans must have exactly one member" };
  }

  if (normalizedLoanType === "Group" && loanMembers.length < 2) {
    return { error: "Group loans must have at least two members" };
  }

  const memberIds = loanMembers.map((member) => member.userId).filter(Boolean);
  if (new Set(memberIds).size !== memberIds.length) {
    return { error: "A member can only be selected once per loan" };
  }

  const memberShareTotal = loanMembers.reduce((sum, member) => sum + Number(member.loanShareAmount || 0), 0);
  if (Math.abs(memberShareTotal - parsedAmount) > 0.01) {
    return { error: "Member share amounts must equal the loan amount" };
  }

  if (loanMembers.some((member) => !member.userId || Number(member.loanShareAmount) <= 0)) {
    return { error: "Every member needs a user and positive share amount" };
  }

  if (normalizedInterestMode === "Fixed" && (Number(interestRate) < 0 || interestRate === "" || interestRate === null || interestRate === undefined)) {
    return { error: "Fixed interest loans require an interest rate" };
  }

  if (normalizedInterestMode === "Variable") {
    if (!interestSlabs.length) {
      return { error: "Variable interest loans require at least one slab" };
    }
    const invalidSlab = interestSlabs.find((slab) => Number(slab.fromAmount) < 0 || Number(slab.toAmount) <= Number(slab.fromAmount) || Number(slab.interestRate) < 0);
    if (invalidSlab) {
      return { error: "Variable interest slabs must have valid amount ranges and rates" };
    }
  }

  for (const member of loanMembers) {
    const user = await UserModel.findById(member.userId);
    if (!user) {
      return { error: `Invalid user selected: ${member.userId}` };
    }
  }

  return {
    parsedAmount,
    parsedTenure,
    normalizedLoanType,
    normalizedInterestMode,
    loanMembers,
    interestSlabs,
  };
};

export const getLoans = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const structuredLoans = await LoanModel.listAllLoans(tenantId);
    const structuredLoanIds = structuredLoans.map((loan: any) => loan.Id);
    
    const slabsByLoan = await LoanModel.getSlabsByLoanIds(structuredLoanIds);
    const paymentsByLoan = await LoanModel.getPaymentsCountByLoanIds(structuredLoanIds);
    const membersByLoan = await LoanModel.getMembersByLoanIds(structuredLoanIds);

    const mappedStructuredLoans = structuredLoans.map((loan: any) => {
      const status = String(loan.Status).toUpperCase();
      const paidToDate = Number(loan.PaidToDate || 0);
      const repaymentCount = Number(paymentsByLoan.find((payment: any) => payment.LoanId === loan.Id)?.RepaymentCount || 0);
      return {
        id: loan.LoanNo,
        loanId: loan.Id,
        loanNo: loan.LoanNo,
        loanType: loan.LoanType,
        memberName: loan.MemberNames || "Unassigned",
        memberId: loan.MemberIds || "",
        principal: Number(loan.Amount),
        amount: Number(loan.Amount),
        outstandingBalance: Number(loan.OutstandingPrincipal || 0),
        interestMode: loan.InterestMode,
        interestRate: loan.InterestRate,
        remainingTerm: Number(loan.TenureMonths),
        tenureMonths: Number(loan.TenureMonths),
        paidToDate,
        repaymentCount,
        canDelete: repaymentCount === 0,
        nextDueDate: loan.StartDate,
        startDate: loan.StartDate,
        endDate: loan.EndDate,
        status,
        type: `${loan.LoanType} Loan`,
        members: membersByLoan
          .filter((member: any) => member.LoanId === loan.Id)
          .map((member: any) => ({
            id: member.Id,
            userId: member.UserId,
            fullName: member.fullName,
            loanShareAmount: Number(member.LoanShareAmount),
            outstandingPrincipal: Number(member.OutstandingPrincipal || 0),
          })),
        slabs: slabsByLoan
          .filter((slab: any) => slab.LoanId === loan.Id)
          .map((slab: any) => ({
            id: slab.Id,
            fromAmount: Number(slab.FromAmount),
            toAmount: Number(slab.ToAmount),
            interestRate: Number(slab.InterestRate),
          })),
      };
    });

    res.json([...mappedStructuredLoans]);
  } catch (error) {
    console.error("Get loans error", error);
    res.status(500).json({ error: "Error fetching loans list" });
  }
};

export const createLoan = async (req: Request, res: Response) => {
  try {
    const {
      loanType,
      amount,
      tenureMonths,
      startDate,
      endDate,
      interestMode,
      interestRate,
      members,
      slabs,
      status,
    } = req.body;

    const validation = await validateStructuredLoanPayload({
      loanType,
      amount,
      tenureMonths,
      startDate,
      interestMode,
      interestRate,
      members,
      slabs,
    });
    if ("error" in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      parsedAmount,
      parsedTenure,
      normalizedLoanType,
      normalizedInterestMode,
      loanMembers,
      interestSlabs,
    } = validation;

    const loanId = `LN-${crypto.randomUUID()}`;
    const loanNo = `LN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
    const createdDate = new Date().toISOString();
    const computedEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + parsedTenure);
      return date.toISOString().split("T")[0];
    })();
    const normalizedStatus = ["Pending", "Active", "Closed", "Cancelled"].includes(status) ? status : "Pending";
    let createdBy: string | null = null;

    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    let creatorRole: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
        createdBy = decoded.id;
        creatorRole = decoded.role || null;
      } catch {
        createdBy = null;
      }
    }

    if (normalizedLoanType === "Group" && creatorRole !== 'admin' && creatorRole !== 'manager') {
      return res.status(403).json({ error: "Only admin and manager can create group loans" });
    }

    const db = getDatabase();
    await db.run("BEGIN TRANSACTION");
    try {
      await LoanModel.createLoan({
        Id: loanId,
        LoanNo: loanNo,
        LoanType: normalizedLoanType as 'Single' | 'Group',
        Amount: parsedAmount,
        TenureMonths: parsedTenure,
        StartDate: startDate,
        EndDate: computedEndDate,
        InterestMode: normalizedInterestMode as 'Fixed' | 'Variable',
        InterestRate: normalizedInterestMode === "Fixed" ? Number(interestRate) : undefined,
        Status: normalizedStatus as any,
        CreatedBy: createdBy || undefined,
        CreatedDate: createdDate
      });

      for (const member of loanMembers) {
        await LoanModel.addLoanMember({
          LoanId: loanId,
          UserId: member.userId,
          LoanShareAmount: Number(member.loanShareAmount),
          CreatedDate: createdDate,
          Status: 'Active'
        });
      }

      if (normalizedInterestMode === "Variable") {
        for (const slab of interestSlabs) {
          await LoanModel.addInterestSlab({
            LoanId: loanId,
            FromAmount: Number(slab.fromAmount),
            ToAmount: Number(slab.toAmount),
            InterestRate: Number(slab.interestRate)
          });
        }
      }

      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }

    const createdLoan = await LoanModel.findById(loanId);

    // Fire push notifications to admin and manager users asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const db = getDatabase();
        // Fetch all admin and manager user IDs
        const adminUsers = await db.all<{ id: string }[]>(
          `SELECT u.id FROM users u
           JOIN user_roles ur ON ur.userId = u.id
           JOIN roles r ON r.id = ur.roleId
           WHERE r.roleType IN ('admin', 'manager')`,
          []
        );
        const adminUserIds = adminUsers.map(u => u.id);
        if (adminUserIds.length > 0) {
          const notifAmount = new Intl.NumberFormat('en-IN').format(parsedAmount);
          const requesterName = createdLoan?.MemberNames || 'A member';
          await sendPushNotification(
            adminUserIds,
            'New Loan Facility Request',
            `${requesterName} has submitted a new loan request of ₹${notifAmount} (Facility No: ${loanNo})`,
            '/loan-list'
          );
        }
      } catch (notifError) {
        console.error('Failed to send loan notification:', notifError);
      }
    });

    res.status(201).json(createdLoan);
  } catch (error) {
    console.error("Create loan error", error);
    res.status(500).json({ error: "Error creating loan" });
  }
};

export const updateLoan = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'manager') {
      return res.status(403).json({ error: "Only admin and manager can edit loans" });
    }

    const existingLoan = await LoanModel.findById(req.params.id);
    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const {
      loanType,
      amount,
      tenureMonths,
      startDate,
      endDate,
      interestMode,
      interestRate,
      members,
      slabs,
      status,
    } = req.body;

    const validation = await validateStructuredLoanPayload({
      loanType,
      amount,
      tenureMonths,
      startDate,
      interestMode,
      interestRate,
      members,
      slabs,
    });
    if ("error" in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      parsedAmount,
      parsedTenure,
      normalizedLoanType,
      normalizedInterestMode,
      loanMembers,
      interestSlabs,
    } = validation;

    const paidAmount = await LoanModel.getPaidAmountByLoanId(existingLoan.Id);
    if (paidAmount > parsedAmount) {
      return res.status(400).json({ error: "Loan amount cannot be less than repayments already posted" });
    }

    const computedEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + parsedTenure);
      return date.toISOString().split("T")[0];
    })();
    const normalizedStatus = ["Pending", "Active", "Closed", "Cancelled"].includes(status) ? status : existingLoan.Status;
    const updatedDate = new Date().toISOString();

    const db = getDatabase();
    await db.run("BEGIN TRANSACTION");
    try {
      await LoanModel.updateLoan(existingLoan.Id, {
        LoanType: normalizedLoanType as 'Single' | 'Group',
        Amount: parsedAmount,
        OutstandingPrincipal: parsedAmount,
        TenureMonths: parsedTenure,
        StartDate: startDate,
        EndDate: computedEndDate,
        InterestMode: normalizedInterestMode as 'Fixed' | 'Variable',
        InterestRate: normalizedInterestMode === "Fixed" ? Number(interestRate) : undefined,
        Status: normalizedStatus as any
      });

      await LoanModel.deleteLoanMembers(existingLoan.Id);
      for (const member of loanMembers) {
        await LoanModel.addLoanMember({
          LoanId: existingLoan.Id,
          UserId: member.userId,
          LoanShareAmount: Number(member.loanShareAmount),
          CreatedDate: updatedDate,
          Status: 'Active'
        });
      }

      await LoanModel.deleteInterestSlabs(existingLoan.Id);
      if (normalizedInterestMode === "Variable") {
        for (const slab of interestSlabs) {
          await LoanModel.addInterestSlab({
            LoanId: existingLoan.Id,
            FromAmount: Number(slab.fromAmount),
            ToAmount: Number(slab.toAmount),
            InterestRate: Number(slab.interestRate)
          });
        }
      }

      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }

    const updatedLoan = await LoanModel.findById(existingLoan.Id);

    // If loan status transitions to Active/Approved, notify the members
    const statusChangedToActive = (existingLoan.Status !== 'Active' && existingLoan.Status !== 'ACTIVE') &&
                                  (normalizedStatus === 'Active' || normalizedStatus === 'ACTIVE');
    if (statusChangedToActive) {
      setImmediate(async () => {
        try {
          const members = await LoanModel.getMembersByLoanIds([existingLoan.Id]);
          const userIds = members.map((m: any) => m.UserId).filter(Boolean);
          if (userIds.length > 0) {
            const notifAmount = new Intl.NumberFormat('en-IN').format(parsedAmount);
            await sendPushNotification(
              userIds,
              'Loan Facility Approved',
              `Your loan facility of ₹${notifAmount} (Facility No: ${updatedLoan?.LoanNo || existingLoan.LoanNo}) has been approved!`,
              '/loan-repayment'
            );
          }
        } catch (notifError) {
          console.error('Failed to send loan approval notification:', notifError);
        }
      });
    }

    res.json(updatedLoan);
  } catch (error) {
    console.error("Update loan error", error);
    res.status(500).json({ error: "Error updating loan" });
  }
};

export const deleteLoan = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'manager') {
      return res.status(403).json({ error: "Only admin and manager can delete loans" });
    }

    const existingLoan = await LoanModel.findById(req.params.id);
    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const repayments = await LoanModel.getPaymentsCountByLoanIds([existingLoan.Id]);
    const count = repayments.length ? repayments[0].RepaymentCount : 0;
    if (count > 0) {
      return res.status(409).json({ error: "Cannot delete this loan because repayment has already started" });
    }

    await LoanModel.deleteLoan(existingLoan.Id);
    res.status(204).send();
  } catch (error) {
    console.error("Delete loan error", error);
    res.status(500).json({ error: "Error deleting loan" });
  }
};

export const approveLoan = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'manager') {
      return res.status(403).json({ error: "Only admin and manager can approve loans" });
    }

    const existingLoan = await LoanModel.findById(req.params.id);
    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    await LoanModel.updateLoan(existingLoan.Id, { Status: 'Active' });

    await recordTransaction({
      tenantId: (req.headers['x-tenant-id'] as string) || 1,
      transactionDate: existingLoan.StartDate || new Date().toISOString().split('T')[0],
      transactionType: 'LoanIssue',
      amount: existingLoan.Amount,
      referenceType: 'Loan',
      referenceId: existingLoan.Id,
      narration: `Disbursement of Loan Facility ${existingLoan.LoanNo}`,
      createdBy: decoded.id
    });

    const updatedLoan = await LoanModel.findById(existingLoan.Id);

    // Trigger notification to the members of the loan
    setImmediate(async () => {
      try {
        const members = await LoanModel.getMembersByLoanIds([existingLoan.Id]);
        const userIds = members.map((m: any) => m.UserId).filter(Boolean);
        if (userIds.length > 0) {
          const notifAmount = new Intl.NumberFormat('en-IN').format(existingLoan.Amount);
          await sendPushNotification(
            userIds,
            'Loan Facility Approved',
            `Your loan facility of ₹${notifAmount} (Facility No: ${existingLoan.LoanNo}) has been approved!`,
            '/loan-repayment'
          );
        }
      } catch (notifError) {
        console.error('Failed to send loan approval notification:', notifError);
      }
    });

    res.json(updatedLoan);
  } catch (error) {
    console.error("Approve loan error", error);
    res.status(500).json({ error: "Error approving loan" });
  }
};
