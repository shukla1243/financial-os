import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import LogoutButton from '../components/LogoutButton';
import { useApp } from '../context/AppContext';

export default function useInjectLogout() {
  const location = useLocation();
  const { state } = useApp();

  useEffect(() => {
    // If showLogoutButton is enabled
    if (!state.showLogoutButton) return;

    // Give react routing a split second to complete render
    const timer = setTimeout(() => {
      const activeHeader = document.querySelector('header, .header-container, #top-header, .topbar, #root > div > div > div > div:first-child');
      if (!activeHeader) return;

      // Check if there is already a logout button inside
      const hasLogout = activeHeader.querySelector('button[title="Sign out"], .logout-btn, button:has(svg[class*="log-out"]), button:has(svg[class*="LogOut"])');
      if (hasLogout) return;

      // Inject LogoutButton dynamically
      let portalContainer = activeHeader.querySelector('.injected-logout-container');
      if (!portalContainer) {
        portalContainer = document.createElement('div');
        portalContainer.className = 'injected-logout-container';
        portalContainer.style.marginLeft = 'auto';
        portalContainer.style.display = 'flex';
        portalContainer.style.alignItems = 'center';
        activeHeader.appendChild(portalContainer);
      }

      const root = ReactDOM.createRoot(portalContainer);
      root.render(<LogoutButton />);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, state.showLogoutButton]);
}
