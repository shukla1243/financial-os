import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PROXY_URL } from '../config';
import { Save, Check, RefreshCw, Shield, Plus, Database, Zap } from 'lucide-react';
import { THEME_PRESETS, generateThemeFromVibe } from '../services/themeEngine';
import LogoutButton from '../components/LogoutButton';
import { clearUserState, getStableUserId, readUserState } from '../services/userStorage';

function Section({ title, jp, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--card-radius, 12px)', padding: '20px', marginBottom: '16px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--primary-color)', letterSpacing: '1px' }}>{title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--primary-color)80', letterSpacing: '2px', marginTop: '2px' }}>{jp}</div>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, id, label = 'Save', saved, submittingSection }) {
  return (
    <button onClick={onClick} disabled={submittingSection === id} style={{ background: saved === id ? '#10b981' : 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: submittingSection === id ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', opacity: submittingSection === id ? 0.6 : 1 }}>
      {submittingSection === id ? <div className="spinner spinner-sm" /> : saved === id ? <Check size={14} /> : <Save size={14} />}
      {submittingSection === id ? 'Saving...' : saved === id ? 'Saved!' : label}
    </button>
  );
}

export default function Settings() {
  const { state, syncFromSheets, updateTheme, saveSettings, addNewCategory } = useApp();
  const [vibePrompt, setVibePrompt] = useState('');
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [budgets, setBudgets] = useState({ ...state.config.budgets });
  const [salary, setSalary] = useState(state.config.salary);
  const [homeIncome, setHomeIncome] = useState(state.config.homeIncome);
  const [saved, setSaved] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');

  const [submittingSection, setSubmittingSection] = useState('');

  const flash = (id) => { setSaved(id); setTimeout(() => setSaved(''), 2500); };

  const saveIncome = async () => {
    setSubmittingSection('income');
    try {
      await saveSettings({ Salary: parseFloat(salary) || 0, HomeIncome: parseFloat(homeIncome) || 0 });
      flash('income');
    } finally {
      setSubmittingSection('');
    }
  };

  const saveBudgets = async () => {
    setSubmittingSection('budgets');
    try {
      await saveSettings(Object.fromEntries(Object.entries(budgets).map(([cat, amount]) => [`Budget:${cat}`, amount || 0])));
      flash('budgets');
    } finally {
      setSubmittingSection('');
    }
  };

  const addManualCategory = async () => {
    if (!newCatName.trim()) return;
    setSubmittingSection('addcat');
    const categoryName = newCatName.trim();
    const categoryBudget = parseFloat(newCatBudget) || 0;
    await addNewCategory(categoryName, categoryBudget);
    setBudgets(prev => ({ ...prev, [categoryName]: categoryBudget }));
    setNewCatName('');
    setNewCatBudget('');
    setSubmittingSection('');
    flash('addcat');
  };

  const handleManualSync = async () => {
    const email = state.user?.email;
    if (!email || !PROXY_URL) return;
    setSyncing(true);
    setSyncMsg('');
    const result = await syncFromSheets(PROXY_URL, email);
    setSyncing(false);
    setSyncMsg(result.success ? 'Synced successfully!' : 'Sync failed — check your connection.');
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const handleGenerateAITheme = async () => {
    if (!vibePrompt.trim()) return;
    setGeneratingTheme(true);
    const generated = await generateThemeFromVibe(state.geminiKey, vibePrompt);
    setGeneratingTheme(false);
    if (generated) {
      updateTheme(generated);
      setVibePrompt('');
      flash('theme_gen');
    }
  };

  const handleCustomColorChange = (key, value) => {
    const currentTheme = state.config.theme || THEME_PRESETS.cyberpunk;
    const updated = { ...currentTheme, [key]: value };
    updateTheme(updated);
  };

  const score = state.financialHealthScore;
  const scoreValue = score ?? 0;
  const scoreColor = score === null ? '#64748b' : score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth: '700px', width: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SETTINGS</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px' }}>設定パネル — Configure your Financial OS</div>
        <LogoutButton />
      </div>

      {/* Connection Status — read-only */}
      <Section title="SYSTEM STATUS" jp="システム状態 — Backend connection & health">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Backend status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', padding: '12px', background: state.sheetsConfig.connected ? '#10b98110' : '#f59e0b10', border: `1px solid ${state.sheetsConfig.connected ? '#10b98130' : '#f59e0b30'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={14} color={state.sheetsConfig.connected ? '#10b981' : '#f59e0b'} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: state.sheetsConfig.connected ? '#10b981' : '#f59e0b' }}>
                  {state.sheetsConfig.connected ? 'Backend Connected' : 'Connecting...'}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                  {state.sheetsConfig.connected ? 'All data syncing to master sheet' : 'Auto-connecting on login'}
                </div>
              </div>
            </div>
            {state.lastSynced && (
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Last sync: {new Date(state.lastSynced).toLocaleTimeString('en-IN')}
              </div>
            )}
          </div>

          {/* Gemini status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', padding: '12px', background: state.geminiKey ? '#7c3aed10' : '#ef444410', border: `1px solid ${state.geminiKey ? '#7c3aed30' : '#ef444430'}` }}>
            <Zap size={14} color={state.geminiKey ? '#a78bfa' : '#ef4444'} />
            <div style={{ fontSize: '12px', color: state.geminiKey ? '#a78bfa' : '#ef4444', fontWeight: 600 }}>
              {state.geminiKey ? 'AI connected for this session' : 'AI key not configured for this session'}
            </div>
          </div>

          {/* Health score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', padding: '12px', background: `${scoreColor}10`, border: `1px solid ${scoreColor}30` }}>
            <Shield size={14} color={scoreColor} />
            <div style={{ fontSize: '12px', color: scoreColor, fontWeight: 600 }}>
              Financial Health Score: {score === null ? 'Not enough data' : `${scoreValue}/100`}
            </div>
          </div>

          {/* Logged-in user */}
          {state.user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px', padding: '12px', background: '#06b6d410', border: '1px solid #06b6d430' }}>
              {state.user.picture && (
                <img src={state.user.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              )}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#06b6d4' }}>{state.user.name}</div>
                <div style={{ fontSize: '10px', color: '#475569' }}>{state.user.email}</div>
              </div>
            </div>
          )}

          {/* Manual sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleManualSync}
              disabled={syncing}
              style={{ background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed40', borderRadius: '8px', cursor: syncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '7px 14px' }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Syncing...' : 'Force Sync Now'}
            </button>
            {syncMsg && (
              <span style={{ fontSize: '11px', color: syncMsg.includes('success') ? '#10b981' : '#ef4444' }}>
                {syncMsg}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Theme Section */}
      <Section title="DYNAMIC PERSONA THEME" jp="テーマ状態 — Your customized Visual Identity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
              ✓ Persona Locked
            </div>
            
            <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', color: 'var(--primary-color)', marginBottom: '8px' }}>
              {state.config.theme?.themeName || 'Bespoke AI Style'}
            </h3>
            
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
              This theme was generated automatically by the AI based on your onboarding profile, profession, and financial habits.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>LAYOUT PATTERN</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                  {state.config.theme?.layout?.replace('-', ' ') || 'Left Sidebar'}
                </span>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>CURSOR STYLE</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                  {state.config.theme?.cursor || 'Normal'}
                </span>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>VISUAL EFFECTS</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                  {state.config.theme?.decorations?.replace('-', ' ') || 'None'}
                </span>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>TYPOGRAPHY</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {state.config.theme?.fontFamily?.split(',')[0]?.replace(/'/g, '') || 'Inter'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Income */}
      <Section title="INCOME" jp="収入設定 — Monthly income sources">
        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Salary (₹)</label>
            <input style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' }} type="number" value={salary} onChange={e => setSalary(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Home Income (₹)</label>
            <input style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' }} type="number" value={homeIncome} onChange={e => setHomeIncome(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Total Base: <span style={{ fontFamily: 'Orbitron, monospace', color: '#06b6d4' }}>₹{(parseFloat(salary || 0) + parseFloat(homeIncome || 0)).toLocaleString()}</span>
          </div>
          <SaveButton onClick={saveIncome} id="income" saved={saved} submittingSection={submittingSection} />
        </div>
      </Section>

      {/* Categories */}
      <Section title="CATEGORIES" jp="カテゴリー管理 — Self-evolving, AI-powered">
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Categories are created automatically by the AI Logger. Add them manually here too.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {Object.keys(state.config.budgets).map((cat, i) => (
            <span key={cat} style={{ fontSize: '11px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px', animation: 'scaleIn 0.3s ease-out both', animationDelay: `${i * 0.04}s` }}>
              {cat} — ₹{state.config.budgets[cat]?.toLocaleString()}/mo
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', flex: 1 }} placeholder="New category (e.g. Wellness)" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
          <input style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '120px' }} type="number" placeholder="Budget ₹" value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} />
          <button onClick={addManualCategory} disabled={submittingSection === 'addcat'} style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: submittingSection === 'addcat' ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', fontSize: '13px', opacity: submittingSection === 'addcat' ? 0.6 : 1 }}>
            {submittingSection === 'addcat' ? <div className="spinner spinner-sm" /> : saved === 'addcat' ? <Check size={14} /> : <Plus size={14} />}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#475569' }}>New categories appear everywhere instantly. 🧬</div>
      </Section>

      {/* Budgets */}
      <Section title="MONTHLY BUDGETS" jp="予算設定 — Category spending limits">
        <div style={{ display: 'grid', gap: '12px', marginBottom: '16px', gridTemplateColumns: '1fr 1fr' }}>
          {Object.entries(state.config.budgets).map(([cat, val]) => (
            <div key={cat}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{cat} (₹)</label>
              <input
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%' }}
                type="number"
                value={budgets[cat] ?? val}
                onChange={e => setBudgets(prev => ({ ...prev, [cat]: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Total: <span style={{ fontFamily: 'Orbitron, monospace', color: '#a78bfa' }}>₹{Object.values(budgets).reduce((a, b) => a + (b || 0), 0).toLocaleString()}</span>
          </div>
          <SaveButton onClick={saveBudgets} id="budgets" saved={saved} submittingSection={submittingSection} />
        </div>
      </Section>

      {/* Data */}
      <Section title="DATA" jp="データ管理 — Backup and reset">
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { if (window.confirm('Clear local cache for this account?')) { clearUserState(state.user); window.location.reload(); } }}
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef444430', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 16px' }}
          >
            Reset Local Data
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify(readUserState(state.user) || {}, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `financial-os-${getStableUserId(state.user)}-backup.json`; a.click();
            }}
            style={{ background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed40', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 16px' }}
          >
            Export Backup
          </button>
        </div>
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
