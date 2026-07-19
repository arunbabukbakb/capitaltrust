/**
 * Persistent notification store backed by IndexedDB and synchronized
 * across tabs using BroadcastChannel.
 *
 * Allows background Service Worker pushes to persist history even when
 * the portal is completely closed or inactive.
 */

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  url?: string;
}

type Listener = (notifications: AppNotification[]) => void;

const DB_NAME = 'ct_notifications_db';
const STORE_NAME = 'notifications';
const MAX_ITEMS = 50;

// ── IndexedDB Helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

async function loadFromDB(): Promise<AppNotification[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        const mapped: AppNotification[] = results.map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          timestamp: new Date(n.timestamp),
          read: n.read,
          url: n.url
        }));
        // Sort descending: newest first
        mapped.sort((a, b) => b.id - a.id);
        resolve(mapped.slice(0, MAX_ITEMS));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load from IndexedDB', err);
    return [];
  }
}

// ── Store State ────────────────────────────────────────────────────────────

let notifications: AppNotification[] = [];
const listeners = new Set<Listener>();

// Open synchronization channel
let bc: BroadcastChannel | null = null;
try {
  bc = new BroadcastChannel('ct_notifications_channel');
  bc.onmessage = (event) => {
    if (event.data?.type === 'SYNC_NOTIFICATIONS') {
      refresh();
    }
  };
} catch (e) {
  // BroadcastChannel not supported in this browser
}

function notify() {
  const snapshot = [...notifications];
  listeners.forEach(fn => fn(snapshot));
}

function broadcastSync() {
  if (bc) {
    bc.postMessage({ type: 'SYNC_NOTIFICATIONS' });
  }
}

async function refresh() {
  notifications = await loadFromDB();
  notify();
}

// Initial load
refresh();

export const notificationStore = {
  /** Push a new notification to IndexedDB, sync, and notify. */
  async add(title: string, body: string, url?: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.add({
          title,
          body,
          url,
          timestamp: new Date().toISOString(),
          read: false
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      await refresh();
      broadcastSync();
    } catch (err) {
      console.error('Error adding to notification store:', err);
    }
  },

  /** Mark a single notification as read in IndexedDB. */
  async markRead(id: number): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const val = getReq.result;
          if (val) {
            val.read = true;
            store.put(val);
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      await refresh();
      broadcastSync();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },

  /** Mark all notifications as read in IndexedDB. */
  async markAllRead(): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            const data = cursor.value;
            data.read = true;
            cursor.update(data);
            cursor.continue();
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      await refresh();
      broadcastSync();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  },

  /** Remove a single notification by id. */
  async remove(id: number): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      await refresh();
      broadcastSync();
    } catch (err) {
      console.error('Error removing notification:', err);
    }
  },

  /** Clear all notifications from IndexedDB. */
  async clear(): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      await refresh();
      broadcastSync();
    } catch (err) {
      console.error('Error clearing notification store:', err);
    }
  },

  /** Subscribe to store changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener([...notifications]); // fire immediately with current state
    return () => {
      listeners.delete(listener);
    };
  }
};
