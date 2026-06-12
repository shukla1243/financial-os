import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, DollarSign, Flame, Plus, Shield, Sparkles, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COINGECKO_MAPPING, fetchCoinGeckoPrices } from '../services/walletService';
import { ActionButton, AnimePanel, ProgressLine, RankBadge, SectionHeading, StatPanel } from '../components/AnimeUI';
import { calculateGoalSavings, calculateNetWorth } from '../services/netWorth';

const CAT_COLORS = { Housing:'#a855f7', Food:'#f472b6', Health:'#10b981', Telecom:'#22d3ee', Subscriptions:'#fbbf24', Transport:'#f59e0b', Savings:'#10b981', Other:'#64748b' };

function BudgetRow({ name, spent, budget, index }) {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const color = over ? '#ef4444' : percent >= 80 ? '#f59e0b' : CAT_COLORS[name] || 'var(--primary-color)';
  return (
    <div className="budget-row" style={{ '--entry-delay': `${index * 0.05}s` }}>
      <div className="budget-row__meta">
        <div><span className="budget-row__dot" style={{ background: color }} />{name}{over && <span className="danger-chip">LIMIT BREAK</span>}</div>
        <span>₹{spent.toLocaleString()} <small>/ ₹{budget.toLocaleString()}</small></span>
      </div>
      <ProgressLine value={percent} color={color} />
    </div>
  );
}

