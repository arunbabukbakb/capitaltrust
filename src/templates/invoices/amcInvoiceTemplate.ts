import pdfMake from './pdfMakeConfig';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

export interface AmcInvoiceData {
  companySettings?: {
    companyName?: string;
    companyLogo?: string;
    supportEmail?: string;
    supportPhone?: string;
    address?: string;
    gstno?: string;
  };
  tenantDetails?: {
    name?: string;
    subdomain?: string;
    adminEmail?: string;
    phone?: string;
    address?: string;
  };
  amcRecord: {
    id: number | string;
    amcCharge: number;
    dueDate: string;
    paidDate?: string;
    paidStatus: string;
    invoiceno?: string;
    gst?: number;
    gstamount?: number;
  };
}

export function generateAmcInvoicePDF(data: AmcInvoiceData) {
  const comp = data.companySettings || {};
  const tenant = data.tenantDetails || {};
  const amc = data.amcRecord;

  const invoiceNo = amc.invoiceno || `AMC-INV-${new Date().getFullYear()}${String(amc.id).padStart(4, '0')}`;
  const rawDate = amc.paidDate ? new Date(amc.paidDate) : (amc.dueDate ? new Date(amc.dueDate) : new Date());
  const formattedDate = rawDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const gstRate = amc.gst ?? 18;
  const baseAmount = Number(amc.amcCharge) || 0;
  const gstAmount = amc.gstamount !== undefined && amc.gstamount !== null ? Number(amc.gstamount) : (baseAmount * (gstRate / 100));
  const totalAmount = baseAmount + gstAmount;

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
            { text: `GSTIN: ${issuerGst}`, fontSize: 9, bold: true, color: '#0284c7', margin: [0, 2, 0, 0] }
          ],
          [
            { text: 'TAX INVOICE', fontSize: 20, bold: true, alignment: 'right', color: '#0284c7', margin: [0, 0, 0, 8] },
            {
              table: {
                widths: ['*', '*'],
                body: [
                  [{ text: 'Invoice No:', fontSize: 9, bold: true, color: '#475569' }, { text: invoiceNo, fontSize: 9, bold: true, alignment: 'right', color: '#0f172a' }],
                  [{ text: 'Paid Date:', fontSize: 9, bold: true, color: '#475569' }, { text: formattedDate, fontSize: 9, alignment: 'right', color: '#0f172a' }],
                  [{ text: 'Payment Status:', fontSize: 9, bold: true, color: '#475569' }, { text: amc.paidStatus.toUpperCase(), fontSize: 9, bold: true, alignment: 'right', color: '#16a34a' }],
                  [{ text: 'Bill Type:', fontSize: 9, bold: true, color: '#475569' }, { text: 'AMC Renewal', fontSize: 9, alignment: 'right', color: '#0f172a' }]
                ]
              },
              layout: 'noBorders'
            }
          ]
        ]
      },

      { canvas: [{ type: 'line', x1: 0, y1: 12, x2: 515, y2: 12, lineWidth: 1.5, lineColor: '#0284c7' }], margin: [0, 10, 0, 15] },

      // Billed To & Service Period Cards
      {
        columns: [
          [
            { text: 'BILLED TO (CUSTOMER)', fontSize: 10, bold: true, color: '#0284c7', margin: [0, 0, 0, 4] },
            { text: customerName, fontSize: 11, bold: true, color: '#0f172a' },
            { text: `Subdomain: ${customerSubdomain}`, fontSize: 9, color: '#475569' },
            { text: `Email: ${customerEmail}`, fontSize: 9, color: '#475569' },
            { text: `Phone: ${customerPhone}`, fontSize: 9, color: '#475569' },
            { text: `Address: ${customerAddress}`, fontSize: 9, color: '#475569' }
          ],
          [
            { text: 'SERVICE DETAILS', fontSize: 10, bold: true, color: '#0284c7', margin: [0, 0, 0, 4] },
            { text: 'Annual Maintenance Contract (AMC)', fontSize: 10, bold: true, color: '#0f172a' },
            { text: 'Period: Annual Maintenance Renewal', fontSize: 9, color: '#475569' },
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
                  { text: 'Annual Maintenance Contract (AMC) & Technical Support', fontSize: 9, bold: true, color: '#0f172a' },
                  { text: '12-Month recurring system updates, security patches, & cloud maintenance fee', fontSize: 8, color: '#64748b' }
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
            return i === 0 || i === node.table.body.length ? '#0284c7' : '#e2e8f0';
          },
          fillColor: function (rowIndex: number) {
            return rowIndex === 0 ? '#0c4a6e' : (rowIndex % 2 === 0 ? '#f0f9ff' : null);
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
                  { text: 'Grand Total Paid:', fontSize: 10, bold: true, color: '#0284c7' },
                  { text: `₹${totalAmount.toFixed(2)}`, fontSize: 11, bold: true, alignment: 'right', color: '#0284c7' }
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
            { text: '1. AMC renewal extends cloud platform updates & maintenance for 1 year.', fontSize: 8, color: '#64748b' },
            { text: '2. This subscription automatically updates when the next AMC is paid.', fontSize: 8, color: '#64748b' },
            { text: '3. This is a computer generated tax invoice issued under GST laws.', fontSize: 8, color: '#64748b' }
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
