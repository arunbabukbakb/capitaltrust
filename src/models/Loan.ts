export interface Loan {
  Id?: string;
  id?: string;
  loanId?: string;
  LoanNo?: string;
  loanNo?: string;
  LoanType?: 'Single' | 'Group';
  loanType?: 'Single' | 'Group';
  Amount?: number;
  amount?: number;
  TenureMonths?: number;
  tenureMonths?: number;
  StartDate?: string;
  startDate?: string;
  EndDate?: string;
  endDate?: string;
  InterestMode?: 'Fixed' | 'Variable';
  interestMode?: 'Fixed' | 'Variable';
  InterestRate?: number;
  interestRate?: number;
  Status?: string;
  status?: string;
  CreatedBy?: string;
  CreatedDate?: string;
}