export default function Dashboard() {
  const { state, computed } = useApp();
  const navigate = useNavigate();
  const { totalIncome, totalExpenses, totalSavings, buffer, savingsRate, categorySpend, extraIncome } = computed;
  const { config, savingsGoals, tracker, aiInsights, financialHealthScore, level, xp } = state;
  const [cryptoPrices, setCryptoPrices] = useState({});
  const today = new Date();
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
  const dailyBudget = daysLeft > 0 ? Math.round(buffer / daysLeft) : 0;
  const activeTransactions = tracker.filter(t => t.month === config.activeMonth && String(t.year) === String(config.activeYear));
  const xpProgress = ((xp || 0) % 500) / 5;

  useEffect(() => {
    const ids = (state.investments || []).filter(i => (i.Type || i.type) === 'Crypto').map(i => {
      const symbol = (i.Fund_Coin || i.fund_coin || '').toLowerCase();
      return COINGECKO_MAPPING[symbol] || symbol;
    }).filter(Boolean);
    fetchCoinGeckoPrices(ids).then(prices => prices && setCryptoPrices(prices)).catch(() => {});
  }, [state.investments]);

  const sipValue = (state.investments || []).filter(i => (i.Type || i.type) === 'SIP').reduce((sum, i) => sum + (parseFloat(i.CurrentValue || i.currentValue) || 0), 0);
  const cryptoValue = (state.investments || []).filter(i => (i.Type || i.type) === 'Crypto').reduce((sum, i) => {
    const symbol = (i.Fund_Coin || i.fund_coin || '').toLowerCase();
    const price = cryptoPrices[COINGECKO_MAPPING[symbol] || symbol]?.inr || parseFloat(i.CurrentValue || i.currentValue) || 0;
    return sum + (parseFloat(i.Units || i.units) || 0) * price;
  }, 0);
  const goalSavingsValue = calculateGoalSavings(savingsGoals);
  const netWorth = calculateNetWorth({ cashBuffer: buffer, savings: goalSavingsValue, investments: sipValue, crypto: cryptoValue });
  const overBudget = Object.entries(config.budgets || {}).filter(([cat, budget]) => (categorySpend[cat] || 0) > budget && budget > 0);
  const score = financialHealthScore ?? 0;
  const achievementCount = [parseFloat(savingsRate) >= 20, activeTransactions.length >= 5, score >= 70, savingsGoals.length > 0].filter(Boolean).length;

  return (
    <div className="anime-page dashboard-page">
      <section className="command-hero">
        <div className="command-hero__beam" />
        <div className="command-hero__content">
          <div className="hero-kicker"><Zap size={13} /> LIVE FINANCIAL COMMAND SYSTEM</div>
          <h1>{config.name?.toUpperCase() || 'FINANCIAL OS'}</h1>
          <p>Your next chapter is being written in real time. Track the mission, strengthen the buffer, and level up your money system.</p>
          <div className="hero-actions">
            <ActionButton onClick={() => navigate('/logger')}>Log new expense</ActionButton>
            <ActionButton secondary onClick={() => navigate('/chat')}>Ask companion AI</ActionButton>
          </div>
        </div>
        <div className="command-hero__profile">
          <RankBadge score={score} />
          <div className="profile-level">
            <div><span>PLAYER LEVEL</span><strong>LV. {level || 1}</strong></div>
            <span>{xp || 0} XP</span>
          </div>
          <ProgressLine value={xpProgress} color="linear-gradient(90deg,var(--primary-color),var(--accent-color))" />
          <div className="profile-mini-grid">
            <div><Flame size={15} /><strong>{activeTransactions.length}</strong><span>logs this month</span></div>
            <div><Sparkles size={15} /><strong>{achievementCount}/4</strong><span>missions cleared</span></div>
          </div>
        </div>
      </section>

      {(state.newSectionNotifications || []).length > 0 && (
        <div className="system-notice"><Bot size={17} /><div><strong>NEW SYSTEM MODULE UNLOCKED</strong><span>{state.newSectionNotifications[0]?.message}</span></div></div>
      )}
      {overBudget.length > 0 && (
        <div className="system-notice system-notice--danger"><AlertTriangle size={17} /><div><strong>BUDGET ALERT</strong><span>{overBudget.map(([cat]) => cat).join(', ')} crossed the current limit.</span></div></div>
      )}

      <div className="stat-grid">
        <StatPanel label="Income power" value={`₹${totalIncome.toLocaleString()}`} sub={`Base ₹${(config.salary + config.homeIncome).toLocaleString()}${extraIncome > 0 ? ` + ₹${extraIncome.toLocaleString()} extra` : ''}`} icon={DollarSign} tone="cyan" />
        <StatPanel label="Expense damage" value={`₹${totalExpenses.toLocaleString()}`} sub={`${activeTransactions.length} transactions this chapter`} icon={TrendingDown} tone="pink" delay={0.06} />
        <StatPanel label="Cash buffer" value={`₹${buffer.toLocaleString()}`} sub={`₹${dailyBudget.toLocaleString()} daily power · ${daysLeft} days left`} icon={Shield} tone="gold" delay={0.12} />
        <StatPanel label="Savings allocated" value={`₹${totalSavings.toLocaleString()}`} sub={`${savingsRate}% of income moved into goals`} icon={TrendingUp} tone="green" delay={0.18} />
      </div>

      <div className="dashboard-command-grid">
        <AnimePanel className="budget-command">
          <SectionHeading eyebrow={`${config.activeMonth} ${config.activeYear} · LIVE MISSION`} title="Budget Battle Map" note="Every category is a lane. Keep each one inside its power limit." action={<button className="icon-action" onClick={() => navigate('/logger')}><Plus size={16} /></button>} />
          <div className="budget-list">
            {Object.keys(config.budgets || {}).length === 0
              ? <div className="empty-state"><Target size={26} /><strong>No budget missions yet</strong><span>Create categories in Settings to activate the map.</span></div>
              : Object.entries(config.budgets).map(([cat, budget], index) => <BudgetRow key={cat} name={cat} budget={budget} spent={categorySpend[cat] || 0} index={index} />)}
          </div>
        </AnimePanel>

        <div className="command-side-stack">
          <AnimePanel accent="primary" className="health-core">
            <div className="health-core__orbit" style={{ background: `conic-gradient(var(--primary-color) ${score}%, var(--border-color) 0)` }}><div><strong>{score}</strong><span>/100</span></div></div>
            <div><span className="panel-kicker">FINANCIAL HEALTH CORE</span><h3>{score >= 80 ? 'Elite condition' : score >= 60 ? 'System stable' : 'Recovery mission'}</h3><p>Your score updates from your real financial activity.</p></div>
          </AnimePanel>
          <AnimePanel accent="cyan">
            <SectionHeading eyebrow="ASSET LOADOUT" title="Net Worth" />
            <div className="net-worth-value">₹{netWorth.toLocaleString()}</div>
            <div className="asset-list"><span>Cash buffer <strong>₹{buffer.toLocaleString()}</strong></span><span className="asset-list__savings">Savings <strong>₹{goalSavingsValue.toLocaleString()}</strong></span><span>SIP value <strong>₹{sipValue.toLocaleString()}</strong></span><span>Crypto <strong>₹{cryptoValue.toLocaleString()}</strong></span></div>
          </AnimePanel>
          <AnimePanel accent="pink">
            <SectionHeading eyebrow="COMPANION SIGNAL" title="AI Insight" />
            <p className="insight-copy">{aiInsights?.[0] || 'Log a few transactions and your companion AI will surface a tactical insight here.'}</p>
          </AnimePanel>
        </div>
      </div>

      <div className="dashboard-lower-grid">
        <AnimePanel>
          <SectionHeading eyebrow="ACTIVE QUESTS" title="Savings Goals" action={<button className="text-action" onClick={() => navigate('/goals')}>Open quest log</button>} />
          <div className="quest-grid">
            {savingsGoals.length === 0 ? <div className="empty-state"><Target size={24} /><strong>No active quests</strong><span>Add a savings goal to begin.</span></div> : savingsGoals.slice(0, 4).map(goal => {
              const percent = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
              return <div className="quest-card" key={goal.id}><div><span>{goal.icon}</span><strong>{goal.name}</strong><em>{Math.round(percent)}%</em></div><ProgressLine value={percent} color="linear-gradient(90deg,var(--primary-color),var(--accent-color))" /></div>;
            })}
          </div>
        </AnimePanel>
        <AnimePanel accent="gold">
          <SectionHeading eyebrow="ACHIEVEMENT BOARD" title="Current Streaks" />
          <div className="achievement-list">
            <div className={activeTransactions.length >= 5 ? 'is-cleared' : ''}><Flame /><span><strong>Active Logger</strong>Log 5 transactions this month</span></div>
            <div className={parseFloat(savingsRate) >= 20 ? 'is-cleared' : ''}><Shield /><span><strong>Buffer Guardian</strong>Reach a 20% savings rate</span></div>
            <div className={score >= 70 ? 'is-cleared' : ''}><Sparkles /><span><strong>System Ascension</strong>Reach 70 financial health</span></div>
          </div>
        </AnimePanel>
      </div>
    </div>
  );
}
