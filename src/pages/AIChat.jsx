import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Bot, User, Sparkles, TrendingUp, HelpCircle, Target, Calendar } from 'lucide-react';
import { callAI } from '../services/aiService';
import { sanitizeAITextForDisplay } from '../services/aiOutputGuard';

const QUICK_PROMPTS = [
  { icon: '📊', text: 'Am I on track this month?' },
  { icon: '💸', text: 'Where am I overspending?' },
  { icon: '🎯', text: 'How are my savings goals?' },
  { icon: '🔮', text: 'Will I overspend any category?' },
  { icon: '💹', text: "What's my net worth?" },
  { icon: '📅', text: 'What bills are coming up?' },
];

export default function AIChat() {
  const { state, computed, addMemoryFact } = useApp();
  const [messages, setMessages] = useState(() => [
    {
      role: 'ai',
      text: `Hi${state.config.name ? ` ${state.config.name}` : ''}! Ask me about your spending, goals, investments, or upcoming bills.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const { config, tracker, income, investments, savingsGoals, billCalendar, aiMemory } = state;
    const { totalIncome, totalExpenses, categorySpend, buffer, savingsRate, currentMonthExpenses } = computed;

    // Tracker Sheet: last 150 expenses
    const recentExpenses = tracker.slice(-150).map(t =>
      `- ${t.date} (${t.month} ${t.year}, ${t.day}): ₹${t.amount} on "${t.description}" [Category: ${t.category}] [Mode: ${t.mode}]${t.note ? ` (Note: ${t.note})` : ''}`
    ).join('\n');

    // Income Sheet: all items
    const incomeText = (income || []).map(i =>
      `- ${i.date} (${i.month} ${i.year}): ₹${i.amount} from "${i.source}" [Type: ${i.type}]${i.note ? ` (Note: ${i.note})` : ''}`
    ).join('\n');

    // Investments Sheet: all items
    const investmentsText = (investments || []).map(inv =>
      `- ${inv.date || 'N/A'}: ${inv.fund_coin || inv.Fund_Coin || 'Investment'} (${inv.type}) - Units: ${inv.units || inv.Units || 0}, Buy Price: ₹${inv.buyPrice || inv.BuyPrice || 0}, Current Value: ₹${inv.currentValue || inv.CurrentValue || 0} on ${inv.platform || inv.Platform || 'N/A'}${inv.note || inv.Note ? ` (Note: ${inv.note || inv.Note})` : ''}`
    ).join('\n');

    // Savings Goals Sheet: all items
    const goalsText = savingsGoals.map(g =>
      `- ID ${g.id}: ${g.icon || '🎯'} ${g.name} — Target ₹${g.target.toLocaleString()} | Saved ₹${g.saved.toLocaleString()} (${Math.round((g.saved/g.target)*100)}%) | Monthly Add ₹${g.monthlyAdd.toLocaleString()} | Deadline ${g.deadline} | Status: ${g.status}`
    ).join('\n');

    // Bill Calendar Sheet: all items
    const billsText = billCalendar.map(b =>
      `- ID ${b.id}: ${b.name} — ₹${b.amount} due ${b.dueDate}th (${b.frequency}) — Status: ${b.status}${b.lastPaid ? ` (Last Paid: ${b.lastPaid})` : ''}`
    ).join('\n');

    const sipValue = investments.filter(i => i.type === 'SIP').reduce((s, i) => s + (i.currentValue || 0), 0);
    const cryptoValue = investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + (i.currentValue || 0), 0);
    const netWorth = buffer + sipValue + cryptoValue;

    const memories = aiMemory.slice(-15).map(m => `- ${m.date || ''} [${m.type}]: ${m.observation}`).join('\n');

    const fixedExpenses = Object.entries(state.fixedExpenses || {})
      .map(([name, value]) => `- ${name}: ${value.amount || 'variable'} (${value.category || 'uncategorized'})`)
      .join('\n');

    return `You are the authenticated user's personal AI financial advisor inside Financial OS. Use only the user data provided below and never invent personal details or financial records.

PROFILE:
Name: ${config.name || 'Not provided'}
Monthly Income: ₹${totalIncome.toLocaleString()} (Salary ₹${config.salary.toLocaleString()} + Home ₹${config.homeIncome.toLocaleString()})

CURRENT MONTH (${config.activeMonth} ${config.activeYear}):
Total Expenses: ₹${totalExpenses.toLocaleString()}
Buffer Remaining: ₹${buffer.toLocaleString()}
Savings Rate: ${savingsRate}%
Transactions this month: ${currentMonthExpenses.length}

CATEGORY SPENDING vs BUDGET:
${Object.entries(config.budgets).map(([cat, budget]) => {
  const spent = categorySpend[cat] || 0;
  const pct = budget > 0 ? Math.round((spent/budget)*100) : 0;
  const status = spent > budget ? '🔴 OVER' : pct >= 80 ? '🟡 WARNING' : '🟢 OK';
  return `${cat}: ₹${spent.toLocaleString()} / ₹${budget.toLocaleString()} (${pct}%) ${status}`;
}).join('\n')}

EXPENSE TRACKER SHEET (last 150 entries):
${recentExpenses || 'No transactions yet'}

INCOME SHEET ENTRIES:
${incomeText || 'No income entries yet'}

INVESTMENTS SHEET ENTRIES:
${investmentsText || 'No investments logged yet'}

SAVINGS GOALS SHEET:
${goalsText}

BILL CALENDAR SHEET:
${billsText}

NET WORTH:
Cash Buffer: ₹${buffer.toLocaleString()}
SIP Value: ₹${sipValue.toLocaleString()}
Crypto: ₹${cryptoValue.toLocaleString()}
Total: ₹${netWorth.toLocaleString()}

AUTHENTICATED USER MEMORY:
${memories || 'Still learning — keep logging!'}

FIXED EXPENSES:
${fixedExpenses || 'No fixed expenses configured.'}

Answer the user's question with specific numbers and actionable insights. Keep responses concise (3-5 sentences usually). If asked for projections, do the math and show it.`;
  };

  const sendMessage = async (quickText) => {
    const userText = quickText || input.trim();
    if (!userText && !quickText) return;
    if (loading) return;

    setInput('');

    const userMsg = { role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Extract user profile facts in the background to grow memory dynamically
    import('../services/aiService').then(({ extractProfileFact }) => {
      extractProfileFact(userText, state.geminiKey).then(fact => {
        if (fact) {
          addMemoryFact(fact);
        }
      });
    }).catch(() => {});

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));
      conversationHistory.push({ role: 'user', content: userText });

      const data = await callAI({
        systemInstruction: buildContext(),
        contents: conversationHistory,
        temperature: 0.7,
        maxTokens: 600,
        key: state.geminiKey,
      });
      const aiText = sanitizeAITextForDisplay(
        data.candidates?.[0]?.content?.parts?.[0]?.text,
        'I could not produce a safe answer. Please ask that again.'
      );
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (e) {
      const isOverload = e.message?.toLowerCase().includes('overloaded') || e.message?.includes('503');
      setMessages(prev => [...prev, {
        role: 'ai',
        text: isOverload ? '⚠️ AI Service is overloaded right now. Wait a moment and try again.' : `Sorry, something went wrong: ${e.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', animation: 'slideUp 0.35s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-muted)', letterSpacing:'1.5px', marginBottom:'4px' }}>AI ADVISOR</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Finance Chat</h1>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px', marginTop: '2px' }}>財務AI — Your numbers, explained</div>
      </div>

      {/* Quick prompts */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p.text} onClick={() => sendMessage(p.text)}
            style={{ padding:'6px 12px', borderRadius:'20px', fontSize:'11px', cursor:'pointer',
              background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-muted)',
              display:'flex', alignItems:'center', gap:'5px', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed40'; e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
            {p.icon} {p.text}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px', marginBottom:'16px', display:'flex', flexDirection:'column', gap:'16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {/* Avatar */}
            <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
              background: msg.role === 'ai' ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'linear-gradient(135deg, #f472b6, #fbbf24)' }}>
              {msg.role === 'ai' ? <Bot size={16} color="#fff" /> : <User size={16} color="#fff" />}
            </div>
            {/* Bubble */}
            <div style={{
              maxWidth:'75%', padding:'12px 16px', borderRadius: msg.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
              background: msg.role === 'ai' ? 'var(--bg-card)' : 'linear-gradient(135deg, #7c3aed30, #06b6d420)',
              border: `1px solid ${msg.role === 'ai' ? 'var(--border-color)' : '#7c3aed40'}`,
              fontSize:'13px', color:'var(--text-main)', lineHeight:'1.6', whiteSpace:'pre-wrap',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #7c3aed, #06b6d4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{ padding:'12px 16px', borderRadius:'4px 16px 16px 16px', background:'var(--bg-card)', border:'1px solid var(--border-color)' }}>
              <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                {[0,1,2].map(i => (<div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#7c3aed', animation:'float 1.2s ease-in-out infinite', animationDelay:`${i*0.15}s` }} />))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about your finances..."
          style={{ flex:1, padding:'12px 16px', borderRadius:'12px', background:'var(--bg-card)',
            border:'1px solid var(--border-color)', color:'var(--text-main)', fontSize:'13px', outline:'none' }}
          onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.3)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{ width:44, height:44, borderRadius:'12px', border:'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            background: loading || !input.trim() ? 'var(--border-color)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          <Send size={18} color={loading || !input.trim() ? '#475569' : '#fff'} />
        </button>
      </div>
    </div>
  );
}
