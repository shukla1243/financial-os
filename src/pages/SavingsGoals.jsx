import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Calendar, X } from 'lucide-react';

const COLOR_MAP = {
  cyan: '#06b6d4', purple: '#7c3aed', pink: '#f472b6',
  gold: '#fbbf24', success: '#10b981', orange: '#f59e0b',
};

function ProgressRing({ pct, color, size = 100 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} filter={`drop-shadow(0 0 6px ${color}40)`}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </svg>
  );
}

function GoalCard({ goal, onUpdate, delay = 0 }) {
  const pct = goal.target > 0 ? Math.min(Math.round((goal.saved / goal.target) * 100), 100) : 0;
  const color = COLOR_MAP[goal.color] || '#7c3aed';
  const remaining = goal.target - goal.saved;
  const monthsLeft = goal.monthlyAdd > 0 ? Math.ceil(remaining / goal.monthlyAdd) : null;
  const etaDate = monthsLeft ? new Date(Date.now() + monthsLeft * 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month:'short', year:'numeric' }) : null;

  const [addAmount, setAddAmount] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const amt = parseFloat(addAmount);
    if (!amt || amt <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await onUpdate({ ...goal, saved: Math.min(goal.saved + amt, goal.target) });
      setAddAmount('');
      setShowAdd(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', borderTop:`2px solid ${color}` }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div>
          <div style={{ fontSize:'22px', marginBottom:'4px' }}>{goal.icon}</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, color:'var(--text-main)', fontSize:'14px' }}>{goal.name}</div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>Target: ₹{goal.target.toLocaleString()}</div>
        </div>
        {/* Ring */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ProgressRing pct={pct} color={color} size={90} />
          <div style={{ position:'absolute', textAlign:'center' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, color, fontSize:'14px' }}>{pct}%</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--border-color)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ height: '100%', borderRadius: '4px', width:`${pct}%`, background:color, transition:'width 1s ease' }} />
      </div>

      {/* Stats */}
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color }}>₹{goal.saved.toLocaleString()}</div>
          <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>Saved</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color:'var(--text-muted)' }}>₹{remaining.toLocaleString()}</div>
          <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>Remaining</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color:'#a78bfa' }}>₹{goal.monthlyAdd.toLocaleString()}</div>
          <div style={{ fontSize:'10px', color:'var(--text-muted)' }}>/ month</div>
        </div>
      </div>

      {/* ETA */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 12px', borderRadius:'8px', background:'var(--bg-main)50', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <Calendar size={12} color="var(--text-muted)" />
          <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>Deadline: {goal.deadline}</span>
        </div>
        {etaDate && (
          <span style={{ fontSize:'11px', color: pct === 100 ? '#10b981' : monthsLeft <= 3 ? '#f59e0b' : color }}>
            {pct === 100 ? '🎉 Complete!' : `ETA: ${etaDate}`}
          </span>
        )}
      </div>

      {/* Add money */}
      {pct < 100 && (
        showAdd ? (
          <div style={{ display:'flex', gap:'8px' }}>
            <input value={addAmount} onChange={e => setAddAmount(e.target.value)}
              placeholder="Amount to add" type="number"
              disabled={submitting}
              style={{ flex:1, padding:'8px 12px', borderRadius:'8px', background:'var(--bg-card)',
                border:`1px solid ${color}40`, color:'var(--text-main)', fontSize:'12px', height:'36px', boxSizing:'border-box', outline:'none' }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
            <button onClick={handleAdd} disabled={submitting} style={{ padding:'8px 14px', borderRadius:'8px', border:'none',
              background:color, color:'#fff', fontSize:'12px', cursor:submitting ? 'not-allowed' : 'pointer', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', minWidth:'60px' }}>
              {submitting ? <div className="spinner spinner-sm" /> : 'Add'}
            </button>
            <button onClick={() => setShowAdd(false)} disabled={submitting} style={{ padding:'8px', borderRadius:'8px',
              border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ width:'100%', padding:'8px', borderRadius:'8px', border:`1px dashed ${color}40`,
              background:'transparent', color, fontSize:'12px', cursor:'pointer', fontWeight:500 }}>
            + Add Money
          </button>
        )
      )}
    </div>
  );
}

const ICONS = ['✈️','🛡️','📈','🏠','🚗','💻','📱','🎓','💒','🌏','🎮','🎵'];
const COLORS = ['cyan','purple','pink','gold','success','orange'];

export default function SavingsGoals() {
  const { state, addGoal, updateGoal } = useApp();
  const { savingsGoals } = state;
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ name:'', target:'', monthlyAdd:'', deadline:'', icon:'🎯', color:'purple' });

  const totalSaved = savingsGoals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const completed = savingsGoals.filter(g => g.saved >= g.target).length;

  const handleUpdate = (updated) => {
    updateGoal(updated);
  };

  const handleAdd = () => {
    if (!newGoal.name || !newGoal.target) return;
    addGoal({
      name: newGoal.name,
      target: parseFloat(newGoal.target),
      saved: 0,
      monthlyAdd: parseFloat(newGoal.monthlyAdd) || 0,
      deadline: newGoal.deadline || 'No deadline',
      icon: newGoal.icon,
      color: newGoal.color,
      status: 'On Track',
    });
    setNewGoal({ name:'', target:'', monthlyAdd:'', deadline:'', icon:'🎯', color:'purple' });
    setShowAdd(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'4px' }}>GOALS</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Savings Goals</h1>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px', marginTop: '2px' }}>貯蓄目標 — Every rupee with a purpose</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label:'TOTAL SAVED', value:`₹${totalSaved.toLocaleString()}`, color:'#10b981' },
          { label:'TOTAL TARGET', value:`₹${totalTarget.toLocaleString()}`, color:'#06b6d4' },
          { label:'GOALS COMPLETE', value:`${completed} / ${savingsGoals.length}`, color:'#fbbf24' },
        ].map((s, idx) => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', animation: 'scaleIn 0.3s ease-out both', animationDelay: `${idx * 0.05}s` }}>
            <div style={{ fontSize:'9px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'6px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Goals Grid */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {savingsGoals.map((goal, idx) => (
          <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdate} delay={idx * 0.08} />
        ))}
      </div>

      {/* Add Goal */}
      {showAdd ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', borderTop: '2px solid #7c3aed' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', fontSize: '14px' }}>New Goal</div>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'6px' }}>GOAL NAME</label>
              <input value={newGoal.name} onChange={e => setNewGoal(g => ({...g, name:e.target.value}))} autoComplete="off" spellCheck={false}
                placeholder="e.g. New Laptop" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px',
                  background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'6px' }}>TARGET (₹)</label>
              <input value={newGoal.target} onChange={e => setNewGoal(g => ({...g, target:e.target.value}))} autoComplete="off"
                placeholder="e.g. 80000" type="number" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px',
                  background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'6px' }}>MONTHLY CONTRIBUTION (₹)</label>
              <input value={newGoal.monthlyAdd} onChange={e => setNewGoal(g => ({...g, monthlyAdd:e.target.value}))} autoComplete="off"
                placeholder="e.g. 2000" type="number" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px',
                  background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'6px' }}>DEADLINE</label>
              <input value={newGoal.deadline} onChange={e => setNewGoal(g => ({...g, deadline:e.target.value}))} autoComplete="off" spellCheck={false}
                placeholder="e.g. Dec 2026" style={{ width:'100%', padding:'8px 12px', borderRadius:'8px',
                  background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <div style={{ marginTop:'16px' }}>
            <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>ICON</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
              {ICONS.map(icon => (
                <button key={icon} onClick={() => setNewGoal(g => ({...g, icon}))}
                  style={{ width:36, height:36, borderRadius:'8px', border:`1px solid ${newGoal.icon === icon ? '#7c3aed' : 'var(--border-color)'}`,
                    background: newGoal.icon === icon ? '#7c3aed20' : 'var(--bg-card)', fontSize:'18px', cursor:'pointer' }}>
                  {icon}
                </button>
              ))}
            </div>
            <label style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1px', display:'block', marginBottom:'8px' }}>COLOR</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewGoal(g => ({...g, color:c}))}
                  style={{ width:28, height:28, borderRadius:'50%', border:`2px solid ${newGoal.color === c ? '#fff' : 'transparent'}`,
                    background:COLOR_MAP[c], cursor:'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
            <button onClick={handleAdd} style={{ flex:1, padding:'10px', borderRadius:'10px', border:'none',
              background:'linear-gradient(135deg, #7c3aed, #06b6d4)', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:'13px' }}>
              Create Goal
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding:'10px 16px', borderRadius:'10px',
              border:'1px solid var(--border-color)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'13px' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'1px dashed #7c3aed40',
            background:'transparent', color:'#7c3aed', fontSize:'13px', cursor:'pointer', fontWeight:500,
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          + Add New Goal
        </button>
      )}
    </div>
  );
}
