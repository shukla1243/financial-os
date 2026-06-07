import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS = {
  Housing:'#7c3aed', Food:'#f472b6', Health:'#10b981',
  Telecom:'#06b6d4', Subscriptions:'#fbbf24', Transport:'#f59e0b',
  Savings:'#10b981', Other:'var(--text-muted)',
};
const CATEGORY_ICONS = {
  Housing:'🏠', Food:'🍱', Health:'💪', Telecom:'📡',
  Subscriptions:'📱', Transport:'⛽', Savings:'💾', Other:'📦',
};

export default function BillCalendar() {
  const { state, updateBill, addExpense } = useApp();
  const { billCalendar, config } = state;
  const today = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const [submittingBills, setSubmittingBills] = useState({});

  const totalMonthly = billCalendar.filter(b => b.frequency === 'Monthly').reduce((s, b) => s + b.amount, 0);
  const totalPaid = billCalendar.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
  const totalUnpaid = billCalendar.filter(b => b.status === 'Unpaid').reduce((s, b) => s + b.amount, 0);
  const overdue = billCalendar.filter(b => b.status === 'Unpaid' && b.dueDate < today);

  const getBillStatus = (bill) => {
    if (bill.status === 'Paid') return 'paid';
    if (bill.dueDate < today) return 'overdue';
    if (bill.dueDate <= today + 3) return 'due-soon';
    return 'upcoming';
  };

  const markPaid = async (bill) => {
    if (submittingBills[bill.id]) return;
    setSubmittingBills(prev => ({ ...prev, [bill.id]: true }));
    try {
      await updateBill({ ...bill, status:'Paid' });
      const todayObj = new Date();
      const dayStr = todayObj.toLocaleString('default', { weekday:'short' });
      const fullDateStr = todayObj.toISOString().split('T')[0];

      await addExpense({
        month: config.activeMonth,
        year: config.activeYear,
        day: dayStr,
        date: fullDateStr,
        category: bill.category,
        description: bill.name,
        amount: bill.amount,
        mode: 'Auto-debit',
        note: 'Logged from Bill Calendar',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingBills(prev => ({ ...prev, [bill.id]: false }));
    }
  };

  const markUnpaid = async (bill) => {
    if (submittingBills[bill.id]) return;
    setSubmittingBills(prev => ({ ...prev, [bill.id]: true }));
    try {
      await updateBill({ ...bill, status:'Unpaid' });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingBills(prev => ({ ...prev, [bill.id]: false }));
    }
  };

  // Build calendar days
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const billsOnDay = (day) => billCalendar.filter(b => b.dueDate === day);

  const statusConfig = {
    paid: { color:'#10b981', bg:'#10b98115', icon:<CheckCircle size={14} />, label:'PAID' },
    overdue: { color:'#ef4444', bg:'#ef444415', icon:<AlertTriangle size={14} />, label:'OVERDUE' },
    'due-soon': { color:'#f59e0b', bg:'#f59e0b15', icon:<Clock size={14} />, label:'DUE SOON' },
    upcoming: { color:'var(--text-muted)', bg:'var(--text-muted)10', icon:<Clock size={14} />, label:'UPCOMING' },
  };

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'4px' }}>BILLS</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bill Calendar</h1>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px', marginTop: '2px' }}>請求書管理 — Never miss a payment</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label:'TOTAL PAID', value:`₹${totalPaid.toLocaleString()}`, color:'#10b981' },
          { label:'STILL OWED', value:`₹${totalUnpaid.toLocaleString()}`, color:'#f472b6' },
          { label:'OVERDUE', value: overdue.length, color: overdue.length > 0 ? '#ef4444' : '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize:'9px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'6px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 300px' }}>
        {/* Calendar Grid */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'16px' }}>
            {new Date().toLocaleString('default', { month:'long', year:'numeric' }).toUpperCase()}
          </div>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'4px', marginBottom:'8px' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:'10px', color:'#475569', padding:'4px', fontWeight:600 }}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:'4px' }}>
            {calDays.map((day, i) => {
              const bills = day ? billsOnDay(day) : [];
              const isToday = day === today;
              return (
                <div key={i} style={{
                  minHeight:'52px', borderRadius:'8px', padding:'4px',
                  background: isToday ? '#7c3aed20' : day ? 'var(--bg-main)50' : 'transparent',
                  border: isToday ? '1px solid #7c3aed' : '1px solid transparent', animation: isToday ? 'borderGlow 2s ease-in-out infinite' : 'none',
                }}>
                  {day && (
                    <>
                      <div style={{ fontSize:'11px', color: isToday ? '#a78bfa' : 'var(--text-muted)',
                        fontWeight: isToday ? 700 : 400, marginBottom:'2px' }}>{day}</div>
                      {bills.map(b => (
                        <div key={b.id} title={`${b.name} ₹${b.amount}`}
                          style={{ width:'100%', height:'4px', borderRadius:'2px', marginBottom:'2px',
                            background: b.status === 'Paid' ? '#10b981' : day < today ? '#ef4444' : CATEGORY_COLORS[b.category] || '#7c3aed' }} />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display:'flex', gap:'16px', marginTop:'16px', flexWrap:'wrap' }}>
            {[['#10b981','Paid'],['#ef4444','Overdue'],['#7c3aed','Upcoming']].map(([color, label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'var(--text-muted)' }}>
                <div style={{ width:10, height:10, borderRadius:'2px', background:color }} />{label}
              </div>
            ))}
          </div>
        </div>

        {/* Bill List */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'4px' }}>ALL BILLS THIS MONTH</div>
          {billCalendar
            .sort((a, b) => a.dueDate - b.dueDate)
            .map((bill, idx) => {
              const status = getBillStatus(bill);
              const sc = statusConfig[status];
              const catColor = CATEGORY_COLORS[bill.category] || 'var(--text-muted)';
              return (
                <div key={bill.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${catColor}`, animation: 'slideInRight 0.35s ease-out both', animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'14px' }}>{CATEGORY_ICONS[bill.category]}</span>
                        <span style={{ fontSize:'13px', color:'var(--text-main)', fontWeight:500 }}>{bill.name}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>
                        {bill.frequency} • Due {bill.dueDate === 1 ? '1st' : bill.dueDate === 2 ? '2nd' : bill.dueDate === 3 ? '3rd' : `${bill.dueDate}th`}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color: catColor }}>
                      ₹{bill.amount.toLocaleString()}
                    </div>
                  </div>
                  {/* Status + action */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'12px',
                      background:sc.bg, color:sc.color, fontSize:'10px', fontWeight:600 }}>
                      {sc.icon}
                      <span style={{ marginLeft:'3px' }}>{sc.label}</span>
                    </div>
                    {bill.status === 'Unpaid' ? (
                      <button onClick={() => markPaid(bill)} disabled={submittingBills[bill.id]} onMouseDown={e=>e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                        style={{ padding:'4px 10px', borderRadius:'8px', border:'none', background:'#10b98120',
                          color:'#10b981', fontSize:'11px', cursor:submittingBills[bill.id] ? 'not-allowed' : 'pointer', fontWeight:600, minWidth:'90px', transition: 'transform 0.1s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {submittingBills[bill.id] ? <div className="spinner spinner-sm spinner-cyan" /> : 'Mark Paid ✓'}
                      </button>
                    ) : (
                      <button onClick={() => markUnpaid(bill)} disabled={submittingBills[bill.id]} onMouseDown={e=>e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                        style={{ padding:'4px 10px', borderRadius:'8px', border:'1px solid var(--border-color)',
                          background:'transparent', color:'var(--text-muted)', fontSize:'11px', cursor:submittingBills[bill.id] ? 'not-allowed' : 'pointer', minWidth:'90px', transition: 'transform 0.1s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {submittingBills[bill.id] ? <div className="spinner spinner-sm spinner-cyan" /> : 'Undo'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
