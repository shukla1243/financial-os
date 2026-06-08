import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { callAI } from '../services/aiService';
import { sanitizeAITextForDisplay } from '../services/aiOutputGuard';
import { FileText, Calendar, Printer, TrendingUp, Cpu, Award } from 'lucide-react';

export default function MonthlyReport() {
  const { state, computed } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(state.config.activeMonth);
  const [selectedYear, setSelectedYear] = useState(state.config.activeYear);
  const [critique, setCritique] = useState('');
  const [loadingCritique, setLoadingCritique] = useState(false);

  // Compute values for the SELECTED month/year (which may differ from activeMonth)
  const reportExpenses = state.tracker.filter(t => t.month === selectedMonth && t.year === parseInt(selectedYear));
  const reportIncome = state.income.filter(i => i.month === selectedMonth && i.year === parseInt(selectedYear));
  
  const baseIncome = state.config.salary + state.config.homeIncome;
  const extraIncome = reportIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalIncome = baseIncome + extraIncome;
  const totalExpenses = reportExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const categorySpend = {};
  Object.keys(state.config.budgets).forEach(cat => {
    categorySpend[cat] = reportExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
  });

  const buffer = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0';

  // Get top 3 expenses
  const topExpenses = [...reportExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Generate AI Critique
  const generateAICritique = async () => {
    if (!state.geminiKey) {
      setCritique("Connect your Gemini API Key in Settings to get instant AI summaries of your monthly budgets.");
      return;
    }
    setLoadingCritique(true);
    setCritique('');

    const categoryDataStr = Object.entries(state.config.budgets)
      .map(([cat, budget]) => `- ${cat}: Spent ₹${(categorySpend[cat] || 0).toLocaleString()} vs Planned ₹${budget.toLocaleString()}`)
      .join('\n');

    const prompt = `You are the Financial OS Companion. Analyze the user's budget performance for ${selectedMonth} ${selectedYear} and write a short, highly personalized 4-line summary critique.

User's Profile:
- Total Income: ₹${totalIncome.toLocaleString()} (Base: ₹${baseIncome.toLocaleString()}, Extra/Sponsors: ₹${extraIncome.toLocaleString()})
- Total Expenses: ₹${totalExpenses.toLocaleString()}
- Cash Buffer: ₹${buffer.toLocaleString()}
- Savings Rate: ${savingsRate}%

Category Details:
${categoryDataStr}

Top 3 Expenses:
${topExpenses.map((e, idx) => `${idx + 1}. ${e.description} (₹${e.amount})`).join('\n')}

Rules:
- Write exactly 3 or 4 concise sentences.
- Be warm, direct, and slightly anime-themed (using friendly advice).
- Praise high savings or call out overspends in specific categories (e.g. Food or Transport).
- DO NOT use markdown headers or lists. Just plain text.`;

    try {
      const response = await callAI({
        contents: prompt,
        key: state.geminiKey,
        temperature: 0.75
      });
      const text = sanitizeAITextForDisplay(
        response.candidates?.[0]?.content?.parts?.[0]?.text,
        'No critique generated.'
      );
      setCritique(text);
    } catch (e) {
      console.error(e);
      setCritique('Failed to reach Gemini. Try again later.');
    } finally {
      setLoadingCritique(false);
    }
  };

  // Auto-run critique when month/year changes
  useEffect(() => {
    generateAICritique();
  }, [selectedMonth, selectedYear]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = [2025, 2026, 2027, 2028];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      
      {/* Selector Header (hidden on print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MONTHLY REPORT</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary-color)80', letterSpacing: '2px' }}>月次報告書 — Performance, savings rate, & AI critiques</div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Print button */}
          <button
            onClick={handlePrint}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="printable-sheet">
        
        {/* Print Header (Visible ONLY on print) */}
        <div className="print-only" style={{ marginBottom: '24px', borderBottom: '2px solid var(--primary-color)', paddingBottom: '12px' }}>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '24px', color: 'var(--primary-color)' }}>FINANCIAL OS — MONTHLY PERFORMANCE REPORT</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Report Period: {selectedMonth} {selectedYear} | Compiled for: {state.config.name}</div>
        </div>

        {/* Top Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          
          {/* Income */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>TOTAL INCOME</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-color)', marginTop: '4px', fontFamily: 'Orbitron, monospace' }}>
              ₹{totalIncome.toLocaleString()}
            </div>
            {extraIncome > 0 && <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Base: ₹{baseIncome.toLocaleString()} + Extra: ₹{extraIncome.toLocaleString()}</div>}
          </div>

          {/* Expenses */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>TOTAL EXPENSES</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f472b6', marginTop: '4px', fontFamily: 'Orbitron, monospace' }}>
              ₹{totalExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{reportExpenses.length} transactions logged</div>
          </div>

          {/* Savings */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>NET SAVED</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px', fontFamily: 'Orbitron, monospace' }}>
              ₹{buffer.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Target: ₹{(state.config.budgets['Savings'] || 6000).toLocaleString()}/mo</div>
          </div>

          {/* Savings Rate */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>SAVINGS RATE</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: parseFloat(savingsRate) >= 20 ? '#10b981' : '#f59e0b', marginTop: '4px', fontFamily: 'Orbitron, monospace' }}>
              {savingsRate}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Ideal target: 20%+</div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }} className="report-main-grid">
          
          {/* Variance table */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              BUDGET VARIANCE BREAKDOWN
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(state.config.budgets).map(([cat, budget]) => {
                const spent = categorySpend[cat] || 0;
                const isOver = spent > budget && budget > 0;
                const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 500 }}>{cat}</span>
                      <span style={{ color: isOver ? '#ef4444' : 'var(--text-main)' }}>
                        ₹{spent.toLocaleString()} / <span style={{ color: 'var(--text-muted)' }}>₹{budget.toLocaleString()}</span>
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, background: isOver ? '#ef4444' : '#10b981', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: AI critique & Top expenses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* AI Summary */}
            <div className="card" style={{ padding: '16px', borderTop: '2px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Cpu size={14} color="var(--primary-color)" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', letterSpacing: '1px' }}>AI REPORT CRITIQUE</span>
              </div>
              
              {loadingCritique ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', padding: '12px 0' }}>
                  <div className="spinner spinner-sm spinner-purple" />
                  <span>Analyzing financial snapshots...</span>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6', fontStyle: 'italic' }}>
                  {critique || 'No critique available.'}
                </p>
              )}
            </div>

            {/* Top Expenses */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px' }}>BIGGEST LOGGED EXPENSES</div>
              
              {topExpenses.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No transactions this month.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topExpenses.map((e, index) => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: index < 2 ? '1px solid var(--border-color)' : 'none', paddingBottom: index < 2 ? '8px' : '0' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{e.description}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{e.category} | {e.date} {e.month}</div>
                      </div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', fontWeight: 700, color: 'var(--accent-color)' }}>
                        ₹{e.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Global CSS for Print Mode overrides */}
      <style>{`
        @media print {
          /* Hide all general navigation items */
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, nav, header, sidebar, .sidebar-open, .sidebar-collapsed, button {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .card {
            background: white !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            color: black !important;
          }
          .print-only {
            display: block !important;
          }
          .report-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
