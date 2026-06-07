import React from 'react';
import { LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { clearStoredTheme } from '../services/themeEngine';
import { revokeToken } from '../services/googleAuth';

export default function LogoutButton() {
  const { state, dispatch } = useApp();

  const handleLogout = () => {
    revokeToken();
    const email = state.user?.email;
    if (email) {
      clearStoredTheme(email);
    }
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'LOAD_STATE', payload: { isOnboarded: false, isLoggedIn: false, user: null } });
    localStorage.removeItem('financial-os-v4');
    window.location.reload();
  };

  return (
    <button
      onClick={handleLogout}
      className="logout-btn btn-press"
      title="Sign out"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'var(--text-main)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
      }}
    >
      <LogOut size={13} />
      <span>Logout</span>
    </button>
  );
}
