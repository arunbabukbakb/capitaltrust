import { TransactionModel, Transaction } from '../models/Transaction';

export interface CreateTransactionParams {
  tenantId: string | number;
  transactionDate: string;
  transactionType: 'Collection' | 'LoanIssue' | 'LoanRepayment' | 'Expense' | 'OpeningBalance' | 'Adjustment';
  amount: number;
  referenceType: string;
  referenceId: string;
  narration: string;
  status?: string;
  createdBy: string;
  updatedBy?: string;
}

export async function recordTransaction(params: CreateTransactionParams): Promise<Transaction> {
  const count = await TransactionModel.countByTenant(params.tenantId);
  const transactionNo = `TXN-${10001 + count}`;
  const id = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newTxn: Omit<Transaction, 'CreatedAt' | 'createdByName'> = {
    Id: id,
    TenantId: params.tenantId,
    TransactionNo: transactionNo,
    TransactionDate: params.transactionDate,
    TransactionType: params.transactionType,
    Amount: Number(params.amount || 0),
    ReferenceType: params.referenceType,
    ReferenceId: params.referenceId,
    Narration: params.narration,
    Status: params.status || 'Completed',
    CreatedBy: params.createdBy,
    UpdatedBy: params.updatedBy || null,
    UpdatedAt: null
  };

  await TransactionModel.create(newTxn);
  return newTxn as Transaction;
}
