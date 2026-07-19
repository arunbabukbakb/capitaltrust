import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeContext.tsx';
import { logOut } from './authSlice';

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

// Override global fetch to automatically inject the JWT token from localStorage.
// Only intercept same-origin requests (relative paths or same origin).
// External URLs (e.g. Google Firebase APIs) are passed through unchanged to prevent CORS failures.
const originalFetch = window.fetch;
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
      const storedToken = localStorage.getItem('token');
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
