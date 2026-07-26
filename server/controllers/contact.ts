import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { sendContactEnquiryEmail } from '../utils/mailer';
import { sendDirectPushToTokens } from '../firebaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

export const handleContactFormSubmission = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    let tokenEmail = '';

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        tokenEmail = payload.email || payload.username || '';
      } catch (err) {
        // Ignored
      }
    }

    const { name, senderEmail, subject, message, domain } = req.body;

    if (!name || !subject || !message) {
      return res.status(400).json({ error: 'Name, Subject, and Message are required fields.' });
    }

    const db = getDatabase();
    // Retrieve company support email address from database
    const settings = await db.get("SELECT supportEmail FROM company_settings LIMIT 1");
    const toCompanyEmail = settings?.supportEmail || 'contact@trustcaps.in';

    // Dispatch email to company support
    const emailResult = await sendContactEnquiryEmail({
      name,
      senderEmail: senderEmail || tokenEmail,
      subject,
      message,
      domain: domain || req.headers.host || 'trustcaps.in',
      toCompanyEmail,
    });

    if (!emailResult.success) {
      return res.status(500).json({
        error: emailResult.error || 'Failed to dispatch email to company support.'
      });
    }

    // Notify SuperAdmin ONLY via Push Notification using superadmins pushToken
    try {
      const tokens: string[] = [];

      // 1. Fetch pushToken stored directly in superadmins table
      const superAdminRows = await db.all<{ pushToken: string }[]>(
        "SELECT pushToken FROM superadmins WHERE pushToken IS NOT NULL AND pushToken != ''"
      );
      if (superAdminRows && superAdminRows.length > 0) {
        superAdminRows.forEach(r => {
          if (r.pushToken && !tokens.includes(r.pushToken)) {
            tokens.push(r.pushToken);
          }
        });
      }

      // 2. Also fetch tokens from user_push_tokens for superadmin role users
      const userPushRows = await db.all<{ token: string }[]>(
        "SELECT upt.token FROM user_push_tokens upt JOIN users u ON u.id = upt.userId WHERE u.role = 'superadmin' OR u.username = 'superadmin'"
      );
      if (userPushRows && userPushRows.length > 0) {
        userPushRows.forEach(r => {
          if (r.token && !tokens.includes(r.token)) {
            tokens.push(r.token);
          }
        });
      }

      if (tokens.length > 0) {
        await sendDirectPushToTokens(
          tokens,
          `🚨 New Support Email Received: ${name}`,
          `Subject: ${subject} (${domain || 'Platform'})`,
          '/admin/support-inbox'
        );
      } else {
        console.log(`[Push Notification] No SuperAdmin push tokens found in superadmins table.`);
      }
    } catch (notifErr) {
      console.error('SuperAdmin push notification dispatch error:', notifErr);
    }

    return res.json({
      success: true,
      message: 'Your enquiry / suggestion has been sent successfully to company support!'
    });
  } catch (error: any) {
    console.error('Contact submission error:', error);
    return res.status(500).json({ error: 'Server error processing contact message.' });
  }
};
