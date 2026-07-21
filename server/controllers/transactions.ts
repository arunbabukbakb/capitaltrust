import { Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '1';
    const { transactionType, startDate, endDate, search, page, limit } = req.query;

    const filters = {
      transactionType: transactionType ? String(transactionType) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      search: search ? String(search) : undefined
    };

    const pageNum = Number(page || 1);
    const limitNum = Number(limit || 10);

    const result = await TransactionModel.listPaginatedByTenant(tenantId, filters, pageNum, limitNum);
    res.json(result);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

export const getTransactionSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.headers['x-tenant-id'] as string) || '1';
    const { transactionType, startDate, endDate, search } = req.query;

    const filters = {
      transactionType: transactionType ? String(transactionType) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      search: search ? String(search) : undefined
    };

    const summary = await TransactionModel.getSummaryByTenant(tenantId, filters);
    res.json(summary);
  } catch (error) {
    console.error("Get transaction summary error:", error);
    res.status(500).json({ error: "Failed to fetch transaction summary" });
  }
};
