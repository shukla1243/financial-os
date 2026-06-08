import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Bot, BarChart3, TrendingUp, Target, Calendar, FileText, MessageSquare, Settings, ChevronLeft, ChevronRight, Zap, Star, Shield, List } from 'lucide-react';

const STATIC_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', jp: 'ダッシュボード' },
  { path: '/logger', icon: Bot, label: 'AI Logger', jp: 'AI入力' },
  { path: '/transactions', icon: List, label: 'Transactions', jp: '取引明細' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', jp: '分析' },
  { path: '/investments', icon: TrendingUp, label: 'Investments', jp: '投資' },
  { path: '/goals', icon: Target, label: 'Goals', jp: '目標' },
  { path: '/bills', icon: Calendar, label: 'Bill Calendar', jp: '請求書' },
  { path: '/report', icon: FileText, label: 'Monthly Report', jp: 'レポート' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat', jp: 'AIチャット' },
];

const LEVEL_NAMES = ['Rookie', 'Saver', 'Tracker', 'Warrior', 'Master', 'Legend', 'Sage', 'Oracle'];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const open = state.sidebarOpen;

  const level = state.level || 1;
  const xp = state.xp || 0;
  const xpForNext = level * 500;
  const xpProgress = ((xp % 500) / 500) * 100;
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];

  // Dynamic sections from blueprint
  const dynamicSections = (state.appBlueprint || []).filter(s => s.Status === 'Active');

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const NavItem = ({ path, icon: Icon, label, jp, emoji }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => navigate(path)}
        title={!open ? label : ''}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: open ? '9px 12px' : '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: active ? 'linear-gradient(135deg, #7c3aed20, #06b6d410)' : 'transparent',
          borderLeft: active ? '2px solid #7c3aed' : '2px solid transparent',
          transition: 'all 0.15s', marginBottom: '2px', justifyContent: open ? 'flex-start' : 'center',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#ffffff08'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; } }}
      >
        {emoji ? (
          <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
        ) : (
          <Icon size={16} color={active ? '#a78bfa' : '#475569'} style={{ flexShrink: 0 }} />
        )}
        {open && (
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: active ? 600 : 400, color: active ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ fontSize: '9px', color: '#334155', fontFamily: 'monospace' }}>{jp}</div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={`main-sidebar ${open ? 'main-sidebar--open' : 'main-sidebar--closed'}`} style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      width: open ? '220px' : '56px',
      background: 'var(--bg-sidebar, var(--bg-sidebar))', borderRight: '1px solid var(--border-color, var(--border-color))',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s ease', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: open ? '20px 16px 16px' : '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', borderBottom: '1px solid var(--border-color, var(--border-color))' }}>
        {open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glowPulse 3s ease-in-out infinite' }}>
              <Zap size={14} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)' }}>FINANCIAL</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--accent-color)' }}>OS</div>
            </div>
          </div>
        )}
        <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          style={{ width: 28, height: 28, borderRadius: '8px', border: '1px solid var(--border-color, var(--border-color))', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
          {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* User avatar */}
      {state.user && (
        <div style={{ padding: open ? '12px 16px' : '12px 8px', borderBottom: '1px solid var(--border-color, var(--border-color))', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {state.user.picture ? (
            <img src={state.user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, border: '2px solid var(--primary-color)' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
              {state.user.name?.[0] || '?'}
            </div>
          )}
          {open && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.user.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.user.email}</div>
            </div>
          )}
        </div>
      )}

      {/* Level / XP bar */}
      {open && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color, var(--border-color))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={10} color="#fbbf24" />
              <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 700 }}>Lv.{level} {levelName}</span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{xp % 500}/{500} XP</span>
          </div>
          <div style={{ height: 3, borderRadius: '2px', background: 'var(--border-color, var(--border-color))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--primary-color), #fbbf24)', borderRadius: '2px', transition: 'width 0.5s ease', animation: 'slideInLeft 1s ease-out' }} />
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: open ? '12px 10px' : '12px 8px' }}>
        {/* Static nav */}
        {STATIC_NAV.map(item => <NavItem key={item.path} {...item} />)}
        <div className="sidebar-mobile-settings">
          <NavItem path="/settings" icon={Settings} label="Settings" jp="Settings" />
        </div>

        {/* Dynamic sections from AI */}
        {dynamicSections.length > 0 && (
          <>
            {open && (
              <div style={{ padding: '10px 4px 6px', fontSize: '9px', color: '#334155', letterSpacing: '1.5px', fontWeight: 600 }}>
                AI-BUILT SECTIONS ✨
              </div>
            )}
            {dynamicSections.map(section => (
              <NavItem
                key={section.SectionID}
                path={`/section/${section.SectionID}`}
                label={section.Name?.replace(/^[^\s]+\s/, '') || section.SectionID}
                jp={section.SectionID}
                emoji={section.Icon}
              />
            ))}
          </>
        )}
      </div>

      {/* Settings */}
      <div style={{ padding: open ? '10px' : '10px 8px', borderTop: '1px solid var(--border-color, var(--border-color))' }}>
        {state.isAdmin && (
          <NavItem path="/admin" icon={Shield} label="Admin Panel" jp="管理者" />
        )}
        <NavItem path="/settings" icon={Settings} label="Settings" jp="設定" />
      </div>
    </div>
  );
}
