import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, RefreshCw, LogOut, Shield, Zap } from 'lucide-react';
import { revokeToken } from '../services/googleAuth';

export default function Header({ onLogout }) {
  const { state, dispatch, syncFromSheets } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const handleSync = async () => {
    const { proxyUrl, connected } = state.sheetsConfig || {};
    const email = state.user?.email;
    if (!connected || !proxyUrl || !email) return;
    setSyncing(true);
    await syncFromSheets(proxyUrl, email);
    setSyncing(false);
  };

  const handleLogout = () => {
    revokeToken();
    if (onLogout) onLogout();
  };

  const score = state.financialHealthScore || 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const unreadNotifs = (state.notifications || []).filter(n => !n.read);

  return (
    <div style={{ height: '56px', background: 'var(--bg-sidebar, var(--bg-sidebar))', borderBottom: '1px solid var(--border-color, var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Left: month indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
          {state.config?.activeMonth?.toUpperCase()} {state.config?.activeYear}
        </div>
        {state.sheetsConfig?.connected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
            Live
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Health score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`, transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 12px ${scoreColor}30`} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
          <Shield size={12} color={scoreColor} />
          <span style={{ fontSize: '11px', color: scoreColor, fontWeight: 700 }}>{score}/100</span>
        </div>

        {/* Sync button */}
        {state.sheetsConfig?.connected && (
          <button onClick={handleSync} disabled={syncing} onMouseDown={e => { if (!syncing) e.currentTarget.style.transform = 'scale(0.92)'; }} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border-color, var(--border-color))', background: 'transparent', cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'transform 0.1s ease' }}>
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifs(!showNotifs)} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border-color, var(--border-color))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative', transition: 'transform 0.1s ease' }}>
            <Bell size={14} />
            {unreadNotifs.length > 0 && (
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'float 1.5s ease-in-out infinite' }} />
            )}
          </button>
        </div>

        {/* AI insights badge */}
        {(state.aiInsights || []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', background: '#7c3aed15', border: '1px solid #7c3aed30', cursor: 'pointer', animation: 'borderGlow 2s ease-in-out infinite both' }}
            title={state.aiInsights[0]}>
            <Zap size={11} color="#a78bfa" />
            <span style={{ fontSize: '10px', color: '#a78bfa' }}>New insight</span>
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border-color, var(--border-color))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'transform 0.1s ease' }}
          title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
