import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useTrafficTracker() {
  const location = useLocation();
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    // Only track customer workspace pages, skip superadmin routes and raw login pages
    const isSuperAdmin = location.pathname.startsWith('/admin');
    if (isSuperAdmin) return;

    const renderStartTime = performance.now();

    // Use requestIdleCallback or setTimeout to calculate page render completion time
    const timer = setTimeout(() => {
      const renderEndTime = performance.now();
      const responseTimeMs = Math.max(5, Math.round(renderEndTime - renderStartTime));

      // Simple device type detection
      const width = window.innerWidth;
      let deviceType = 'Desktop';
      if (width < 640) deviceType = 'Mobile';
      else if (width < 1024) deviceType = 'Tablet';

      const payload = {
        pagePath: location.pathname + location.search,
        pageTitle: document.title || location.pathname,
        responseTimeMs,
        deviceType,
        statusCode: 200
      };

      fetch('/api/traffic/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Silent catch for telemetry
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);
}
