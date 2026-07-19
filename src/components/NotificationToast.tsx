import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationStore, AppNotification } from '../notificationStore';

/**
 * Fires the custom DOM event that feeds both the live toast banner
 * and the notification store (for the header panel history).
 * Call this from the Firebase onMessage handler.
 */
export function dispatchInAppNotification(title: string, body: string, url?: string): void {
  // Persist to the shared store (drives the header popup list)
  notificationStore.add(title, body, url);

  // Also fire the DOM event so the live banner appears
  window.dispatchEvent(
    new CustomEvent<{ title: string; body: string; url?: string }>('fcm-foreground-message', {
      detail: { title, body, url }
    })
  );
}

interface ToastItem {
  id: number;
  title: string;
  body: string;
}

let toastId = 0;

/**
 * Renders stacked slide-in toast banners in the top-right corner
 * when a foreground FCM message arrives.
 * Mount this once inside MainLayout.
 */
export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, body } = (e as CustomEvent<{ title: string; body: string }>).detail;
      const id = ++toastId;
      setToasts(prev => [...prev, { id, title, body }]);
      setTimeout(() => dismiss(id), 6000);
    };

    window.addEventListener('fcm-foreground-message', handler);
    return () => window.removeEventListener('fcm-foreground-message', handler);
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-16 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      style={{ maxWidth: 360 }}
    >
      {toasts.map(toast => (
        <div key={toast.id} className="notification-toast pointer-events-auto">
          <div className="notification-toast__icon">
            <Bell size={16} />
          </div>
          <div className="notification-toast__content">
            <p className="notification-toast__title">{toast.title}</p>
            {toast.body && (
              <p className="notification-toast__body">{toast.body}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="notification-toast__close"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
          <div className="notification-toast__progress" />
        </div>
      ))}
    </div>
  );
}
