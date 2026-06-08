import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Bot, BrainCircuit, Database, Layers3, ShieldCheck, Sparkles, Target, Zap } from 'lucide-react';
import { getAccessToken, getUserInfo } from '../services/googleAuth';

const SYSTEMS = [
  { id: '01', title: 'Living dashboard', copy: 'A command center that turns income, spending, goals, and health into one readable system.', icon: Layers3 },
  { id: '02', title: 'Conscious companion', copy: 'An AI layer that remembers only your isolated context and helps the OS evolve around you.', icon: BrainCircuit },
  { id: '03', title: 'Self-building modules', copy: 'Log real life and Financial OS can create focused systems for vehicles, travel, habits, and more.', icon: Bot },
  { id: '04', title: 'Your data realm', copy: 'Every account receives its own workspace, settings, memory, categories, and financial history.', icon: Database },
];

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await getAccessToken(true);
      const user = await getUserInfo();
      if (!user) throw new Error('Could not get user info');
      onLogin(user);
    } catch (e) {
      setError(e.message?.includes('access_denied')
        ? 'Access denied. Make sure you are added as a test user in Google Console.'
        : e.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="os-landing">
      <nav className="landing-nav">
        <div className="landing-brand"><span><Zap size={16} /></span><strong>FINANCIAL OS</strong><small>YOUR LIVING MONEY SYSTEM</small></div>
        <div className="landing-nav__links"><a href="#systems">Systems</a><a href="#evolution">Evolution</a><a href="#privacy">Isolation</a></div>
        <button className="landing-login-button" onClick={handleGoogleLogin} disabled={loading}>{loading ? 'Opening system...' : 'Enter your OS'}<ArrowRight size={14} /></button>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="landing-orbit landing-orbit--one" /><div className="landing-orbit landing-orbit--two" />
          <div className="landing-hero__rail landing-hero__rail--left"><span>INTELLIGENCE</span><span>ISOLATION</span><span>EVOLUTION</span></div>
          <div className="landing-hero__rail landing-hero__rail--right"><span>01</span><span>FINANCIAL CORE</span></div>
          <div className="landing-hero__copy">
            <div className="landing-kicker"><Sparkles size={13} /> A PERSONAL OPERATING SYSTEM FOR MONEY</div>
            <h1><span>YOUR MONEY.</span><strong>NOW ALIVE.</strong></h1>
            <p>Financial OS is not another tracker. It is a private, evolving command system that learns how your life moves and builds the tools you need next.</p>
            <div className="landing-hero__actions">
              <button className="landing-primary" onClick={handleGoogleLogin} disabled={loading}>{loading ? 'Connecting securely...' : 'Initialize your OS'}<ArrowRight size={16} /></button>
              <button className="landing-secondary" onClick={() => document.getElementById('systems')?.scrollIntoView({ behavior: 'smooth' })}>See the system<ArrowDown size={15} /></button>
            </div>
            {error && <div className="landing-error">{error}</div>}
          </div>
          <div className="landing-core" aria-hidden="true">
            <div className="landing-core__ring landing-core__ring--outer"><span /><span /><span /></div>
            <div className="landing-core__ring landing-core__ring--inner" />
            <div className="landing-core__center"><Zap size={42} /><strong>F/OS</strong><span>CORE ONLINE</span></div>
            <div className="landing-core__satellite landing-core__satellite--one"><Target size={15} /><span>GOALS</span></div>
            <div className="landing-core__satellite landing-core__satellite--two"><BrainCircuit size={15} /><span>MEMORY</span></div>
            <div className="landing-core__satellite landing-core__satellite--three"><ShieldCheck size={15} /><span>PRIVATE</span></div>
          </div>
          <div className="landing-ticker"><div>TRACK REAL LIFE · BUILD YOUR BUFFER · EVOLVE YOUR SYSTEM · OWN YOUR DATA · TRACK REAL LIFE · BUILD YOUR BUFFER · EVOLVE YOUR SYSTEM · OWN YOUR DATA ·</div></div>
        </section>

        <section className="landing-systems" id="systems">
          <header><div><span>EVERYTHING CONNECTED</span><h2>One OS. Every financial chapter.</h2></div><p>Your dashboard, AI memory, categories, goals, reports, and newly generated modules operate as one isolated system.</p></header>
          <div className="landing-system-grid">
            {SYSTEMS.map(({ id, title, copy, icon: Icon }) => <article key={id}><div><em>{id}</em><Icon size={22} /></div><h3>{title}</h3><p>{copy}</p><span>System module <ArrowRight size={12} /></span></article>)}
          </div>
        </section>

        <section className="landing-evolution" id="evolution">
          <div className="landing-evolution__copy"><span>THE OS EVOLVES WITH YOU</span><h2>Log life.<br />Unlock systems.</h2><p>Tell the AI about fuel, a trip, a goal, or a new routine. Financial OS connects the transaction to its financial context and can create a dedicated module when the pattern deserves one.</p><button className="landing-primary" onClick={handleGoogleLogin}>Start your first chapter<ArrowRight size={16} /></button></div>
          <div className="landing-evolution__stack">
            <article><em>INPUT</em><strong>Fuel · 6 June · 9,890 km</strong><span>Natural language activity detected</span></article>
            <article><em>INTELLIGENCE</em><strong>Transport category + Vehicle OS</strong><span>Context classified and specialized</span></article>
            <article><em>OUTPUT</em><strong>Tracker updated. Module evolved.</strong><span>One action, connected everywhere</span></article>
          </div>
        </section>

        <section className="landing-privacy" id="privacy">
          <ShieldCheck size={30} /><span>YOUR PRIVATE REALM</span><h2>No shared memory.<br />No borrowed identity.</h2><p>Each user receives an isolated workspace. Your financial system is built from your own activity, goals, settings, and choices.</p><button className="landing-login-button" onClick={handleGoogleLogin}>Enter Financial OS<ArrowRight size={14} /></button>
        </section>
      </main>
    </div>
  );
}
