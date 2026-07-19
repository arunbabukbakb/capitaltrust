// Firebase Cloud Messaging Background Service Worker
// This file MUST be served at the root: /firebase-messaging-sw.js
// It handles background push notifications when the app is not in focus.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyBVe3FsHhiA5h1afMPF50tjiHOCb-UcZNw",
  authDomain: "capitaltrust-e12e1.firebaseapp.com",
  projectId: "capitaltrust-e12e1",
  storageBucket: "capitaltrust-e12e1.firebasestorage.app",
  messagingSenderId: "236227412936",
  appId: "1:236227412936:web:c8158479bbc9e7af81f6fd",
  measurementId: "G-3T25ET7V9E"
});

const messaging = firebase.messaging();

// Helper to save background push notification to IndexedDB
function saveNotificationToIndexedDB(title, body, url) {
  return new Promise((resolve) => {
    // Open ct_notifications_db (version 1)
    const request = indexedDB.open('ct_notifications_db', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      try {
        const transaction = db.transaction('notifications', 'readwrite');
        const store = transaction.objectStore('notifications');
        store.add({
          title,
          body,
          url,
          timestamp: new Date().toISOString(),
          read: false
        });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      } catch (e) {
        console.error('IndexedDB transaction failed:', e);
        db.close();
        resolve();
      }
    };

    request.onerror = () => {
      resolve();
    };
  });
}

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'CapitalTrust Notification';
  const notificationBody = payload.notification?.body || '';
  const notificationUrl = payload.data?.url || '';

  // Save to IndexedDB database shared with application tabs
  saveNotificationToIndexedDB(notificationTitle, notificationBody, notificationUrl).then(() => {
    // Notify any active tabs to sync up their notification stores in real time
    try {
      const bc = new BroadcastChannel('ct_notifications_channel');
      bc.postMessage({ type: 'SYNC_NOTIFICATIONS' });
      bc.close();
    } catch (e) {
      // Ignore if BroadcastChannel is unsupported
    }
  });

  const notificationOptions = {
    body: notificationBody,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'capitaltrust-notification',
    renotify: true,
    data: payload.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
