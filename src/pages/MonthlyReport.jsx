import React, { useEffect, useState } from 'react';
import { Award, Calendar, Cpu, FileText, Printer, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { callAI } from '../services/aiService';
import { sanitizeAITextForDisplay } from '../services/aiOutputGuard';
import { AnimePanel, ProgressLine, RankBadge, SectionHeading, StatPanel } from '../components/AnimeUI';

export default function MonthlyReport() {
  const { state } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(state.config.activeMonth);
  const [selectedYear, setSelectedYear] = useState(state.config.activeYear);
  const [critique, setCritique] = useState('');
  const [loadingCritique, setLoadingCritique] = useState(false);
  const reportExpenses = state.tracker.filter(t => t.month === selectedMonth && t.year === parseInt(selectedYear));
  const reportIncome = state.income.filter(i => i.month === selectedMonth && i.year === parseInt(selectedYear));
  const baseIncome = state.config.salary + state.config.homeIncome;
  const extraIncome = reportIncome.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalIncome = baseIncome + extraIncome;
  const totalExpenses = reportExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const buffer = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((buffer / totalIncome) * 100).toFixed(1) : '0';
  const categorySpend = Object.fromEntries(Object.keys(state.config.budgets || {}).map(cat => [cat, reportExpenses.filter(item => item.category === cat).reduce((sum, item) => sum + item.amount, 0)]));
  const topExpenses = [...reportExpenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const budgetWins = Object.entries(state.config.budgets || {}).filter(([cat, budget]) => budget > 0 && (categorySpend[cat] || 0) <= budget).length;
  const reportScore = Math.max(0, Math.min(100, Math.round((parseFloat(savingsRate) * 2) + (budgetWins * 5))));

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      if (!state.geminiKey) {
        setCritique('Connect your AI provider in Settings to unlock a personalized chapter debrief.');
        return;
      }
      setLoadingCritique(true);
      const categoryData = Object.entries(state.config.budgets || {}).map(([cat, budget]) => `${cat}: ₹${categorySpend[cat] || 0} spent vs ₹${budget} planned`).join('\n');
      const prompt = `You are the Financial OS Companion. Analyze ${selectedMonth} ${selectedYear}. Income ₹${totalIncome}, expenses ₹${totalExpenses}, buffer ₹${buffer}, savings rate ${savingsRate}%. Categories:\n${categoryData}\nWrite exactly 3 concise warm sentences. Mention a specific win and one practical next mission. Plain text only.`;
      try {
        const response = await callAI({ contents: prompt, key: state.geminiKey, temperature: 0.75 });
        if (!cancelled) setCritique(sanitizeAITextForDisplay(response.candidates?.[0]?.content?.parts?.[0]?.text, 'No debrief generated.'));
      } catch {
        if (!cancelled) setCritique('The companion signal is unavailable right now. Your report data is still safe.');
      } finally {
        if (!cancelled) setLoadingCritique(false);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [selectedMonth, selectedYear, state.geminiKey]);

  return (
    <div className="anime-page report-page">
      <section className="report-cover printable-sheet">
        <div className="report-cover__copy">
          <div className="hero-kicker"><FileText size={13} /> ARCHIVED CHAPTER · PERFORMANCE DEBRIEF</div>
          <h1>{selectedMonth} {selectedYear}</h1>
          <p>A cinematic recap of your financial chapter: wins secured, damage taken, and the mission waiting next.</p>
          <div className="report-cover__meta"><span><Calendar size={14} /> {reportExpenses.length} activity logs</span><span><Award size={14} /> {budgetWins} budget wins</span></div>
        </div>
        <RankBadge score={reportScore} />
      </section>

      <div className="report-toolbar no-print">
        <div><strong>SELECT CHAPTER</strong><span>Travel through your monthly archive</span></div>
        <div>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(month => <option key={month}>{month}</option>)}</select>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>{[2025,2026,2027,2028].map(year => <option key={year}>{year}</option>)}</select>
          <button className="game-action" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
        </div>
      </div>

      <div className="report-stat-grid">
        <StatPanel label="Income gathered" value={`₹${totalIncome.toLocaleString()}`} sub={`₹${extraIncome.toLocaleString()} bonus income`} icon={TrendingUp} tone="cyan" />
        <StatPanel label="Damage taken" value={`₹${totalExpenses.toLocaleString()}`} sub={`${reportExpenses.length} expense events`} icon={TrendingDown} tone="pink" delay={0.06} />
        <StatPanel label="Power retained" value={`₹${buffer.toLocaleString()}`} sub={`${savingsRate}% savings rate`} icon={Award} tone="green" delay={0.12} />
      </div>

      <div className="report-story-grid">
        <AnimePanel className="variance-map">
          <SectionHeading eyebrow="MISSION PERFORMANCE" title="Budget Victory Map" note="Each lane compares the chapter's activity against its planned limit." />
          <div className="variance-list">
            {Object.entries(state.config.budgets || {}).length === 0 ? <div className="empty-state"><Target /><strong>No budget lanes found</strong></div> : Object.entries(state.config.budgets).map(([cat, budget]) => {
              const spent = categorySpend[cat] || 0;
              const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const over = budget > 0 && spent > budget;
              return <div className="variance-row" key={cat}><div><strong>{cat}</strong><span className={over ? 'is-danger' : ''}>₹{spent.toLocaleString()} / ₹{budget.toLocaleString()}</span></div><ProgressLine value={percent} color={over ? '#ef4444' : 'linear-gradient(90deg,var(--primary-color),var(--accent-color))'} /></div>;
            })}
          </div>
        </AnimePanel>

        <div className="report-side-stack">
          <AnimePanel accent="primary" className="companion-debrief">
            <SectionHeading eyebrow="COMPANION DEBRIEF" title="AI Chapter Notes" />
            {loadingCritique ? <div className="debrief-loading"><div className="spinner spinner-purple" />Analyzing the chapter...</div> : <p>{critique || 'No debrief available.'}</p>}
            <Cpu size={42} className="companion-debrief__icon" />
          </AnimePanel>
          <AnimePanel accent="pink">
            <SectionHeading eyebrow="BOSS ENCOUNTERS" title="Biggest Expenses" />
            <div className="boss-list">
              {topExpenses.length === 0 ? <div className="empty-state"><strong>No encounters logged</strong></div> : topExpenses.map((expense, index) => <div key={expense.id || index}><em>0{index + 1}</em><span><strong>{expense.description}</strong><small>{expense.category} · {expense.date}</small></span><b>₹{expense.amount.toLocaleString()}</b></div>)}
            </div>
          </AnimePanel>
        </div>
      </div>

      <style>{`
        @media print {
          body { background:#fff !important; color:#111 !important; }
          .no-print, .main-sidebar, .main-header { display:none !important; }
          .app-main-shell { margin:0 !important; }
          .app-content { padding:0 !important; }
          .anime-panel, .report-cover, .stat-panel { background:#fff !important; color:#111 !important; box-shadow:none !important; border:1px solid #ddd !important; }
        }
      `}</style>
    </div>
  );
}
