import React from 'react';
import { useNavigate } from 'react-router-dom';

function ComingSoonPage({ title, subtitle, icon, color = '#7c3aed', phase }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', animation: 'slideUp 0.35s ease-out' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>{icon}</div>
      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, marginBottom: '8px', color }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>{subtitle}</p>
      <div style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: '#7c3aed20', color: '#a78bfa', marginTop: '8px' }}>
        Phase {phase} — Coming Soon
      </div>
      <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed40', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', marginTop: '32px', fontSize: '13px' }}>
        ← Back to Dashboard
      </button>
    </div>
  );
}

export default ComingSoonPage;

export function Analytics() {
  return <ComingSoonPage title="ANALYTICS" subtitle="Deep dive into your spending patterns" icon="📊" color="#a78bfa" phase={2} />;
}

export function Investments() {
  return <ComingSoonPage title="INVESTMENTS" subtitle="SIP tracker, Groww, Crypto portfolio" icon="💹" color="#06b6d4" phase={3} />;
}

export function SavingsGoals() {
  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, color: '#10b981' }}>SAVINGS GOALS</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px' }}>貯蓄目標 — Your financial milestones</div>
      </div>
      <ComingSoonPage title="" subtitle="Goal progress rings, timelines, projections" icon="🎯" color="#10b981" phase={4} />
    </div>
  );
}

export function BillCalendar() {
  return <ComingSoonPage title="BILL CALENDAR" subtitle="Never miss a payment — visual bill tracker" icon="📅" color="#f59e0b" phase={4} />;
}

export function MonthlyReport() {
  return <ComingSoonPage title="MONTHLY REPORT" subtitle="Auto-generated AI powered monthly summary" icon="📑" color="#f472b6" phase={4} />;
}

export function AIChat() {
  return <ComingSoonPage title="AI FINANCE CHAT" subtitle="Ask anything about your money — powered by Gemini" icon="🤖" color="#f472b6" phase={5} />;
}
