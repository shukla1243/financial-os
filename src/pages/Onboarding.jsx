import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { writeMemory, writeGoals } from '../services/proxyService';
import { Send, Zap, Loader } from 'lucide-react';
import { callAI } from '../services/aiService';
import { generateThemeFromVibe, THEME_PRESETS } from '../services/themeEngine';

const ONBOARDING_PROMPT = `You are onboarding a user to their personal Financial OS app. Have a warm, natural anime-themed conversation to learn about them.

Your goal is to learn:
1. Their name and profession/job
2. Any side income (freelance, sponsorships etc.)
3. Their top 3 financial goals with target amounts (e.g. Japan Trip ₹50k, Emergency Fund ₹1L)
4. Their money personality (saver, spender, investor?)
5. Monthly savings capacity (how much they can save per month)

IMPORTANT: Keep responses SHORT (2-3 sentences max). Be warm, friendly, use occasional anime references. After 5-6 exchanges when you have enough info, respond with EXACTLY this JSON block and nothing else after it:

PROFILE_COMPLETE:{"name":"string","profession":"string","sideIncome":["list"],"goals":[{"name":"string","target":50000,"monthlyAdd":1500,"deadline":"Dec 2026","icon":"✈️","color":"cyan"}],"personality":"string","welcomeNote":"short welcome message"}

Goals array must have 2-3 entries with real numbers the user mentioned. Use these icons: ✈️ travel, 🛡️ emergency, 📈 investment, 💻 tech, 🏠 home, 🎓 education.
Colors: cyan, purple, pink, gold, success, orange.

CRITICAL: Speak directly to the user as a warm, human-like anime companion. Do NOT output any system headers, comments, wrappers, tags, or prefixes (like "// Start Onboarding Sequence //" or "Response:"). Start by greeting them warmly.`;

