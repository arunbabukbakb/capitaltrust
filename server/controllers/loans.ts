import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';

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
  const db = getDatabase();
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
    const user = await db.get("SELECT id FROM users WHERE id = ?", [member.userId]);
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
  const db = getDatabase();
  try {
    const structuredLoans = await db.all(`
      SELECT
        l.Id,
        l.LoanNo,
        l.LoanType,
        l.Amount,
        l.OutstandingPrincipal,
        l.TenureMonths,
        l.StartDate,
        l.EndDate,
        l.InterestMode,
        l.InterestRate,
        l.Status,
        l.CreatedBy,
        l.CreatedDate,
        COALESCE(p.PaidToDate, 0) as PaidToDate,
        GROUP_CONCAT(u.fullName, ', ') as MemberNames,
        GROUP_CONCAT(lm.UserId, ', ') as MemberIds
      FROM Loan l
      LEFT JOIN LoanMember lm ON lm.LoanId = l.Id
      LEFT JOIN users u ON u.id = lm.UserId
      LEFT JOIN (
        SELECT lm.LoanId, SUM(lp.Amount) as PaidToDate
        FROM LoanPayment lp
        JOIN LoanMember lm ON lp.LoanMemberId = lm.Id
        GROUP BY lm.LoanId
      ) p ON p.LoanId = l.Id
      GROUP BY l.Id
      ORDER BY l.CreatedDate DESC
    `);

    const structuredLoanIds = structuredLoans.map((loan: any) => loan.Id);
    const slabsByLoan = structuredLoanIds.length
      ? await db.all(
          `SELECT * FROM LoanInterestSlab WHERE LoanId IN (${structuredLoanIds.map(() => "?").join(",")}) ORDER BY FromAmount`,
          structuredLoanIds
        )
      : [];
    const paymentsByLoan = structuredLoanIds.length
      ? await db.all(
          `SELECT lm.LoanId, COUNT(*) as RepaymentCount FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id WHERE lm.LoanId IN (${structuredLoanIds.map(() => "?").join(",")}) GROUP BY lm.LoanId`,
          structuredLoanIds
        )
      : [];
    const membersByLoan = structuredLoanIds.length
      ? await db.all(
          `SELECT lm.*, u.fullName FROM LoanMember lm LEFT JOIN users u ON u.id = lm.UserId WHERE LoanId IN (${structuredLoanIds.map(() => "?").join(",")}) ORDER BY lm.Id`,
          structuredLoanIds
        )
      : [];

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
}

