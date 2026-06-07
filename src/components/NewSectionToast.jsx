import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

export default function NewSectionToast() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const notifications = state.newSectionNotifications || [];
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (notifications.length > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          dispatch({ type: 'CLEAR_NEW_SECTION_NOTIFICATIONS' });
        }, 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, dispatch]);

  if (notifications.length === 0) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      dispatch({ type: 'CLEAR_NEW_SECTION_NOTIFICATIONS' });
    }, 300);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    }}>
      {notifications.map((n, i) => (
        <div key={i} className="glass-card" style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderLeft: '4px solid var(--primary-color)',
          padding: '16px 20px',
          maxWidth: '320px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          position: 'relative',
          animation: 'slideIn 0.3s ease'
        }}>
          <button 
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            <X size={14} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingRight: '16px' }}>
            <span style={{ fontSize: '20px' }}>{n.icon}</span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#a78bfa', fontWeight: 700 }}>NEW SECTION BUILT</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>{n.message}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { navigate(`/section/${n.sectionId}`); handleDismiss(); }}
              style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
              View {n.name} →
            </button>
            <button
              onClick={handleDismiss}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