export default function Onboarding() {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState(state.geminiKey || '');
  const [keyEntered, setKeyEntered] = useState(false);
  const bottomRef = useRef(null);
  const conversationRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // If gemini key already saved, auto-start onboarding chat
  useEffect(() => {
    if (state.geminiKey && !keyEntered) {
      setGeminiKey(state.geminiKey);
      setKeyEntered(true);
      setLoading(true);
      callGemini(state.geminiKey, [{ role: 'user', parts: [{ text: 'Start the onboarding.' }] }])
        .then(aiMsg => {
          conversationRef.current = [{ role: 'model', parts: [{ text: aiMsg }] }];
          setMessages([{ role: 'ai', text: aiMsg }]);
        })
        .catch((e) => {
          console.error("Failed to auto-start onboarding chat:", e);
          setKeyEntered(false);
        })
        .finally(() => setLoading(false));
    }
  }, [state.geminiKey]);

  const callGemini = async (key, history) => {
    const data = await callAI({
      systemInstruction: ONBOARDING_PROMPT,
      contents: history,
      temperature: 0.8,
      maxTokens: 400,
      key,
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  const startChat = async () => {
    if (!geminiKey.trim()) return;
    dispatch({ type: 'SET_GEMINI_KEY', payload: geminiKey });
    setKeyEntered(true);
    setLoading(true);
    try {
      const aiMsg = await callGemini(geminiKey, [{ role: 'user', parts: [{ text: 'Start the onboarding.' }] }]);
      conversationRef.current = [{ role: 'model', parts: [{ text: aiMsg }] }];
      setMessages([{ role: 'ai', text: aiMsg }]);
    } catch (e) {
      setKeyEntered(false);
      const msg = e.message || '';
      if (msg.includes('overloaded') || msg.includes('503')) alert('AI Service overloaded. Wait 1-2 min and try again.');
      else if (msg.includes('401') || msg.includes('403') || msg.includes('API key') || msg.includes('Credentials')) alert('Invalid API key. Check at openrouter.ai/keys');
      else alert('Connection failed: ' + msg);
    } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    conversationRef.current.push({ role: 'user', parts: [{ text: userText }] });

    try {
      const aiText = await callGemini(state.geminiKey || geminiKey, conversationRef.current);
      conversationRef.current.push({ role: 'model', parts: [{ text: aiText }] });

      if (aiText.includes('PROFILE_COMPLETE:')) {
        const jsonStr = aiText.split('PROFILE_COMPLETE:')[1].trim();
        const profile = JSON.parse(jsonStr);

        // Show welcome message
        setMessages(prev => [...prev, { role: 'ai', text: profile.welcomeNote + " Generating your custom theme..." }]);

        // Save gemini key
        dispatch({ type: 'SET_GEMINI_KEY', payload: geminiKey || state.geminiKey });

        // Update goals from onboarding if provided
        if (profile.goals && profile.goals.length > 0) {
          const goals = profile.goals.map((g, i) => ({
            id: Date.now() + i,
            name: g.name,
            target: g.target || 50000,
            saved: 0,
            monthlyAdd: g.monthlyAdd || 1000,
            deadline: g.deadline || 'Dec 2027',
            icon: g.icon || '🎯',
            color: g.color || 'purple',
            status: 'On Track',
          }));
          dispatch({ type: 'SET_GOALS', payload: goals });
          if (state.sheetsConfig?.proxyUrl && state.user?.email) {
            writeGoals(state.sheetsConfig.proxyUrl, state.user.email, goals).catch(() => {});
          }
        }

        // Write to AIMemory if proxy is connected
        if (state.sheetsConfig?.proxyUrl && state.user?.email) {
          try {
            await writeMemory(state.sheetsConfig.proxyUrl, state.user.email, 'Profile',
              `Name: ${profile.name} | Profession: ${profile.profession} | Goals: ${profile.goals?.map(g => g.name).join(', ')} | Personality: ${profile.personality}`);
          } catch (e) {}
        }

        // Generate Theme
        let generatedTheme = null;
        try {
          const vibe = `A custom theme for a ${profile.profession || 'professional'} who is a ${profile.personality || 'saver'} named ${profile.name}.`;
          generatedTheme = await generateThemeFromVibe(geminiKey || state.geminiKey, vibe);
        } catch (themeErr) {
          console.error("Failed to generate theme:", themeErr);
        }

        if (!generatedTheme) {
          const prof = (profile.profession || '').toLowerCase();
          if (prof.includes('teacher') || prof.includes('academic') || prof.includes('professor') || prof.includes('educator')) {
            generatedTheme = THEME_PRESETS.teacher;
          } else if (prof.includes('designer') || prof.includes('artist') || prof.includes('sakura') || prof.includes('blossom')) {
            generatedTheme = THEME_PRESETS.sakura;
          } else if (prof.includes('coder') || prof.includes('hacker') || prof.includes('developer') || prof.includes('tech') || prof.includes('engineer')) {
            generatedTheme = THEME_PRESETS.cyberpunk;
          } else {
            generatedTheme = THEME_PRESETS.freelancer;
          }
        }

        profile.theme = generatedTheme;

        // Complete onboarding after 2s
        setTimeout(() => {
          dispatch({ type: 'SET_ONBOARDED', payload: profile });
        }, 2000);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
      }
    } catch (e) {
      const msg = e.message || '';
      setMessages(prev => [...prev, { role: 'ai', text: msg.includes('overloaded') ? '⚠️ Gemini overloaded, try again in a moment.' : 'Something went wrong. Try again.' }]);
    } finally { setLoading(false); }
  };

 const skipOnboarding = () => {
  if (geminiKey) {
    dispatch({
      type: 'SET_GEMINI_KEY',
      payload: geminiKey
    });
  }

  dispatch({
    type: 'SET_ONBOARDED',
    payload: {
      name: '',
      profession: '',
      goals: [],
      personality: '',
      welcomeNote: 'Welcome to Financial OS! 🚀',
      theme: THEME_PRESETS.cyberpunk
    }
  });
};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', marginBottom: '14px', boxShadow: '0 0 40px #7c3aed40', animation: 'bounceIn 0.6s ease-out' }}>
            <Zap size={30} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '26px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>FINANCIAL OS</h1>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', letterSpacing: '2px' }}>金融システム — Your Personal Finance AI</div>
        </div>

        {!keyEntered ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', color: '#a78bfa', marginBottom: '6px' }}>LET'S GET STARTED</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>Add your free OpenRouter API key to power the AI features.</p>
            <input style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              type="password" placeholder="Your OpenRouter API key..."
              value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startChat()} />
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer"
              style={{ fontSize: '12px', color: '#06b6d4', display: 'block', marginBottom: '18px' }}>
              → Get free OpenRouter API key (30 seconds)
            </a>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={startChat} disabled={!geminiKey.trim() || loading}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: !geminiKey.trim() ? 0.5 : 1 }}>
                {loading ? 'Connecting...' : 'Continue →'}
              </button>
              <button onClick={skipOnboarding}
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', overflow: 'hidden', height: '500px', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.3s ease-out' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#a78bfa', fontWeight: 700 }}>TELL ME ABOUT YOURSELF</div>
              <div style={{ fontSize: '10px', color: '#334155', fontFamily: 'monospace' }}>自己紹介 — Quick intro so I can personalize everything</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                  {msg.role === 'ai' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={12} color="white" />
                    </div>
                  )}
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'var(--bg-main)',
                    border: msg.role === 'ai' ? '1px solid var(--border-color)' : 'none',
                    fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5', animation: 'scaleIn 0.2s ease-out' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={12} color="white" />
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader size={12} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: '#475569' }}>thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  placeholder="Type your answer..." value={input}
                  onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                <button onClick={sendMessage} disabled={!input.trim() || loading}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', cursor: 'pointer', opacity: !input.trim() ? 0.5 : 1 }}>
                  <Send size={16} />
                </button>
              </div>
              <button onClick={skipOnboarding} style={{ width: '100%', marginTop: '8px', background: 'none', border: 'none', color: '#334155', fontSize: '11px', cursor: 'pointer' }}>
                Skip intro and go straight to dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
