import pdfMake from '../invoices/pdfMakeConfig';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

export interface PassbookPDFMember {
  id: string;
  fullName: string;
  memberNumber: string;
  email?: string;
  phoneNumber?: string;
  status: string;
}

export interface PassbookPDFSummary {
  savingsBalance: number;
  loanOutstanding: number;
  totalPaid: number;
  currentDue: number;
}

export interface PassbookPDFSavingsSummary {
  openingBalance: number;
  totalContributions: number;
  totalWithdrawals: number;
  currentBalance: number;
}

export interface PassbookPDFLoanSummary {
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  principalPaid: number;
  outstandingPrincipal: number;
  interestPaid: number;
  interestDue: number;
}

export interface PassbookPDFTransaction {
  date: string;
  reference: string;
  type: string;
  particulars: string;
  credit: number;
  debit: number;
  balance: number;
  meetingNo?: string;
}

export interface PassbookPDFData {
  companySettings?: {
    companyName?: string;
    companyLogo?: string;
    supportEmail?: string;
    supportPhone?: string;
    tenantDetails?: {
      name?: string;
      adminEmail?: string;
      phone?: string;
      address?: string;
    };
  } | null;
  member: PassbookPDFMember;
  groups: { id: number; name: string; code: string }[];
  summary: PassbookPDFSummary;
  savings: PassbookPDFSavingsSummary;
  loanSummary: PassbookPDFLoanSummary;
  transactions: PassbookPDFTransaction[];
  dateRangeLabel?: string;
}

