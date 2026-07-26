import pdfMake from '../invoices/pdfMakeConfig';
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';

export interface DueReportPDFItem {
  id: string;
  loanId: string;
  loanNo: string;
  loanType: string;
  userId: string;
  userName: string;
  loanShareAmount: number;
  openingPrincipal: number;
  outstandingBalance: number;
  principalDue: number;
  interestDue: number;
  carryForwardInterest: number;
  totalDue: number;
  amountPaid: number;
  netDue: number;
  dueStatus: 'Overdue' | 'Pending' | 'Partial' | 'Paid';
}

export interface DueReportPDFGroup {
  loanId: string;
  loanNo: string;
  loanType: string;
  interestMode: string;
  interestRate: number;
  totalLoanDue: number;
  totalPrincipalDue: number;
  totalInterestDue: number;
  dueMembersCount: number;
  members: DueItem[];
}

export interface DueReportPDFData {
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
  monthLabel: string;
  selectedMonth: number;
  summary: {
    totalDueAmount: number;
    totalPrincipalDue: number;
    totalInterestDue: number;
    totalFacilitiesCount: number;
    totalMembersCount: number;
    totalItemsCount: number;
  };
  grouped: DueReportPDFGroup[];
}

type DueItem = DueReportPDFItem;

export function generateDueReportPDF(
  data: DueReportPDFData,
  action: 'print' | 'download' | 'open' = 'print'
) {
  const comp = data.companySettings || {};
  const tenant = comp.tenantDetails || {};

  const organizationName = tenant.name || comp.companyName || 'CapitalTrust';
  const tenantEmail = tenant.adminEmail || '';
  const tenantPhone = tenant.phone || '';

  const contactText = [
    tenantEmail ? `Email: ${tenantEmail}` : '',
    tenantPhone ? `Phone: ${tenantPhone}` : ''
  ].filter(Boolean).join('  |  ');

  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const content: Content[] = [
    // Report Header Banner
    {
      columns: [
        [
          {
            text: organizationName.toUpperCase(),
            fontSize: 16,
            bold: true,
            color: '#1e1b4b',
            margin: [0, 0, 0, 2],
          },
          {
            text: 'COMMERCIAL LOANS DUE REPORT',
            fontSize: 12,
            bold: true,
            color: '#4338ca',
            margin: [0, 0, 0, 2],
          },
          {
            text: `Billing Month Period: ${data.monthLabel} (Period Code: ${data.selectedMonth})`,
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
      margin: [0, 0, 0, 12],
    },

    // Horizontal Divider
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 782, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' }],
      margin: [0, 0, 0, 10],
    },

    // KPI Summary Section Boxes
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            {
              stack: [
                { text: 'TOTAL DUES OUTSTANDING', fontSize: 7, bold: true, color: '#64748b', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.totalDueAmount).toLocaleString('en-IN')}`, fontSize: 13, bold: true, color: '#e11d48' },
                { text: 'Net pending for billing period', fontSize: 7, color: '#94a3b8', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#fff1f2',
              margin: [8, 6, 8, 6],
            },
            {
              stack: [
                { text: 'SCHEDULED PRINCIPAL DUE', fontSize: 7, bold: true, color: '#64748b', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.totalPrincipalDue).toLocaleString('en-IN')}`, fontSize: 13, bold: true, color: '#0f172a' },
                { text: 'Principal installment component', fontSize: 7, color: '#94a3b8', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#f8fafc',
              margin: [8, 6, 8, 6],
            },
            {
              stack: [
                { text: 'INTEREST & CARRYOVER', fontSize: 7, bold: true, color: '#64748b', margin: [0, 0, 0, 2] },
                { text: `₹ ${Math.round(data.summary.totalInterestDue).toLocaleString('en-IN')}`, fontSize: 13, bold: true, color: '#d97706' },
                { text: 'Interest & accumulated arrears', fontSize: 7, color: '#94a3b8', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#fffbeb',
              margin: [8, 6, 8, 6],
            },
            {
              stack: [
                { text: 'DUE ACCOUNTS / MEMBERS', fontSize: 7, bold: true, color: '#64748b', margin: [0, 0, 0, 2] },
                { text: `${data.summary.totalFacilitiesCount} Loans / ${data.summary.totalMembersCount} Members`, fontSize: 11, bold: true, color: '#4338ca' },
                { text: `Total Due Records: ${data.summary.totalItemsCount}`, fontSize: 7, color: '#94a3b8', margin: [0, 2, 0, 0] },
              ],
              fillColor: '#f5f3ff',
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    },
  ];

  // If no due items exist
  if (!data.grouped || data.grouped.length === 0) {
    content.push({
      text: 'No active due items recorded for this billing period.',
      fontSize: 10,
      italics: true,
      color: '#64748b',
      alignment: 'center',
      margin: [0, 20, 0, 20],
    });
  } else {
    // Loop through each Loan Facility Group
    data.grouped.forEach((group, gIdx) => {
      // Group Header Table / Banner
      content.push({
        table: {
          widths: ['*'],
          body: [
            [
              {
                columns: [
                  {
                    text: `FACILITY #${group.loanNo} (${group.loanType.toUpperCase()} LOAN)`,
                    fontSize: 10,
                    bold: true,
                    color: '#ffffff',
                  },
                  {
                    text: `Rate: ${group.interestRate}% (${group.interestMode}) | Members with Dues: ${group.dueMembersCount} | Facility Due: ₹ ${Math.round(group.totalLoanDue).toLocaleString('en-IN')}`,
                    fontSize: 9,
                    bold: true,
                    color: '#fbbf24',
                    alignment: 'right',
                  },
                ],
                fillColor: '#0f172a',
                margin: [8, 5, 8, 5],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, gIdx === 0 ? 0 : 10, 0, 4],
      });

      // Members Due Table
      const tableHeaders: TableCell[] = [
        { text: 'Beneficiary Member', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9' },
        { text: 'Opening Principal', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Principal Due', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Interest & Arrears', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Total Due', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Amount Paid', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Net Due', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'right' },
        { text: 'Status', fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f1f5f9', alignment: 'center' },
      ];

      const tableRows: TableCell[][] = [tableHeaders];

      group.members.forEach((m) => {
        const statusColor =
          m.dueStatus === 'Overdue' ? '#e11d48' : m.dueStatus === 'Partial' ? '#d97706' : '#475569';
        const statusBg =
          m.dueStatus === 'Overdue' ? '#ffe4e6' : m.dueStatus === 'Partial' ? '#fef3c7' : '#f1f5f9';

        tableRows.push([
          { text: m.userName, fontSize: 8, bold: true, color: '#0f172a' },
          { text: `₹ ${Math.round(m.openingPrincipal).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', color: '#334155' },
          { text: `₹ ${Math.round(m.principalDue).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', color: '#0f172a' },
          { text: `₹ ${Math.round(m.interestDue + m.carryForwardInterest).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', color: '#d97706' },
          { text: `₹ ${Math.round(m.totalDue).toLocaleString('en-IN')}`, fontSize: 8, bold: true, alignment: 'right', color: '#0f172a' },
          { text: `₹ ${Math.round(m.amountPaid).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', color: '#16a34a' },
          { text: `₹ ${Math.round(m.netDue).toLocaleString('en-IN')}`, fontSize: 8, bold: true, alignment: 'right', color: '#e11d48' },
          {
            text: m.dueStatus.toUpperCase(),
            fontSize: 7,
            bold: true,
            color: statusColor,
            fillColor: statusBg,
            alignment: 'center',
          },
        ]);
      });

      content.push({
        table: {
          headerRows: 1,
          widths: ['24%', '13%', '12%', '13%', '11%', '10%', '10%', '7%'],
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
        margin: [0, 0, 0, 8],
      });
    });
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    content,
    footer: (currentPage, pageCount) => {
      return {
        columns: [
          {
            text: `CONFIDENTIAL • ${organizationName.toUpperCase()}`,
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
    pdfDoc.download(`Due_Report_${data.selectedMonth}.pdf`);
  }
}
