import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CATEGORY_COLORS = {
  Housing:'#7c3aed', Food:'#f472b6', Health:'#10b981',
  Telecom:'#06b6d4', Subscriptions:'#fbbf24', Transport:'#f59e0b',
  Savings:'#10b981', Other:'var(--text-muted)',
};
const CATEGORY_ICONS = {
  Housing:'🏠', Food:'🍱', Health:'💪', Telecom:'📡',
  Subscriptions:'📱', Transport:'⛽', Savings:'💾', Other:'📦',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'10px 14px' }}>
      <div style={{ color:'var(--text-muted)', fontSize:'11px', marginBottom:'6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize:'12px', fontWeight:600 }}>
          {p.name}: ₹{(p.value||0).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { state, computed } = useApp();
  const { tracker, config, income } = state;
  const [selectedMonth, setSelectedMonth] = useState(config.activeMonth);
  const [selectedYear] = useState(config.activeYear);
  const [drillCategory, setDrillCategory] = useState(null);

  // Build monthly data for bar/line charts
  const monthlyData = useMemo(() => {
    return MONTHS.map(month => {
      const expenses = tracker.filter(t => t.month === month && t.year === selectedYear);
      const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const extraInc = income.filter(i => i.month === month && i.year === selectedYear).reduce((s, i) => s + (i.amount || 0), 0);
      const totalInc = config.salary + config.homeIncome + extraInc;
      const savings = totalInc - totalExp;
      const savingsRate = totalInc > 0 ? parseFloat(((savings / totalInc) * 100).toFixed(1)) : 0;
      return { month, income: totalInc, expenses: totalExp, savings: Math.max(savings, 0), savingsRate, transactions: expenses.length };
    });
  }, [tracker, income, config, selectedYear]);

  // Category donut for selected month
  const donutData = useMemo(() => {
    const monthExpenses = tracker.filter(t => t.month === selectedMonth && t.year === selectedYear);
    return Object.keys(config.budgets).map(cat => ({
      name: cat,
      value: monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
      color: CATEGORY_COLORS[cat],
      icon: CATEGORY_ICONS[cat],
    })).filter(d => d.value > 0);
  }, [tracker, config, selectedMonth, selectedYear]);

  // Drill-down transactions
  const drillTransactions = useMemo(() => {
    if (!drillCategory) return [];
    return tracker
      .filter(t => t.category === drillCategory && t.month === selectedMonth && t.year === selectedYear)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [tracker, drillCategory, selectedMonth, selectedYear]);

  // Best/worst month
  const monthsWithData = monthlyData.filter(m => m.expenses > 0);
  const bestMonth = monthsWithData.length ? monthsWithData.reduce((b, m) => m.savingsRate > b.savingsRate ? m : b, monthsWithData[0]) : null;
  const worstMonth = monthsWithData.length ? monthsWithData.reduce((b, m) => m.expenses > b.expenses ? m : b, monthsWithData[0]) : null;

  const selectedData = monthlyData.find(m => m.month === selectedMonth) || {};
  const selectedExpenses = tracker.filter(t => t.month === selectedMonth && t.year === selectedYear);

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'4px' }}>ANALYTICS</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Spending Intelligence</h1>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px', marginTop: '2px' }}>支出分析 — Know where every rupee goes</div>
      </div>

      {/* Month Selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'12px' }}>SELECT MONTH TO ANALYSE</div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {MONTHS.map(m => {
            const hasData = tracker.some(t => t.month === m && t.year === selectedYear);
            return (
              <button
                key={m}
                onClick={() => { setSelectedMonth(m); setDrillCategory(null); }}
                style={{
                  fontFamily: 'Orbitron, monospace',
                  padding:'6px 14px', borderRadius:'8px', fontSize:'11px', fontWeight:600, cursor:'pointer',
                  background: selectedMonth === m ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : hasData ? 'var(--border-color)80' : 'var(--bg-card)',
                  boxShadow: selectedMonth === m ? '0 0 15px rgba(124,58,237,0.5)' : 'none',
                  border: selectedMonth === m ? 'none' : `1px solid ${hasData ? '#7c3aed40' : 'var(--border-color)'}`,
                  color: selectedMonth === m ? '#fff' : hasData ? '#a78bfa' : '#475569',
                  position:'relative',
                  animation: selectedMonth === m ? 'borderGlow 3s ease-in-out infinite both' : 'none'
                }}
              >
                {m}
                {hasData && selectedMonth !== m && (
                  <span style={{ position:'absolute', top:'-3px', right:'-3px', width:'6px', height:'6px', borderRadius:'50%', background:'#7c3aed' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label:'THIS MONTH SPENT', value:`₹${(selectedData.expenses||0).toLocaleString()}`, color:'#f472b6' },
          { label:'TRANSACTIONS', value: selectedExpenses.length, color:'#06b6d4' },
          { label:'SAVINGS RATE', value:`${selectedData.savingsRate||0}%`, color: (selectedData.savingsRate||0) >= 20 ? '#10b981' : '#f59e0b' },
          { label:'AVG PER DAY', value:`₹${selectedExpenses.length > 0 ? Math.round((selectedData.expenses||0)/30).toLocaleString() : 0}`, color:'#a78bfa' },
        ].map((stat, i) => (
          <div key={stat.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', animation: 'scaleIn 0.3s ease-out both', animationDelay: `${i * 0.05}s` }}>
            <div style={{ fontSize:'9px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'6px' }}>{stat.label}</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Best / Worst */}
      {(bestMonth || worstMonth) && (
        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px', gridTemplateColumns: '1fr 1fr' }}>
          {bestMonth && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', borderTop: '2px solid #10b981' }}>
              <div style={{ fontSize:'10px', color:'#10b981', letterSpacing:'1.5px', marginBottom:'6px' }}>🏆 BEST MONTH</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, color: 'var(--text-main)' }}>{bestMonth.month} {selectedYear}</div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>Savings rate: <span style={{ color:'#10b981' }}>{bestMonth.savingsRate}%</span></div>
            </div>
          )}
          {worstMonth && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', borderTop: '2px solid #ef4444' }}>
              <div style={{ fontSize:'10px', color:'#ef4444', letterSpacing:'1.5px', marginBottom:'6px' }}>💀 HIGHEST SPEND</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, color: 'var(--text-main)' }}>{worstMonth.month} {selectedYear}</div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>Spent: <span style={{ color:'#ef4444' }}>₹{worstMonth.expenses.toLocaleString()}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px', gridTemplateColumns: '1fr 1fr' }}>
        {/* Bar Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'16px' }}>INCOME vs EXPENSES — {selectedYear}</div>
          {monthlyData.some(m => m.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={220} style={{ animation:'fadeIn 0.6s ease-out' }}>
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="#06b6d420" stroke="#06b6d4" strokeWidth={1} radius={[4,4,0,0]} name="Income" />
                <Bar dataKey="expenses" fill="#f472b620" stroke="#f472b6" strokeWidth={1} radius={[4,4,0,0]} name="Expenses" />
                <Bar dataKey="savings" fill="#10b98120" stroke="#10b981" strokeWidth={1} radius={[4,4,0,0]} name="Savings" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'13px' }}>
              No data yet — start logging expenses
            </div>
          )}
        </div>

        {/* Donut Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'16px' }}>CATEGORY BREAKDOWN — {selectedMonth}</div>
          {donutData.length > 0 ? (
            <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}
                    onClick={(d) => setDrillCategory(drillCategory === d.name ? null : d.name)}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={drillCategory && drillCategory !== entry.name ? 0.3 : 1} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'6px' }}>
                {donutData.map(d => (
                  <button key={d.name} onClick={() => setDrillCategory(drillCategory === d.name ? null : d.name)}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px', borderRadius:'6px',
                      background: drillCategory === d.name ? `${d.color}20` : 'transparent',
                      border: `1px solid ${drillCategory === d.name ? d.color+'40' : 'transparent'}`,
                      cursor:'pointer', textAlign:'left' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                      <span style={{ fontSize:'11px', color:'var(--text-main)' }}>{d.icon} {d.name}</span>
                    </div>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '10px', color: d.color }}>₹{d.value.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'13px' }}>
              No data for {selectedMonth}
            </div>
          )}
        </div>
      </div>

      {/* Savings Rate Line Chart */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'16px' }}>SAVINGS RATE TREND — {selectedYear}</div>
        {monthlyData.some(m => m.savingsRate > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'10px', padding:'8px 12px' }}>
                  <div style={{ color:'var(--text-muted)', fontSize:'11px' }}>{label}</div>
                  <div style={{ color:'#10b981', fontSize:'13px', fontWeight:600 }}>{payload[0]?.value}% savings rate</div>
                </div>
              ) : null} />
              <Area type="monotone" dataKey="savingsRate" stroke="#10b981" strokeWidth={2} fill="url(#savingsGrad)" name="Savings Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'#475569', fontSize:'13px' }}>
            Log expenses across multiple months to see your trend
          </div>
        )}
      </div>

      {/* Drill-down */}
      {drillCategory && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <div>
              <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px' }}>DRILL DOWN</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontWeight: 700, color: CATEGORY_COLORS[drillCategory], marginTop: '2px' }}>
                {CATEGORY_ICONS[drillCategory]} {drillCategory} — {selectedMonth}
              </div>
            </div>
            <button onClick={() => setDrillCategory(null)}
              style={{ fontSize:'11px', color:'var(--text-muted)', background:'var(--border-color)', border:'none', borderRadius:'6px', padding:'4px 10px', cursor:'pointer' }}>
              ✕ Close
            </button>
          </div>
          {drillTransactions.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {drillTransactions.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', borderRadius:'8px', background:'var(--bg-main)50', border:'1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize:'13px', color:'var(--text-main)', fontWeight:500 }}>{t.description}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{t.day}, {t.date} {t.month} • {t.mode}</div>
                  </div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', color: CATEGORY_COLORS[drillCategory] }}>
                    ₹{t.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:'8px', borderTop:'1px solid var(--border-color)' }}>
                <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>Total: </span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', marginLeft: '8px', color: CATEGORY_COLORS[drillCategory] }}>
                  ₹{drillTransactions.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color:'#475569', fontSize:'13px', textAlign:'center', padding:'20px' }}>
              No {drillCategory} expenses in {selectedMonth}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
