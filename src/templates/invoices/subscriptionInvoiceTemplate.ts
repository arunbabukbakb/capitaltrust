import pdfMake from './pdfMakeConfig';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

export interface SubscriptionInvoiceData {
  companySettings?: {
    companyName?: string;
    companyLogo?: string;
    supportEmail?: string;
    supportPhone?: string;
    address?: string;
    gstno?: string;
  };
  tenantDetails: {
    id: string | number;
    name: string;
    subdomain: string;
    adminEmail: string;
    phone?: string;
    address?: string;
    invoiceno?: string;
    amount?: number;
    gst?: number;
    gstamount?: number;
    paymentStatus?: string;
    paymentDate?: string;
  };
}

export function generateSubscriptionInvoicePDF(data: SubscriptionInvoiceData) {
  const comp = data.companySettings || {};
  const tenant = data.tenantDetails;

  const invoiceNo = tenant.invoiceno || `INV-${new Date().getFullYear()}${String(tenant.id).padStart(4, '0')}`;
  const rawDate = tenant.paymentDate ? new Date(tenant.paymentDate) : new Date();
  const formattedDate = rawDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const gstRate = tenant.gst ?? 18;
  const totalAmount = tenant.amount || 0;

  // Calculate base amount and GST breakdown
  let gstAmount = tenant.gstamount || 0;
  let baseAmount = totalAmount - gstAmount;
  if (baseAmount <= 0 && totalAmount > 0) {
    baseAmount = totalAmount / (1 + gstRate / 100);
    gstAmount = totalAmount - baseAmount;
  }

  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;

  const issuerName = comp.companyName || 'CapitalTrust';
  const issuerEmail = comp.supportEmail || 'support@capitaltrust.com';
  const issuerPhone = comp.supportPhone || '+91 62389 20219';
  const issuerAddress = comp.address || 'Corporate Office, Financial District';
  const issuerGst = comp.gstno || 'N/A';

  const customerName = tenant.name || 'Organization Client';
  const customerSubdomain = tenant.subdomain ? `${tenant.subdomain}.capitaltrust.com` : 'N/A';
  const customerEmail = tenant.adminEmail || 'N/A';
  const customerPhone = tenant.phone || 'N/A';
  const customerAddress = tenant.address || 'N/A';

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      // Header Section: Logo / Issuer Info (Left) & Invoice Title (Right)
      {
        columns: [
          [
            comp.companyLogo && comp.companyLogo.startsWith('data:image/')
              ? { image: comp.companyLogo, width: 130, margin: [0, 0, 0, 8] }
              : { text: issuerName, fontSize: 18, bold: true, color: '#1e1b4b', margin: [0, 0, 0, 4] },
            { text: issuerName, fontSize: 12, bold: true, color: '#0f172a' },
            { text: issuerAddress, fontSize: 9, color: '#475569', margin: [0, 2, 0, 0] },
            { text: `Email: ${issuerEmail}  |  WhatsApp: ${issuerPhone}`, fontSize: 9, color: '#475569', margin: [0, 2, 0, 0] },
            { text: `GSTIN: ${issuerGst}`, fontSize: 9, bold: true, color: '#4f46e5', margin: [0, 2, 0, 0] }
          ],
          [
            { text: 'TAX INVOICE', fontSize: 20, bold: true, alignment: 'right', color: '#4f46e5', margin: [0, 0, 0, 8] },
            {
              table: {
                widths: ['*', '*'],
                body: [
                  [{ text: 'Invoice No:', fontSize: 9, bold: true, color: '#475569' }, { text: invoiceNo, fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' }],
                  [{ text: 'Invoice Date:', fontSize: 9, bold: true, color: '#475569' }, { text: formattedDate, fontSize: 9, alignment: 'right', color: '#0f172a' }],
                  [{ text: 'Payment Status:', fontSize: 9, bold: true, color: '#475569' }, { text: 'PAID', fontSize: 9, bold: true, alignment: 'right', color: '#16a34a' }],
                  [{ text: 'Bill Type:', fontSize: 9, bold: true, color: '#475569' }, { text: 'Subscription', fontSize: 9, alignment: 'right', color: '#0f172a' }]
                ]
              },
              layout: 'noBorders'
            }
          ]
        ]
      },

      { canvas: [{ type: 'line', x1: 0, y1: 12, x2: 515, y2: 12, lineWidth: 1.5, lineColor: '#6366f1' }], margin: [0, 10, 0, 15] },

      // Billed To & Service Period Cards
      {
        columns: [
          [
            { text: 'BILLED TO (CUSTOMER)', fontSize: 10, bold: true, color: '#4f46e5', margin: [0, 0, 0, 4] },
            { text: customerName, fontSize: 11, bold: true, color: '#0f172a' },
            { text: `Subdomain: ${customerSubdomain}`, fontSize: 9, color: '#475569' },
            { text: `Email: ${customerEmail}`, fontSize: 9, color: '#475569' },
            { text: `Phone: ${customerPhone}`, fontSize: 9, color: '#475569' },
            { text: `Address: ${customerAddress}`, fontSize: 9, color: '#475569' }
          ],
          [
            { text: 'SERVICE DETAILS', fontSize: 10, bold: true, color: '#4f46e5', margin: [0, 0, 0, 4] },
            { text: 'Workspace License & Setup', fontSize: 10, bold: true, color: '#0f172a' },
            { text: 'Validity: 1 Year Unrestricted License', fontSize: 9, color: '#475569' },
            { text: 'Place of Supply: India', fontSize: 9, color: '#475569' }
          ]
        ],
        margin: [0, 0, 0, 20]
      },

      // Item Table Header & Rows
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 70, 45, 65, 75],
          body: [
            [
              { text: '#', style: 'tableHeader', alignment: 'center' },
              { text: 'Item & Description', style: 'tableHeader' },
              { text: 'Base Rate (₹)', style: 'tableHeader', alignment: 'right' },
              { text: 'GST %', style: 'tableHeader', alignment: 'center' },
              { text: 'GST Amount', style: 'tableHeader', alignment: 'right' },
              { text: 'Total (₹)', style: 'tableHeader', alignment: 'right' }
            ],
            [
              { text: '1', alignment: 'center', fontSize: 9, margin: [0, 6, 0, 6] },
              {
                stack: [
                  { text: 'Organization Workspace Setup & Platform License', fontSize: 9, bold: true, color: '#0f172a' },
                  { text: 'Multi-tenant cloud infrastructure initialization & administrator account deployment', fontSize: 8, color: '#64748b' }
                ],
                margin: [0, 6, 0, 6]
              },
              { text: `₹${baseAmount.toFixed(2)}`, alignment: 'right', fontSize: 9, margin: [0, 6, 0, 6] },
              { text: `${gstRate}%`, alignment: 'center', fontSize: 9, margin: [0, 6, 0, 6] },
              { text: `₹${gstAmount.toFixed(2)}`, alignment: 'right', fontSize: 9, margin: [0, 6, 0, 6] },
              { text: `₹${totalAmount.toFixed(2)}`, alignment: 'right', fontSize: 9, bold: true, margin: [0, 6, 0, 6] }
            ]
          ]
        },
        layout: {
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 1.5 : 0.5;
          },
          vLineWidth: function () { return 0; },
          hLineColor: function (i: number, node: any) {
            return i === 0 || i === node.table.body.length ? '#4f46e5' : '#e2e8f0';
          },
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#1e1b4b' : (rowIndex % 2 === 0 ? '#f8fafc' : null);
          }
        },
        margin: [0, 0, 0, 15]
      },

      // Summary Breakdown Table (Right Aligned)
      {
        columns: [
          { text: '', width: '*' },
          {
            width: 230,
            table: {
              widths: ['*', 90],
              body: [
                [{ text: 'Subtotal (Base Price):', fontSize: 9, color: '#475569' }, { text: `₹${baseAmount.toFixed(2)}`, fontSize: 9, alignment: 'right', bold: true }],
                [{ text: `CGST (${cgstRate}%):`, fontSize: 9, color: '#475569' }, { text: `₹${cgstAmount.toFixed(2)}`, fontSize: 9, alignment: 'right' }],
                [{ text: `SGST (${sgstRate}%):`, fontSize: 9, color: '#475569' }, { text: `₹${sgstAmount.toFixed(2)}`, fontSize: 9, alignment: 'right' }],
                [{ text: 'Total Tax Amount:', fontSize: 9, color: '#475569' }, { text: `₹${gstAmount.toFixed(2)}`, fontSize: 9, alignment: 'right', bold: true }],
                [
                  { text: 'Grand Total Paid:', fontSize: 10, bold: true, color: '#4f46e5' },
                  { text: `₹${totalAmount.toFixed(2)}`, fontSize: 11, bold: true, alignment: 'right', color: '#4f46e5' }
                ]
              ]
            },
            layout: 'noBorders'
          }
        ],
        margin: [0, 0, 0, 25]
      },

      // Signature & Footer Declaration
      {
        columns: [
          [
            { text: 'TERMS & CONDITIONS', fontSize: 9, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
            { text: '1. All payments are verified and recorded upon completion.', fontSize: 8, color: '#64748b' },
            { text: '2. This license includes 1 year platform maintenance & operational support.', fontSize: 8, color: '#64748b' },
            { text: '3. This subscription automatically updates when the next AMC is paid.', fontSize: 8, color: '#64748b' },
            { text: '4. This is an electronically generated Tax Invoice under GST laws.', fontSize: 8, color: '#64748b' }
          ],
          [
            { text: `For ${issuerName}`, fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' },
            { text: 'Authorized Signatory', fontSize: 8, alignment: 'right', color: '#64748b', margin: [0, 30, 0, 0] }
          ]
        ]
      }
    ],
    styles: {
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: '#ffffff',
        margin: [0, 4, 0, 4]
      }
    }
  };

  const fileName = `${invoiceNo}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}
