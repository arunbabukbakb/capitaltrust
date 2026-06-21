export interface Loan {
  Id: string;
  LoanNo: string;
  LoanType: 'Single' | 'Group';
  Amount: number;
  TenureMonths: number;
  StartDate: string;
  EndDate: string;
  InterestMode: 'Fixed' | 'Variable';
  InterestRate?: number;
  Status: string;
  CreatedBy?: string;
  CreatedDate: string;
}
