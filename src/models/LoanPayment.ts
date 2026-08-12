export interface LoanPayment {
  id: string;
  loanId: string;
  amountPaid: number;
  principalAmount: number;
  interestAmount: number;
  paymentDate: string;
  remarks?: string;
  month: number; // YYYYMM format
  approved: boolean;
  dueAmount?: number;
  interestDue?: number;
  principalDue?: number;
  userName?: string;
  userId?: string;
  hasRequest?: boolean;
  loanAmount?: number;
  requestId?: number;
  requestedAmount?: number;
  loanMemberId?: number;
  loanNo?: string;
  canEdit?: boolean;
  interestRate?: number;
  interestMode?: string;
  outstandingBalance?: number;
  startDate?: string;
  dueStatus?: 'Overdue' | 'Pending' | 'Paid' | 'Partial';
  carryForwardInterest?: number;
  isLastPayment?: boolean;
}