export function generateMemberPassbookPDF(
  data: PassbookPDFData,
  action: 'print' | 'download' | 'open' = 'print'
) {
  const comp = data.companySettings || {};
  const tenant = comp.tenantDetails || {};

  const organizationName = tenant.name || comp.companyName || 'CapitalTrust';
  const tenantEmail = tenant.adminEmail || comp.supportEmail || '';
  const tenantPhone = tenant.phone || comp.supportPhone || '';

  const groupsText = data.groups && data.groups.length > 0
    ? data.groups.map(g => g.name).join(', ')
    : 'None';

  const contactText = [
    tenantEmail ? `Email: ${tenantEmail}` : '',
    tenantPhone ? `Phone: ${tenantPhone}` : ''
  ].filter(Boolean).join('  |  ');

  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const content: Content[] = [
    // Header Banner
    {
      columns: [
        [
          {
            text: organizationName.toUpperCase(),
            fontSize: 16,
            bold: true,
            color: '#0f172a',
            margin: [0, 0, 0, 2],
          },
          {
            text: 'MEMBER FINANCIAL PASSBOOK',
            fontSize: 12,
            bold: true,
            color: '#4338ca',
            margin: [0, 0, 0, 2],
          },
          {
            text: `Statement Period: ${data.dateRangeLabel || 'All Time'}`,
            fontSize: 9,
            color: '#64748b',
          },
        ],
        [
          {
            text: `Generated On: ${nowStr}`,
            alignment: 'right',
            fontSize: 8,
            color: '#64748b',
            margin: [0, 0, 0, 2],
          },
          ...(contactText ? [{
            text: contactText,
            alignment: 'right' as const,
            fontSize: 8,
            color: '#64748b',
          }] : []),
        ],
      ],
      margin: [0, 0, 0, 10],
    },

    // Horizontal Divider Line (Full Landscape Width)
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 782, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' }],
      margin: [0, 0, 0, 10],
    },

    // Member Identity Box
    {
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            {
              stack: [
                { text: `Member Name: ${data.member.fullName}`, fontSize: 10, bold: true, color: '#0f172a' },
                { text: `Member No: ${data.member.memberNumber}`, fontSize: 9, color: '#475569', margin: [0, 2, 0, 0] },
                { text: `Status: ${data.member.status}`, fontSize: 9, color: '#16a34a', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#f8fafc',
              margin: [8, 6, 8, 6],
            },
            {
              stack: [
                { text: `Group(s): ${groupsText}`, fontSize: 9, color: '#334155' },
                { text: `Mobile: ${data.member.phoneNumber || 'N/A'}`, fontSize: 9, color: '#475569', margin: [0, 2, 0, 0] },
                { text: `Email: ${data.member.email || 'N/A'}`, fontSize: 9, color: '#475569', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#f8fafc',
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 12],
    },

    // Financial Summary Cards
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            {
              stack: [
                { text: 'SAVINGS BALANCE', fontSize: 7, bold: true, color: '#15803d', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.savingsBalance).toLocaleString('en-IN')}`, fontSize: 12, bold: true, color: '#166534' },
              ],
              fillColor: '#f0fdf4',
              margin: [6, 6, 6, 6],
            },
            {
              stack: [
                { text: 'LOAN OUTSTANDING', fontSize: 7, bold: true, color: '#b45309', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.loanOutstanding).toLocaleString('en-IN')}`, fontSize: 12, bold: true, color: '#92400e' },
              ],
              fillColor: '#fffbeb',
              margin: [6, 6, 6, 6],
            },
            {
              stack: [
                { text: 'TOTAL PAYMENTS', fontSize: 7, bold: true, color: '#4338ca', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.totalPaid).toLocaleString('en-IN')}`, fontSize: 12, bold: true, color: '#3730a3' },
              ],
              fillColor: '#eef2ff',
              margin: [6, 6, 6, 6],
            },
            {
              stack: [
                { text: 'CURRENT DUE', fontSize: 7, bold: true, color: '#be123c', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.currentDue).toLocaleString('en-IN')}`, fontSize: 12, bold: true, color: '#9f1239' },
              ],
              fillColor: '#fff1f2',
              margin: [6, 6, 6, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    },

    // Transaction History Table Section Header
    {
      text: 'TRANSACTION HISTORY',
      fontSize: 10,
      bold: true,
      color: '#1e293b',
      margin: [0, 4, 0, 6],
    },
  ];

  // Build Transaction History Table Header
  const tableHeaders: TableCell[] = [
    { text: 'Date', fontSize: 8, bold: true, color: '#0f172a', fillColor: '#f1f5f9' },
    { text: 'Ref', fontSize: 8, bold: true, color: '#0f172a', fillColor: '#f1f5f9' },
    { text: 'Particulars', fontSize: 8, bold: true, color: '#0f172a', fillColor: '#f1f5f9' },
    { text: 'Credit', fontSize: 8, bold: true, color: '#166534', fillColor: '#f1f5f9', alignment: 'right' },
    { text: 'Debit', fontSize: 8, bold: true, color: '#991b1b', fillColor: '#f1f5f9', alignment: 'right' },
    { text: 'Balance', fontSize: 8, bold: true, color: '#0f172a', fillColor: '#f1f5f9', alignment: 'right' },
    { text: 'Meeting', fontSize: 8, bold: true, color: '#0f172a', fillColor: '#f1f5f9', alignment: 'center' },
  ];

  const tableRows: TableCell[][] = [tableHeaders];

  if (!data.transactions || data.transactions.length === 0) {
    tableRows.push([
      {
        text: 'No transaction history found for this period.',
        colSpan: 7,
        fontSize: 8,
        italics: true,
        color: '#64748b',
        alignment: 'center',
      },
      {}, {}, {}, {}, {}, {}
    ]);
  } else {
    data.transactions.forEach((tx) => {
      tableRows.push([
        { text: tx.date || '—', fontSize: 8, color: '#334155' },
        { text: tx.reference || '—', fontSize: 8, bold: true, color: '#475569' },
        { text: tx.particulars || tx.type, fontSize: 8, color: '#0f172a' },
        {
          text: tx.credit > 0 ? `+ ₹${Math.round(tx.credit).toLocaleString('en-IN')}` : '—',
          fontSize: 8,
          bold: tx.credit > 0,
          color: '#16a34a',
          alignment: 'right',
        },
        {
          text: tx.debit > 0 ? `- ₹${Math.round(tx.debit).toLocaleString('en-IN')}` : '—',
          fontSize: 8,
          bold: tx.debit > 0,
          color: '#dc2626',
          alignment: 'right',
        },
        {
          text: `₹${Math.round(tx.balance || 0).toLocaleString('en-IN')}`,
          fontSize: 8,
          bold: true,
          color: '#0f172a',
          alignment: 'right',
        },
        {
          text: tx.meetingNo || '—',
          fontSize: 8,
          color: tx.meetingNo ? '#4338ca' : '#94a3b8',
          alignment: 'center',
        },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      // 'auto' for fixed fields, '*' for Particulars so it expands across full 782pt landscape width
      widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
      body: tableRows,
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.5 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 0, 0, 10],
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 35],
    content,
    footer: (currentPage, pageCount) => {
      return {
        columns: [
          {
            text: `CONFIDENTIAL PASSBOOK • ${organizationName.toUpperCase()}`,
            fontSize: 7,
            color: '#94a3b8',
            margin: [30, 0, 0, 0],
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 7,
            color: '#94a3b8',
            alignment: 'right',
            margin: [0, 0, 30, 0],
          },
        ],
      };
    },
    defaultStyle: {
      font: 'Roboto',
    },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);

  if (action === 'print') {
    pdfDoc.print();
  } else if (action === 'open') {
    pdfDoc.open();
  } else {
    pdfDoc.download(`Passbook_${data.member.memberNumber}_${data.member.fullName.replace(/\s+/g, '_')}.pdf`);
  }
}
