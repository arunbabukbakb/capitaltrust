import { initializeApp as adminInitializeApp, getApps as adminGetApps } from 'firebase-admin/app';
import { getMessaging as adminGetMessaging } from 'firebase-admin/messaging';
import { cert } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';
import { getDatabase } from './database';

let isFirebaseInitialized = false;

try {
  const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (serviceAccount.private_key && serviceAccount.private_key !== 'YOUR_PRIVATE_KEY') {
      if (adminGetApps().length === 0) {
        adminInitializeApp({
          credential: cert(serviceAccount)
        });
      }
      isFirebaseInitialized = true;
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('Firebase Push Notifications: firebase-service-account.json has placeholder credentials. Running in MOCK mode.');
    }
  } else {
    console.warn('Firebase Push Notifications: firebase-service-account.json does not exist. Running in MOCK mode.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK. Running in MOCK mode.', error);
}

export async function sendPushNotification(userIds: string[], title: string, body: string, url?: string): Promise<void> {
  if (userIds.length === 0) return;

  const db = getDatabase();

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db.all<{ token: string; userId: string }[]>(
      `SELECT token, userId FROM user_push_tokens WHERE userId IN (${placeholders})`,
      userIds
    );

    if (!rows || rows.length === 0) {
      console.log(`[Push Notification] No registered push tokens found for users: ${userIds.join(', ')}`);
      return;
    }

    console.log(`[Push Notification] Attempting to send push to ${rows.length} devices for users: ${userIds.join(', ')}`);

    const messaging = isFirebaseInitialized ? adminGetMessaging() : null;

    for (const row of rows) {
      if (messaging) {
        try {
          const payload: any = {
            token: row.token,
            notification: { title, body },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                icon: '/favicon.png',
                badge: '/favicon.png'
              }
            }
          };

          if (url) {
            payload.data = { url };
          }

          await messaging.send(payload);
          console.log(`[Push Notification] Success sending token for user ${row.userId}`);
        } catch (fcmError: any) {
          console.error(`[Push Notification] FCM sending failed for user ${row.userId}:`, fcmError?.message || fcmError);
          if (
            fcmError?.code === 'messaging/invalid-argument' ||
            fcmError?.code === 'messaging/registration-token-not-registered' ||
            fcmError?.message?.includes('not registered')
          ) {
            console.log(`[Push Notification] Removing stale token for user ${row.userId}`);
            await db.run(
              'DELETE FROM user_push_tokens WHERE userId = ? AND token = ?',
              [row.userId, row.token]
            ).catch(err => console.error('Error deleting stale token', err));
          }
        }
      } else {
        console.log(`[MOCK PUSH] User: ${row.userId} | Token: ${row.token.substring(0, 15)}... | Title: "${title}" | Body: "${body}" | URL: "${url || ''}"`);
      }
    }
  } catch (error) {
    console.error('Error in sendPushNotification process:', error);
  }
}
