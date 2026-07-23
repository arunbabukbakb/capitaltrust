import nodemailer from 'nodemailer';
import { getDatabase } from '../database';

interface SmtpConfig {
  id: number;
  server: string;
  username: string;
  port: number;
  encryption: string;
  password?: string;
  status: string;
}

/**
 * Retrieves the currently active SMTP configuration from database.
 */
export async function getActiveSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const db = getDatabase();
    const config = await db.get("SELECT * FROM smtp_settings WHERE status = 'Active' LIMIT 1");
    if (!config) {
      // Fallback: get latest setting if none marked Active
      const fallback = await db.get("SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1");
      return fallback || null;
    }
    return config;
  } catch (error) {
    console.error('Error fetching active SMTP settings:', error);
    return null;
  }
}

/**
 * Creates a nodemailer Transporter using active SMTP settings.
 */
export async function createActiveTransporter() {
  const smtp = await getActiveSmtpConfig();
  if (!smtp || !smtp.server || !smtp.username) {
    throw new Error('No active SMTP mail configuration found in database.');
  }

  const isSsl = Number(smtp.port) === 465;

  const transporter = nodemailer.createTransport({
    host: smtp.server,
    port: Number(smtp.port) || 587,
    secure: isSsl,
    auth: {
      user: smtp.username,
      pass: smtp.password || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return { transporter, fromAddress: smtp.username };
}

/**
 * TEMPLATE 1: Send Registration Subscription Payment Confirmation Email
 */
export async function sendRegistrationPaymentEmail(data: {
  to: string;
  tenantName: string;
  subdomain: string;
  amount: number;
  paidDate: string;
  loginUrl: string;
}) {
  try {
    const { transporter, fromAddress } = await createActiveTransporter();

    const subject = `🎉 Registration Payment Confirmed - Welcome to ${data.tenantName}!`;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #1e293b;">
          <h2 style="color: #6366f1; margin: 0; font-size: 22px;">CapitalTrust Platform</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Organization Workspace Payment Receipt</p>
        </div>

        <div style="padding: 20px 0;">
          <h3 style="color: #ffffff; font-size: 18px;">Hello, ${data.tenantName} Admin!</h3>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            We have successfully received and verified your registration subscription payment. Your organization workspace is now fully activated.
          </p>

          <div style="background-color: #111827; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
            <table style="width: 100%; color: #cbd5e1;">
              <tr>
                <td style="padding: 4px 0; color: #94a3b8;">Organization:</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">${data.tenantName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #94a3b8;">Subdomain URL:</td>
                <td style="font-weight: bold; color: #818cf8; text-align: right;">${data.subdomain}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #94a3b8;">Amount Paid:</td>
                <td style="font-weight: bold; color: #34d399; text-align: right;">₹${(Number(data.amount) || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #94a3b8;">Payment Date:</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">${data.paidDate}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${data.loginUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Access Workspace Portal &rarr;
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          &copy; ${new Date().getFullYear()} CapitalTrust Portal Services. All rights reserved.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"CapitalTrust Admin" <${fromAddress}>`,
      to: data.to,
      subject,
      html
    });

    console.log(`Registration Email sent to ${data.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending Registration payment email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEMPLATE 2: Send AMC Renewal Subscription Payment Confirmation Email
 */
export async function sendAmcPaymentEmail(data: {
  to: string;
  tenantName: string;
  subdomain: string;
  amcCharge: number;
  gstPercent?: number;
  gstAmount?: number;
  invoiceNo?: string;
  paidDate: string;
  nextDueDate: string;
}) {
  try {
    const { transporter, fromAddress } = await createActiveTransporter();

    const baseCharge = Number(data.amcCharge) || 0;
    const gstRate = data.gstPercent ?? 18;
    const gstAmt = data.gstAmount !== undefined && data.gstAmount !== null ? Number(data.gstAmount) : (baseCharge * (gstRate / 100));
    const totalAmount = baseCharge + gstAmt;
    const invoiceNo = data.invoiceNo || 'N/A';

    const subject = `💳 AMC Subscription Payment Receipt - ${data.tenantName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
          <h2 style="color: #6366f1; margin: 0; font-size: 22px;">CapitalTrust Services</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Annual Maintenance Charge (AMC) Tax Receipt</p>
        </div>

        <div style="padding: 20px 0;">
          <h3 style="color: #ffffff; font-size: 18px;">Thank You, ${data.tenantName}!</h3>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            Your Annual Maintenance Charge (AMC) subscription payment has been successfully recorded. Your workspace service and priority technical support remain fully active.
          </p>

          <div style="background-color: #111827; border: 1px solid #334155; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
            <table style="width: 100%; color: #cbd5e1;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Organization:</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">${data.tenantName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Invoice Number:</td>
                <td style="font-weight: bold; color: #818cf8; text-align: right;">${invoiceNo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Base AMC Charge:</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">₹${baseCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">GST (${gstRate}%):</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">₹${gstAmt.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px dashed #334155;">
                <td style="padding: 8px 0; color: #ffffff; font-weight: bold;">Total Amount Paid:</td>
                <td style="font-weight: bold; color: #34d399; font-size: 15px; text-align: right;">₹${totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Paid Date:</td>
                <td style="font-weight: bold; color: #ffffff; text-align: right;">${data.paidDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8;">Next Annual Due Date:</td>
                <td style="font-weight: bold; color: #818cf8; text-align: right;">${data.nextDueDate}</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          &copy; ${new Date().getFullYear()} CapitalTrust Management Console. This email serves as an official tax receipt.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"CapitalTrust Support" <${fromAddress}>`,
      to: data.to,
      subject,
      html
    });

    console.log(`AMC Email sent to ${data.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending AMC payment email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEMPLATE 3: Send General Broadcast Message to Tenant
 */
export async function sendTenantBroadcastMessageEmail(data: {
  to: string;
  tenantName: string;
  subject: string;
  messageBody: string;
}) {
  try {
    const { transporter, fromAddress } = await createActiveTransporter();

    // Convert newlines in message body to HTML breaks if text
    const formattedMessage = data.messageBody.includes('<p>') || data.messageBody.includes('<br')
      ? data.messageBody
      : data.messageBody.replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; padding-bottom: 16px; border-b: 1px solid #1e293b;">
          <h2 style="color: #6366f1; margin: 0; font-size: 20px;">CapitalTrust System Notice</h2>
        </div>

        <div style="padding: 20px 0;">
          <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 12px;">Dear ${data.tenantName} Team,</h3>
          <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6; background-color: #111827; padding: 16px; border-radius: 8px; border: 1px solid #1e293b;">
            ${formattedMessage}
          </div>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          This message was sent from CapitalTrust SuperAdmin Console.<br/>
          &copy; ${new Date().getFullYear()} CapitalTrust Platform.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"CapitalTrust Admin" <${fromAddress}>`,
      to: data.to,
      subject: data.subject,
      html
    });

    console.log(`Broadcast Email sent to ${data.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`Error sending message to ${data.to}:`, error);
    return { success: false, error: error.message };
  }
}