export const createLoan = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    await db.run("BEGIN TRANSACTION");
    try {
      await db.run(
        `INSERT INTO Loan
          (Id, LoanNo, LoanType, Amount, OutstandingPrincipal, TenureMonths, StartDate, EndDate, InterestMode, InterestRate, Status, CreatedBy, CreatedDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          loanId,
          loanNo,
          normalizedLoanType,
          parsedAmount,
          parsedAmount,
          parsedTenure,
          startDate,
          computedEndDate,
          normalizedInterestMode,
          normalizedInterestMode === "Fixed" ? Number(interestRate) : null,
          normalizedStatus,
          createdBy,
          createdDate,
        ]
      );

      for (const member of loanMembers) {
        await db.run(
          "INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate) VALUES (?, ?, ?, ?, ?)",
          [loanId, member.userId, Number(member.loanShareAmount), Number(member.loanShareAmount), createdDate]
        );
      }

      if (normalizedInterestMode === "Variable") {
        for (const slab of interestSlabs) {
          await db.run(
            "INSERT INTO LoanInterestSlab (LoanId, FromAmount, ToAmount, InterestRate) VALUES (?, ?, ?, ?)",
            [loanId, Number(slab.fromAmount), Number(slab.toAmount), Number(slab.interestRate)]
          );
        }
      }

      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }

    const createdLoan = await db.get("SELECT * FROM Loan WHERE Id = ?", [loanId]);
    res.status(201).json(createdLoan);
  } catch (error) {
    console.error("Create loan error", error);
    res.status(500).json({ error: "Error creating loan" });
  }
};

export const updateLoan = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    const existingLoan = await db.get("SELECT * FROM Loan WHERE Id = ? OR LoanNo = ?", [req.params.id, req.params.id]);
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

    const paid = await db.get<{ total: number }>("SELECT COALESCE(SUM(lp.Amount), 0) as total FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id WHERE lm.LoanId = ?", [existingLoan.Id]);
    if ((paid?.total || 0) > parsedAmount) {
      return res.status(400).json({ error: "Loan amount cannot be less than repayments already posted" });
    }

    const computedEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + parsedTenure);
      return date.toISOString().split("T")[0];
    })();
    const normalizedStatus = ["Pending", "Active", "Closed", "Cancelled"].includes(status) ? status : existingLoan.Status;
    const updatedDate = new Date().toISOString();

    await db.run("BEGIN TRANSACTION");
    try {
      await db.run(
        `UPDATE Loan
         SET LoanType = ?, Amount = ?, OutstandingPrincipal = ?, TenureMonths = ?, StartDate = ?, EndDate = ?,
             InterestMode = ?, InterestRate = ?, Status = ?
         WHERE Id = ?`,
        [
          normalizedLoanType,
          parsedAmount,
          parsedAmount,
          parsedTenure,
          startDate,
          computedEndDate,
          normalizedInterestMode,
          normalizedInterestMode === "Fixed" ? Number(interestRate) : null,
          normalizedStatus,
          existingLoan.Id,
        ]
      );

      await db.run("DELETE FROM LoanMember WHERE LoanId = ?", [existingLoan.Id]);
      for (const member of loanMembers) {
        await db.run(
          "INSERT INTO LoanMember (LoanId, UserId, LoanShareAmount, OutstandingPrincipal, CreatedDate) VALUES (?, ?, ?, ?, ?)",
          [existingLoan.Id, member.userId, Number(member.loanShareAmount), Number(member.loanShareAmount), updatedDate]
        );
      }

      await db.run("DELETE FROM LoanInterestSlab WHERE LoanId = ?", [existingLoan.Id]);
      if (normalizedInterestMode === "Variable") {
        for (const slab of interestSlabs) {
          await db.run(
            "INSERT INTO LoanInterestSlab (LoanId, FromAmount, ToAmount, InterestRate) VALUES (?, ?, ?, ?)",
            [existingLoan.Id, Number(slab.fromAmount), Number(slab.toAmount), Number(slab.interestRate)]
          );
        }
      }

      await db.run("COMMIT");
    } catch (error) {
      await db.run("ROLLBACK");
      throw error;
    }

    const updatedLoan = await db.get("SELECT * FROM Loan WHERE Id = ?", [existingLoan.Id]);
    res.json(updatedLoan);
  } catch (error) {
    console.error("Update loan error", error);
    res.status(500).json({ error: "Error updating loan" });
  }
};

export const deleteLoan = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    const existingLoan = await db.get("SELECT * FROM Loan WHERE Id = ? OR LoanNo = ?", [req.params.id, req.params.id]);
    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const repayment = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM LoanPayment lp JOIN LoanMember lm ON lp.LoanMemberId = lm.Id WHERE lm.LoanId = ?", [existingLoan.Id]);
    if ((repayment?.count || 0) > 0) {
      return res.status(409).json({ error: "Cannot delete this loan because repayment has already started" });
    }

    await db.run("DELETE FROM Loan WHERE Id = ?", [existingLoan.Id]);
    res.status(204).send();
  } catch (error) {
    console.error("Delete loan error", error);
    res.status(500).json({ error: "Error deleting loan" });
  }
};

export const approveLoan = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    const existingLoan = await db.get("SELECT * FROM Loan WHERE Id = ? OR LoanNo = ?", [req.params.id, req.params.id]);
    if (!existingLoan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    await db.run("UPDATE Loan SET Status = 'Active' WHERE Id = ?", [existingLoan.Id]);

    const updatedLoan = await db.get("SELECT * FROM Loan WHERE Id = ?", [existingLoan.Id]);
    res.json(updatedLoan);
  } catch (error) {
    console.error("Approve loan error", error);
    res.status(500).json({ error: "Error approving loan" });
  }
};

