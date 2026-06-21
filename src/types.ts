export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: 'member' | 'admin';
}

export type LoanStatus = 'ACTIVE' | 'PENDING' | 'OVERDUE' | 'CLOSED';

export interface Loan {
  id: string; // e.g. "LID-9920", "4492-9910-002"
  memberName: string;
  memberId: string;
  principal: number;
  outstandingBalance: number;
  interestRate: number; // e.g. 4.25
  remainingTerm: number; // in months
  paidToDate: number;
  nextDueDate: string;
  status: LoanStatus;
  type: string; // e.g. "Commercial Real Estate Loan"
}

export type ContributionStatus = 'COMPLETED' | 'PENDING' | 'CANCELED';

export interface Contribution {
  id: string;
  date: string;
  userName: string;
  amount: number;
  method: string;
  status: ContributionStatus;
  reinvestmentEnabled: boolean;
}

export type PaymentStatus = 'Processed' | 'Pending';

export interface Payment {
  id: string; // e.g. "#TRX-88219"
  date: string;
  amount: number;
  type: string; // e.g. "Scheduled Repayment", "Extra Principal Payment"
  status: PaymentStatus;
}
