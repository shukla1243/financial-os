import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LogoutButton from '../components/LogoutButton';
import { TrendingUp, TrendingDown, DollarSign, Shield, AlertTriangle, CheckCircle, Plus, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COINGECKO_MAPPING, fetchCoinGeckoPrices } from '../services/walletService';

const CAT_ICONS = { Housing:'🏠', Food:'🍱', Health:'💪', Telecom:'📡', Subscriptions:'📱', Transport:'⛽', Savings:'💾', Other:'📦' };
const CAT_COLORS = { Housing:'#7c3aed', Food:'#f472b6', Health:'#10b981', Telecom:'#06b6d4', Subscriptions:'#fbbf24', Transport:'#f59e0b', Savings:'#10b981', Other:'var(--text-muted)' };

const S = {
  card: { background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--card-radius)', padding:'20px' },
  label: { fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', fontWeight:600, marginBottom:'6px' },
  val: { fontFamily:'Orbitron, monospace', fontWeight:700, fontSize:'22px' },
  row: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--grid-gap, 16px)', marginBottom:'20px' },
  grid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'var(--grid-gap, 12px)', marginBottom:'20px' },
};

function KPICard({ title, value, sub, color, icon: Icon, topColor, delay = 0 }) {
  return (
    <div style={{ ...S.card, borderTop:`2px solid ${topColor || color}`, animation:`scaleIn 0.4s ease-out both`, animationDelay:`${delay}s` }}>
      <div style={{ ...S.row, marginBottom:'12px' }}>
        <div>
          <div style={S.label}>{title}</div>
          <div style={{ ...S.val, color, marginTop:'4px' }}>{value}</div>
        </div>
        <div style={{ padding:'10px', borderRadius:'10px', background:`${color}15` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function CategoryBar({ name, spent, budget, color }) {
  const pct = budget > 0 ? Math.min((spent/budget)*100, 100) : 0;
  const over = spent > budget && budget > 0;
  const barColor = over ? '#ef4444' : pct >= 80 ? '#f59e0b' : color;
  return (
    <div style={{ marginBottom:'16px' }}>
      <div style={{ ...S.row, marginBottom:'6px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'15px' }}>{CAT_ICONS[name] || '📦'}</span>
          <span style={{ fontSize:'13px', fontWeight:500, color:'var(--text-main)' }}>{name}</span>
          {over && <span style={{ fontSize:'9px', padding:'2px 6px', borderRadius:'10px', background:'#ef444420', color:'#ef4444', fontWeight:700 }}>OVER</span>}
          {pct >= 100 && !over && <span style={{ fontSize:'9px', padding:'2px 6px', borderRadius:'10px', background:'#10b98120', color:'#10b981', fontWeight:700 }}>✓</span>}
        </div>
        <div style={{ textAlign:'right' }}>
          <span style={{ fontFamily:'Orbitron, monospace', fontSize:'13px', color: over ? '#ef4444' : 'var(--text-main)' }}>₹{spent.toLocaleString()}</span>
          <span style={{ fontSize:'11px', color:'var(--text-muted)' }}> / ₹{budget.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height:'6px', background:'var(--border-color, var(--border-color))', borderRadius:'4px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:'4px', transition:'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state, computed } = useApp();
  const navigate = useNavigate();
  const { totalIncome, totalExpenses, buffer, savingsRate, categorySpend, extraIncome } = computed;
  const { config, savingsGoals, tracker, aiInsights, financialHealthScore, level, xp } = state;
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();
  const dailyBudget = daysLeft > 0 ? Math.round(buffer / daysLeft) : 0;

  const [cryptoPrices, setCryptoPrices] = useState({
    bitcoin: { inr: 5800000 },
    ethereum: { inr: 320000 },
    solana: { inr: 14000 },
    cardano: { inr: 45 },
    binancecoin: { inr: 50000 },
    'matic-network': { inr: 55 }
  });

  useEffect(() => {
    const cryptoItems = (state.investments || []).filter(i => (i.Type || i.type) === 'Crypto');
    const uniqueGeckoIds = cryptoItems.map(i => {
      const coinSym = (i.Fund_Coin || i.fund_coin || '').toLowerCase();
      return COINGECKO_MAPPING[coinSym] || coinSym;
    }).filter(Boolean);

    fetchCoinGeckoPrices(uniqueGeckoIds)
      .then(prices => {
        if (prices) setCryptoPrices(prev => ({ ...prev, ...prices }));
      })
      .catch(e => console.warn('CoinGecko fallback', e));
  }, [state.investments]);

  const getCryptoVal = (i) => {
    const coinSym = (i.Fund_Coin || i.fund_coin || '').toLowerCase();
    const coinId = COINGECKO_MAPPING[coinSym] || coinSym;
    const price = cryptoPrices[coinId]?.inr || parseFloat(i.CurrentValue || i.currentValue) || 0;
    return (parseFloat(i.Units || i.units) || 0) * price;
  };

  const sipValue = (state.investments || [])
    .filter(i => (i.Type || i.type) === 'SIP')
    .reduce((s, i) => s + (parseFloat(i.CurrentValue || i.currentValue) || 0), 0);

  const cryptoValue = (state.investments || [])
    .filter(i => (i.Type || i.type) === 'Crypto')
    .reduce((s, i) => s + getCryptoVal(i), 0);

  const netWorth = buffer + sipValue + cryptoValue;
  const overBudget = Object.entries(config.budgets).filter(([cat,budget])=>(categorySpend[cat]||0)>budget && budget>0);
  const newSections = state.newSectionNotifications || [];
  
  // Health score count-up animation
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const target = financialHealthScore || 0;
    if (target === 0) return;
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [financialHealthScore]);

  return (
    <div style={{ animation:'slideUp 0.35s ease-out both' }}>
      {/* Header */}
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontFamily:'Orbitron, monospace', fontSize:'22px', fontWeight:900, background:'linear-gradient(135deg, #a78bfa, #06b6d4, #f472b6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'4px' }}>
          {config.name?.toUpperCase() || 'SHREYANSH'} // FINANCIAL OS
        </h1>
        <div style={{ fontFamily:'monospace', fontSize:'11px', color:'#7c3aed80', letterSpacing:'2px' }}>お金の力で未来を切り拓け — Cut open the future with the power of money</div>
      </div>

      {/* New section notification */}
      {newSections.length > 0 && (
        <div style={{ ...S.card, borderLeft:'4px solid #7c3aed', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Zap size={20} color="#a78bfa" />
          <div>
            <div style={{ fontSize:'12px', color:'#a78bfa', fontWeight:700, marginBottom:'2px' }}>AI BUILT SOMETHING NEW</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{newSections[0]?.message}</div>
          </div>
        </div>
      )}

      {/* Budget alerts */}
      {overBudget.length > 0 && (
        <div style={{ padding:'12px 16px', borderRadius:'10px', background:'#ef444410', border:'1px solid #ef444430', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize:'12px', color:'#ef4444' }}>
            Over budget: {overBudget.map(([cat])=>cat).join(', ')}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={S.grid2}>
        <KPICard title="TOTAL INCOME" value={`₹${totalIncome.toLocaleString()}`} sub={`Base ₹${(config.salary+config.homeIncome).toLocaleString()}${extraIncome>0?` + ₹${extraIncome.toLocaleString()} extra`:''}`} color="#06b6d4" icon={DollarSign} topColor="#06b6d4" delay={0} />
        <KPICard title="TOTAL EXPENSES" value={`₹${totalExpenses.toLocaleString()}`} sub={tracker.filter(t=>t.month===config.activeMonth && String(t.year)===String(config.activeYear)).length > 0 ? `${tracker.filter(t=>t.month===config.activeMonth && String(t.year)===String(config.activeYear)).length} transactions` : 'No expenses logged yet'} color="#f472b6" icon={TrendingDown} topColor="#f472b6" delay={0.08} />
        <KPICard title="SAVINGS TARGET" value={`₹${(categorySpend['Savings']||0).toLocaleString()}`} sub={`Target: ₹${(config.budgets['Savings']||6000).toLocaleString()} / month`} color="#10b981" icon={Shield} topColor="#10b981" delay={0.16} />
        <KPICard title="BUFFER" value={`₹${buffer.toLocaleString()}`} sub={`₹${dailyBudget.toLocaleString()}/day left • ${daysLeft} days remaining`} color="#fbbf24" icon={TrendingUp} topColor="#fbbf24" delay={0.24} />
      </div>

      {/* Main content: budget + sidebar */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'16px' }}>
        {/* Budget Status */}
        <div style={{...S.card, minWidth:0}}>
          <div style={{ ...S.row, marginBottom:'20px' }}>
            <div>
              <div style={S.label}>BUDGET STATUS</div>
              <div style={{ fontFamily:'Orbitron, monospace', fontSize:'14px', color:'var(--text-main)' }}>{config.activeMonth} {config.activeYear}</div>
            </div>
            <button onClick={()=>navigate('/logger')}
              style={{ padding:'8px 14px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
              <Plus size={14} /> Log Expense
            </button>
          </div>

          {Object.keys(config.budgets).length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px', color:'#475569', fontSize:'13px' }}>No categories yet</div>
          ) : (
            Object.entries(config.budgets).map(([cat, budget], idx) => (
              <div key={cat} style={{ animation:'slideInLeft 0.3s ease-out both', animationDelay:`${idx * 0.05}s` }}>
                <CategoryBar name={cat} spent={categorySpend[cat]||0} budget={budget} color={CAT_COLORS[cat]||'#7c3aed'} />
              </div>
            ))
          )}

          <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid var(--border-color, var(--border-color))', ...S.row }}>
            <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>Overall Savings Rate</span>
            <span style={{ fontFamily:'Orbitron, monospace', fontSize:'14px', color: parseFloat(savingsRate)>=20?'#10b981':'#f59e0b' }}>{savingsRate}%</span>
          </div>
        </div>

        {/* Right sidebar widgets */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {/* Net Worth */}
          <div style={{ ...S.card, borderTop:'2px solid #7c3aed', animation:'borderGlow 3s ease-in-out infinite both' }}>
            <div style={S.label}>NET WORTH</div>
            <div style={{ fontFamily:'Orbitron, monospace', fontSize:'20px', fontWeight:700, color:'#a78bfa', marginBottom:'12px' }}>₹{netWorth.toLocaleString()}</div>
            {[['💵 Cash Buffer', buffer, '#06b6d4'], ['📈 SIP Value', sipValue, '#10b981'], ['₿ Crypto', cryptoValue, '#fbbf24']].map(([label, val, color])=>(
              <div key={label} style={{ ...S.row, marginBottom:'8px' }}>
                <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily:'Orbitron, monospace', fontSize:'12px', color }}>₹{val.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Health Score */}
          <div style={{ ...S.card, borderTop:'2px solid #10b981', textAlign:'center' }}>
            <div style={S.label}>FINANCIAL HEALTH</div>
            <div style={{ fontFamily:'Orbitron, monospace', fontSize:'36px', fontWeight:900, color: financialHealthScore>=80?'#10b981':financialHealthScore>=60?'#f59e0b':'#ef4444', margin:'8px 0' }}>
              {displayScore}<span style={{ fontSize:'16px', color:'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ height:'6px', background:'var(--border-color, var(--border-color))', borderRadius:'4px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${financialHealthScore}%`, background:'linear-gradient(90deg, var(--primary-color), #10b981)', borderRadius:'4px' }} />
            </div>
          </div>

          {/* AI Insight */}
          {(aiInsights||[]).length > 0 && (
            <div style={{ ...S.card, borderTop:'2px solid #f472b6' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <Zap size={14} color="#f472b6" />
                <div style={{ fontSize:'10px', color:'#f472b6', letterSpacing:'1px', fontWeight:700 }}>AI INSIGHT</div>
              </div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)', lineHeight:'1.6' }}>{aiInsights[0]}</div>
            </div>
          )}

          {/* Savings Goals */}
          {savingsGoals.length > 0 && (
            <div style={{ ...S.card, borderTop:'2px solid #06b6d4' }}>
              <div style={{ ...S.row, marginBottom:'12px' }}>
                <div style={S.label}>SAVINGS GOALS</div>
                <button onClick={()=>navigate('/goals')} style={{ fontSize:'11px', color:'#06b6d4', background:'transparent', border:'none', cursor:'pointer' }}>View all →</button>
              </div>
              {savingsGoals.slice(0,3).map(g=>{
                const pct = g.target>0?Math.min(Math.round((g.saved/g.target)*100),100):0;
                const color = g.color==='cyan'?'#06b6d4':g.color==='success'?'#10b981':g.color==='pink'?'#f472b6':g.color==='gold'?'#fbbf24':'#7c3aed';
                return (
                  <div key={g.id} style={{ marginBottom:'12px' }}>
                    <div style={{ ...S.row, marginBottom:'5px' }}>
                      <span style={{ fontSize:'12px', color:'var(--text-main)' }}>{g.icon} {g.name}</span>
                      <span style={{ fontFamily:'Orbitron, monospace', fontSize:'11px', color }}>{pct}%</span>
                    </div>
                    <div style={{ height:'4px', background:'var(--border-color, var(--border-color))', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          <div style={S.card}>
            <div style={S.label}>QUICK ACTIONS</div>
            {[['🤖 Log Expense', '/logger', 'var(--primary-color)'], ['📊 Analytics', '/analytics', 'var(--accent-color)'], ['💬 Ask AI', '/chat', '#f472b6']].map(([label, path, color])=>(
              <button key={path} onClick={()=>navigate(path)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', border:`1px solid ${color.startsWith('var') ? color : color + '30'}`, background:`${color.startsWith('var') ? 'transparent' : color + '10'}`, color, fontSize:'12px', fontWeight:500, cursor:'pointer', marginBottom:'8px', textAlign:'left', display:'flex', alignItems:'center', gap:'8px', transition:'all 0.2s ease' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.background=color.startsWith('var') ? 'rgba(255,255,255,0.05)' : `${color}20`}} onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';e.currentTarget.style.background=color.startsWith('var') ? 'transparent' : `${color}10`}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>
    </div>
  );
}
