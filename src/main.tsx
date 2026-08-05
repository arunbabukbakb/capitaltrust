import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './index.css';
import './i18n'; // Initialize i18n before app renders
import { ThemeProvider } from './components/ThemeContext.tsx';
import { logOut } from './authSlice';
import { initGA } from "./utils/analytics.js";

// Initialize Google Analytics
initGA();

export function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // If running on localhost: e.g. "tenant.localhost"
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  // If running on a standard domain: e.g. "tenant.capitaltrust.com"
  if (parts.length > 2) {
    if (parts[0] !== 'www') {
      return parts[0];
    }
  }

  return null;
}

const originalFetch = window.fetch;
let refreshTokenPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  try {
    const headers = new Headers();
    const subdomain = getSubdomain();
    if (subdomain) {
      headers.set('X-Tenant-Id', subdomain);
    }
    const res = await originalFetch('/api/auth/refresh', {
      method: 'POST',
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        return data.token;
      }
    }
    return null;
  } catch (err) {
    console.error("Token refresh failed", err);
    return null;
  } finally {
    refreshTokenPromise = null;
  }
}

window.fetch = async (input, init) => {
  // Determine request URL
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : (input as Request).url;

  // Check if request is to our own server (relative paths or same origin)
  const isSameOrigin = url.startsWith('/') ||
    url.startsWith(window.location.origin);

  // For external URLs (Firebase, Google, etc.), skip custom header injection
  if (!isSameOrigin) {
    return originalFetch(input, init);
  }

  const token = localStorage.getItem('token');
  const newInit = { ...(init || {}) };
  const headers = new Headers(newInit.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const subdomain = getSubdomain();
  if (subdomain) {
    headers.set('X-Tenant-Id', subdomain);
  }

  newInit.headers = headers;

  try {
    const response = await originalFetch(input, newInit);
    if (response.status === 401) {
      const isRefreshRequest = url.includes('/api/auth/refresh') || url.includes('/api/auth/login');
      const storedToken = localStorage.getItem('token');

      if (!isRefreshRequest && storedToken) {
        if (!refreshTokenPromise) {
          refreshTokenPromise = executeTokenRefresh();
        }
        const newAccessToken = await refreshTokenPromise;
        if (newAccessToken) {
          const retryInit = { ...(init || {}) };
          const retryHeaders = new Headers(retryInit.headers || {});
          retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          const sub = getSubdomain();
          if (sub) {
            retryHeaders.set('X-Tenant-Id', sub);
          }
          retryInit.headers = retryHeaders;
          return originalFetch(input, retryInit);
        }
      }

      const storedUser = localStorage.getItem('user');
      if (storedToken || storedUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeRole');
        store.dispatch(logOut());
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// Global listener for PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

// Register service worker for caching and offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('ServiceWorker registered successfully with scope:', reg.scope),
      (err) => console.error('ServiceWorker registration failed:', err)
    );
    // Register Firebase Cloud Messaging background service worker for push notifications
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' }).then(
      (reg) => console.log('Firebase Messaging ServiceWorker registered with scope:', reg.scope),
      (err) => console.error('Firebase Messaging ServiceWorker registration failed:', err)
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
