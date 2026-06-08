import React from 'react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { revokeToken } from '../services/googleAuth';

export default function Suspended() {
  const { state, dispatch } = useApp();

  const handleSignOut = () => {
    revokeToken();
    dispatch({ type: 'RESET_SESSION' });
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main, #0a0a14)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-family, sans-serif)'
    }}>
      <div className="suspended-card fade-in" style={{
        background: 'rgba(239, 68, 68, 0.05)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          marginBottom: '20px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <ShieldAlert size={32} color="#ef4444" className="pulse" />
        </div>
        
        <h2 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: '18px',
          fontWeight: 700,
          color: '#ef4444',
          letterSpacing: '1.5px',
          marginBottom: '12px'
        }}>
          ACCOUNT SUSPENDED
        </h2>

        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted, #94a3b8)',
          lineHeight: '1.6',
          marginBottom: '20px'
        }}>
          {state.suspendReason || 'Your access to Financial OS has been suspended by the administrator.'}
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <a
            href="mailto:?subject=Financial OS Suspension Appeal"
            style={{
              textDecoration: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main, #e2e8f0)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
          >
            <Mail size={14} />
            Contact Administrator
          </a>
          
          <button
            onClick={handleSignOut}
            className="btn-press"
            style={{
              background: '#ef4444',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
