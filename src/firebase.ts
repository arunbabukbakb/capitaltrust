/// <reference types="vite/client" />
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { dispatchInAppNotification } from './components/NotificationToast';

const firebaseConfig = {
  apiKey: "AIzaSyBVe3FsHhiA5h1afMPF50tjiHOCb-UcZNw",
  authDomain: "capitaltrust-e12e1.firebaseapp.com",
  projectId: "capitaltrust-e12e1",
  storageBucket: "capitaltrust-e12e1.firebasestorage.app",
  messagingSenderId: "236227412936",
  appId: "1:236227412936:web:c8158479bbc9e7af81f6fd",
  measurementId: "G-3T25ET7V9E"
};

// Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

// Messaging is only supported in browsers (not SSR)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging init failed (may be unsupported in this browser):', err);
  }
}

/**
 * Request notification permission, retrieve FCM token, and register it with the server.
 * Call this after the user logs in.
 */
export async function initializePushNotifications(): Promise<void> {
  if (!messaging) {
    console.warn('[FCM] Firebase Messaging not available in this environment.');
    return;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied by user.');
      return;
    }

    console.log('[FCM] Notification permission granted. Retrieving FCM token...');

    // Register the firebase-messaging-sw.js service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    // VAPID key for Web Push — generate this from Firebase Console > Project Settings > Cloud Messaging > Web configuration
    // Replace with your actual VAPID key. This is required for web push token generation.
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token retrieved successfully:', token.substring(0, 20) + '...');
      // Register token with the server
      await registerTokenWithServer(token);
    } else {
      console.warn('[FCM] No registration token available. Push notifications may not work.');
    }
  } catch (error) {
    console.error('[FCM] Error initializing push notifications:', error);
  }
}

/**
 * Send FCM token to the backend for storage and later push notification delivery.
 */
async function registerTokenWithServer(token: string): Promise<void> {
  try {
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[FCM] Token registration failed on server:', err);
    } else {
      console.log('[FCM] Token registered successfully with server.');
    }
  } catch (err) {
    console.error('[FCM] Network error registering token with server:', err);
  }
}

/**
 * Register a handler for foreground messages (when app is open/active).
 *
 * Two things happen when a message arrives:
 *  1. dispatchInAppNotification() fires the custom DOM event that the
 *     NotificationToast component listens to → shows an in-app banner.
 *  2. The active Service Worker's showNotification() is used to show a
 *     system OS notification (new Notification() is blocked inside browser
 *     tabs in Chrome; SW registration.showNotification() is not).
 */
export function registerForegroundMessageHandler(): void {
  if (!messaging) return;

  onMessage(messaging, async (payload) => {
    console.log('[FCM] Foreground message received:', payload);

    const title = payload.notification?.title || 'CapitalTrust';
    const body = payload.notification?.body || '';
    const url = payload.data?.url;

    // 1. Drive the in-app toast banner
    dispatchInAppNotification(title, body, url);

    // 2. Also show a system notification via the Service Worker
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'capitaltrust-foreground',
        });
      } catch (err) {
        console.warn('[FCM] SW showNotification failed:', err);
      }
    }
  });
}

/**
 * Request notification permission, retrieve FCM token, and register it specifically in superadmins table.
 * Call this when SuperAdmin opens the dashboard or logs in.
 */
export async function initializeSuperAdminPushNotifications(): Promise<void> {
  if (typeof window === 'undefined') return;

  const jwtToken = localStorage.getItem('token');
  if (!jwtToken) return;

  try {
    let token = localStorage.getItem('fcm_token');

    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && messaging) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
          const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
          if (fcmToken) {
            token = fcmToken;
            localStorage.setItem('fcm_token', fcmToken);
          }
        } catch (swErr) {
          console.warn('[FCM] SW Token fetch warning:', swErr);
        }
      }
    }

    if (!token) {
      token = 'fcm_superadmin_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('fcm_token', token);
    }

    console.log('[FCM SuperAdmin] Registering token with /api/super-admin/push-token...', token.substring(0, 20) + '...');

    const res = await fetch('/api/super-admin/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ pushToken: token })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('[FCM SuperAdmin] Push token successfully registered in superadmins table:', data.message);
    } else {
      console.warn('[FCM SuperAdmin] Push token registration failed:', data.error);
    }
  } catch (err) {
    console.error('[FCM SuperAdmin] Error initializing SuperAdmin push notification token:', err);
  }
}

export { messaging };
