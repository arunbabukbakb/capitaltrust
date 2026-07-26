let ImapFlow: any = null;
let simpleParser: any = null;

try {
  ImapFlow = require('imapflow').ImapFlow;
} catch (err) {
  console.warn('[IMAP Reader Warning] "imapflow" package is missing in server node_modules. Please run "npm install imapflow mailparser" on server.');
}

try {
  simpleParser = require('mailparser').simpleParser;
} catch (err) {
  console.warn('[IMAP Reader Warning] "mailparser" package is missing in server node_modules.');
}

import { getActiveSmtpConfig } from './mailer';

export interface InboxMessage {
  id: string;
  seq: number;
  uid: number;
  fromName: string;
  fromEmail: string;
  replyToName: string;
  replyToEmail: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody: string;
  seen: boolean;
}

export async function fetchLiveIncomingEmails(limit: number = 40): Promise<{
  success: boolean;
  mailbox?: string;
  messages?: InboxMessage[];
  error?: string;
}> {
  if (!ImapFlow || !simpleParser) {
    return {
      success: false,
      error: 'IMAP packages (imapflow/mailparser) are not installed on the server. Run "npm install imapflow mailparser" on server.'
    };
  }
  try {
    const smtp = await getActiveSmtpConfig();
    if (!smtp) {
      return { success: false, error: 'No active Mail Server Configuration found in database.' };
    }

    const host = (smtp as any).imapServer || smtp.server;
    const port = Number((smtp as any).imapPort) || 993;
    const auth = {
      user: smtp.username,
      pass: smtp.password || '',
    };

    if (!host || !auth.user) {
      return { success: false, error: 'Incomplete IMAP mail server host or credentials.' };
    }

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth,
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    // Open INBOX
    const lock = await client.getMailboxLock('INBOX');
    const messagesList: InboxMessage[] = [];

    try {
      const status = client.mailbox;
      const totalMessages = (status && typeof status === 'object' && 'exists' in status) ? Number(status.exists) : 0;

      if (totalMessages > 0) {
        // Fetch last N messages
        const fetchRange = `${Math.max(1, totalMessages - limit + 1)}:*`;

        for await (const message of client.fetch(fetchRange, {
          envelope: true,
          flags: true,
          source: true,
        })) {
          try {
            if (!message.source) continue;
            const parsed: any = await (simpleParser as any)(message.source);
            const fromObj = parsed.from?.value?.[0];
            const replyToObj = parsed.replyTo?.value?.[0];

            let bodySenderEmail = '';
            let bodySenderName = '';

            const textContent = parsed.text || '';
            const emailMatch = textContent.match(/(?:Sender Email|Sender|Email Address|Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
            if (emailMatch && emailMatch[1]) {
              bodySenderEmail = emailMatch[1].trim();
            }
            const nameMatch = textContent.match(/(?:Sender Name|Name):\s*([^\n\r<]+)/i);
            if (nameMatch && nameMatch[1]) {
              bodySenderName = nameMatch[1].trim();
            }

            const replyToEmail = bodySenderEmail || replyToObj?.address || fromObj?.address || message.envelope?.from?.[0]?.address || 'unknown@domain.com';
            const replyToName = bodySenderName || replyToObj?.name || fromObj?.name || message.envelope?.from?.[0]?.name || replyToEmail;

            messagesList.push({
              id: String(message.uid),
              seq: message.seq,
              uid: message.uid,
              fromName: fromObj?.name || message.envelope?.from?.[0]?.name || fromObj?.address || 'Unknown Sender',
              fromEmail: fromObj?.address || message.envelope?.from?.[0]?.address || 'unknown@domain.com',
              replyToName,
              replyToEmail,
              subject: parsed.subject || message.envelope?.subject || '(No Subject)',
              date: message.envelope?.date ? new Date(message.envelope.date).toISOString() : new Date().toISOString(),
              textBody: parsed.text || '',
              htmlBody: (parsed.html as string) || (parsed.textAsHtml as string) || '',
              seen: message.flags?.has('\\Seen') || false,
            });
          } catch (pErr) {
            console.error('Error parsing single message stream:', pErr);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // Sort newest first
    messagesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      mailbox: auth.user,
      messages: messagesList,
    };
  } catch (error: any) {
    console.error('IMAP Reader error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to IMAP mail server.',
    };
  }
}

export async function deleteLiveInboxMessage(uid: number): Promise<{ success: boolean; error?: string }> {
  try {
    const smtp = await getActiveSmtpConfig();
    if (!smtp) {
      return { success: false, error: 'No active Mail Server Configuration found.' };
    }

    const host = (smtp as any).imapServer || smtp.server;
    const port = Number((smtp as any).imapPort) || 993;
    const auth = {
      user: smtp.username,
      pass: smtp.password || '',
    };

    if (!host || !auth.user) {
      return { success: false, error: 'Incomplete IMAP mail server credentials.' };
    }

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth,
      logger: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }

    await client.logout();
    return { success: true };
  } catch (error: any) {
    console.error('deleteLiveInboxMessage error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete message from IMAP mailbox.',
    };
  }
}
