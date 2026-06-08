import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getAdminRegistry, toggleUserPlan, toggleUserStatus } from '../services/proxyService';
import { Users, UserCheck, UserX, ExternalLink, Search, RefreshCw, AlertTriangle, ShieldAlert, Shield, Loader, Mail, Calendar, CheckCircle } from 'lucide-react';

const S = {
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' },
  label: { fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '6px' },
  val: { fontFamily: 'Orbitron, monospace', fontWeight: 700, fontSize: '22px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' },
  input: { background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', transition: 'border-color 0.2s' },
  btn: { background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  btnOutline: { background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed40', borderRadius: '8px', cursor: 'pointer', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
};

export default function AdminDashboard() {
  const { state } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingUser, setUpdatingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect non-admins
  if (!state.isAdmin) {
    return <Navigate to="/" />;
  }

  const fetchRegistry = async () => {
    if (!state.sheetsConfig.connected || !state.sheetsConfig.proxyUrl) {
      setError('System is not connected to any backend proxy.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getAdminRegistry(state.sheetsConfig.proxyUrl, state.user.email);
      if (res.success) {
        setUsers(res.data || []);
      } else {
        setError(res.error || 'Failed to fetch registry data.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading the registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [state.sheetsConfig.connected, state.sheetsConfig.proxyUrl, state.user?.email]);

  const handleToggleStatus = async (targetEmail, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    if (!window.confirm(`Are you sure you want to change status of ${targetEmail} to ${nextStatus}?`)) {
      return;
    }

    setUpdatingUser(targetEmail);
    setError('');
    setSuccessMessage('');
    try {
      const res = await toggleUserStatus(
        state.sheetsConfig.proxyUrl,
        state.user.email,
        targetEmail,
        nextStatus
      );
      if (res.success) {
        setSuccessMessage(`Successfully updated ${targetEmail} status to ${nextStatus}.`);
        setUsers(prev => prev.map(u => u.email === targetEmail ? { ...u, status: nextStatus } : u));
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setError(res.error || 'Failed to toggle user status.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during status update.');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleTogglePlan = async (targetEmail, currentPlan) => {
    const nextPlan = currentPlan === 'Pro' ? 'Free' : 'Pro';
    setUpdatingUser(targetEmail);
    setError('');
    try {
      const res = await toggleUserPlan(state.sheetsConfig.proxyUrl, state.user.email, targetEmail, nextPlan);
      if (!res.success) throw new Error(res.error || 'Failed to update plan.');
      setUsers(prev => prev.map(user => user.email === targetEmail ? { ...user, plan: nextPlan } : user));
      setSuccessMessage(`${targetEmail} is now on the ${nextPlan} plan.`);
    } catch (err) {
      setError(err.message || 'Could not update plan.');
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Active').length;
  const suspendedUsers = users.filter(u => u.status === 'Suspended').length;

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            ADMIN CONTROL PANEL
          </h2>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px', marginTop: '4px' }}>
            管理者ダッシュボード — Master User Registry & DB Status
          </div>
        </div>
        <button
          onClick={fetchRegistry}
          disabled={loading}
          style={S.btnOutline}
          onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
          Reload Registry
        </button>
      </div>

      {/* Connection & Auth alerts */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#ef444410', border: '1px solid #ef444430', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#10b98110', border: '1px solid #10b98130', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} color="#10b981" />
          <span style={{ fontSize: '12px', color: '#10b981' }}>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={S.grid3}>
        <div style={{ ...S.card, borderTop: '2px solid #a78bfa' }}>
          <div style={S.label}>TOTAL REGISTERED</div>
          <div style={{ ...S.val, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <Users size={20} />
            {loading ? '...' : totalUsers}
          </div>
        </div>
        <div style={{ ...S.card, borderTop: '2px solid #10b981' }}>
          <div style={S.label}>ACTIVE DATABASES</div>
          <div style={{ ...S.val, color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <UserCheck size={20} />
            {loading ? '...' : activeUsers}
          </div>
        </div>
        <div style={{ ...S.card, borderTop: '2px solid #ef4444' }}>
          <div style={S.label}>SUSPENDED USERS</div>
          <div style={{ ...S.val, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <UserX size={20} />
            {loading ? '...' : suspendedUsers}
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div style={S.card}>
        {/* Actions Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="#475569" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ ...S.input, paddingLeft: '38px' }}
              placeholder="Search by User ID, Name, or Email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={e => e.currentTarget.style.borderColor = '#7c3aed60'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && users.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
            <Loader size={32} color="#a78bfa" style={{ animation: 'spin 1.5s linear infinite' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fetching user registry from Google Drive...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <ShieldAlert size={28} color="#475569" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>No Registry Records Found</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
              {searchQuery ? 'Try adjusting your search terms.' : 'No users have initialized a spreadsheet yet.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>USER</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>USER ID</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>CREATED</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>LAST ACTIVE</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>SPREADSHEET</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>STATUS</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>PLAN</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const isActive = user.status === 'Active';
                  const isUpdating = updatingUser === user.email;
                  return (
                    <tr
                      key={user.email}
                      style={{ 
                        borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid var(--border-color)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff04'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* User Column */}
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Mail size={10} />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User ID Column */}
                      <td style={{ padding: '14px 8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-main)', background: 'var(--border-color)40', padding: '2px 6px', borderRadius: '4px' }}>
                          {user.userId}
                        </span>
                      </td>

                      {/* Created Column */}
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} color="#475569" />
                          {user.createdOn ? new Date(user.createdOn).toLocaleDateString('en-IN') : 'N/A'}
                        </div>
                      </td>

                      {/* Last Active Column */}
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {user.lastActiveOn ? new Date(user.lastActiveOn).toLocaleString('en-IN') : 'N/A'}
                        </div>
                      </td>

                      {/* Spreadsheet Column */}
                      <td style={{ padding: '14px 8px' }}>
                        {user.spreadsheetUrl ? (
                          <a
                            href={user.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '11px', 
                              color: '#06b6d4', 
                              textDecoration: 'none', 
                              background: '#06b6d415', 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              border: '1px solid #06b6d430',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#06b6d425';
                              e.currentTarget.style.borderColor = '#06b6d460';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#06b6d415';
                              e.currentTarget.style.borderColor = '#06b6d430';
                            }}
                          >
                            <ExternalLink size={12} />
                            Open Sheet
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#475569' }}>No URL</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td style={{ padding: '14px 8px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '10px', 
                          background: isActive ? '#10b98115' : '#ef444415', 
                          color: isActive ? '#10b981' : '#ef4444', 
                          border: `1px solid ${isActive ? '#10b98130' : '#ef444430'}`
                        }}>
                          {user.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 8px' }}>
                        <button
                          onClick={() => handleTogglePlan(user.email, user.plan || 'Free')}
                          disabled={isUpdating}
                          style={{ background: user.plan === 'Pro' ? '#7c3aed20' : 'transparent', color: user.plan === 'Pro' ? '#c4b5fd' : 'var(--text-muted)', border: '1px solid #7c3aed40', borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 700, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                        >
                          {user.plan === 'Pro' ? 'PRO' : 'FREE'}
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleStatus(user.email, user.status)}
                          disabled={isUpdating}
                          style={{
                            background: 'transparent',
                            color: isActive ? '#ef4444' : '#10b981',
                            border: `1px solid ${isActive ? '#ef444430' : '#10b98130'}`,
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            if (!isUpdating) {
                              e.currentTarget.style.background = isActive ? '#ef444415' : '#10b98115';
                              e.currentTarget.style.borderColor = isActive ? '#ef444460' : '#10b98160';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isUpdating) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = isActive ? '#ef444430' : '#10b98130';
                            }
                          }}
                        >
                          {isUpdating ? (
                            <Loader size={11} style={{ animation: 'spin 1.5s linear infinite' }} />
                          ) : isActive ? (
                            <UserX size={11} />
                          ) : (
                            <UserCheck size={11} />
                          )}
                          {isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        @keyframes slideUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
}
