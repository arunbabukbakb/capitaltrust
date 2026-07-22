import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ExpenseModel, Expense } from '../models/Expense';
import { UserModel } from '../models/User';
import { recordTransaction } from '../services/transactionService';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

async function getUserContextFromRequest(req: Request) {
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await UserModel.findById(payload.id);
    if (!user) return null;

    const assignedRoles = await UserModel.getAssignedRoles(user.id);
    const isAdminOrManager = assignedRoles.some(r => r.roleType === 'admin' || r.roleType === 'manager') ||
                             user.role === 'admin' || user.role === 'manager';

    return {
      user,
      assignedRoles,
      isAdminOrManager
    };
  } catch {
    return null;
  }
}

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const expenses = await ExpenseModel.listByTenant(tenantId);
    res.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userContext = await getUserContextFromRequest(req);

    if (!userContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { expenseDate, amount, paymentMode, referenceNo, description, expenseBy, ExpenseBy } = req.body;
    const rawExpenseBy = expenseBy || ExpenseBy;

    // Validate non-nullable Description
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required and cannot be empty." });
    }

    // Validate Amount
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number greater than 0." });
    }

    // Validate PaymentMode
    if (!['Cash', 'Bank', 'UPI'].includes(paymentMode)) {
      return res.status(400).json({ error: "Payment mode must be Cash, Bank, or UPI." });
    }

    // Validate ExpenseDate
    if (!expenseDate) {
      return res.status(400).json({ error: "Expense date is required." });
    }

    // Business Rule: Admin / Manager entries are directly Approved; Member entries are Draft
    const initialStatus: 'Approved' | 'Draft' = userContext.isAdminOrManager ? 'Approved' : 'Draft';

    // ExpenseBy rule:
    // If admin or manager: use passed expenseBy (optional).
    // If member (user): set to login user ID automatically.
    const resolvedExpenseBy = userContext.isAdminOrManager
      ? (rawExpenseBy ? String(rawExpenseBy).trim() : null)
      : userContext.user.id;

    const count = await ExpenseModel.countByTenant(tenantId);
    const expenseId = `EXP-${10001 + count}`;

    const newExpense: Omit<Expense, 'CreatedAt' | 'createdByName' | 'expenseByName'> = {
      Id: expenseId,
      TenantId: tenantId,
      ExpenseDate: expenseDate,
      Amount: parsedAmount,
      PaymentMode: paymentMode,
      ReferenceNo: referenceNo ? String(referenceNo).trim() : null,
      Description: description.trim(),
      ExpenseBy: resolvedExpenseBy,
      Status: initialStatus,
      CreatedBy: userContext.user.id
    };

    await ExpenseModel.create(newExpense);

    if (initialStatus === 'Approved') {
      await recordTransaction({
        tenantId,
        transactionDate: expenseDate,
        transactionType: 'Expense',
        amount: parsedAmount,
        referenceType: 'Expense',
        referenceId: expenseId,
        narration: description.trim(),
        createdBy: userContext.user.id
      });
    }

    const createdRecord = await ExpenseModel.findById(expenseId, tenantId);
    res.status(201).json(createdRecord || newExpense);
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
};

export const approveExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userContext = await getUserContextFromRequest(req);

    if (!userContext || !userContext.isAdminOrManager) {
      return res.status(403).json({ error: "Only administrators or managers can approve expenses." });
    }

    const expense = await ExpenseModel.findById(id, tenantId);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    if (expense.Status === 'Approved') {
      return res.status(400).json({ error: "Expense is already approved." });
    }

    await ExpenseModel.updateStatus(id, tenantId, 'Approved');

    await recordTransaction({
      tenantId,
      transactionDate: expense.ExpenseDate,
      transactionType: 'Expense',
      amount: expense.Amount,
      referenceType: 'Expense',
      referenceId: expense.Id,
      narration: expense.Description,
      createdBy: userContext.user.id
    });

    const updated = await ExpenseModel.findById(id, tenantId);
    res.json(updated);
  } catch (error) {
    console.error("Approve expense error:", error);
    res.status(500).json({ error: "Failed to approve expense" });
  }
};

export const cancelExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userContext = await getUserContextFromRequest(req);

    if (!userContext || !userContext.isAdminOrManager) {
      return res.status(403).json({ error: "Only administrators or managers can cancel expenses." });
    }

    const expense = await ExpenseModel.findById(id, tenantId);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    if (expense.Status === 'Cancelled') {
      return res.status(400).json({ error: "Expense is already cancelled." });
    }

    await ExpenseModel.updateStatus(id, tenantId, 'Cancelled');

    const updated = await ExpenseModel.findById(id, tenantId);
    res.json(updated);
  } catch (error) {
    console.error("Cancel expense error:", error);
    res.status(500).json({ error: "Failed to cancel expense" });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userContext = await getUserContextFromRequest(req);

    if (!userContext) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const expense = await ExpenseModel.findById(id, tenantId);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Authorization check:
    // Admin / Manager can edit any entry.
    // Member can edit ONLY their own entry and ONLY if it is still Draft.
    if (!userContext.isAdminOrManager) {
      if (expense.CreatedBy !== userContext.user.id) {
        return res.status(403).json({ error: "You can only edit your own expense entries." });
      }
      if (expense.Status !== 'Draft') {
        return res.status(403).json({ error: "Members can only edit draft expenses before they are approved." });
      }
    }

    const { expenseDate, amount, paymentMode, referenceNo, description, expenseBy, ExpenseBy } = req.body;
    const rawExpenseBy = expenseBy !== undefined ? expenseBy : ExpenseBy;

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ error: "Description is required and cannot be empty." });
      }
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number greater than 0." });
      }
    }

    if (paymentMode !== undefined && !['Cash', 'Bank', 'UPI'].includes(paymentMode)) {
      return res.status(400).json({ error: "Payment mode must be Cash, Bank, or UPI." });
    }

    const updatedExpenseBy = userContext.isAdminOrManager
      ? (rawExpenseBy !== undefined ? (rawExpenseBy ? String(rawExpenseBy).trim() : null) : undefined)
      : undefined;

    await ExpenseModel.update(id, tenantId, {
      ExpenseDate: expenseDate,
      Amount: amount !== undefined ? Number(amount) : undefined,
      PaymentMode: paymentMode,
      ReferenceNo: referenceNo !== undefined ? (referenceNo ? String(referenceNo).trim() : null) : undefined,
      Description: description !== undefined ? description.trim() : undefined,
      ExpenseBy: updatedExpenseBy
    });

    const updated = await ExpenseModel.findById(id, tenantId);
    res.json(updated);
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

export const getTodayExpenseSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const summary = await ExpenseModel.getTodaySummary(tenantId, todayStr);
    res.json(summary);
  } catch (error) {
    console.error("Get today expense summary error:", error);
    res.status(500).json({ error: "Failed to fetch today expense summary" });
  }
};

