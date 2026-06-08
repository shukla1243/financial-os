import React from 'react';
import { ArrowDown, ArrowRight, BarChart3, Bot, BrainCircuit, Check, Database, Layers3, Quote, ShieldCheck, Sparkles, Target, Zap } from 'lucide-react';

const SYSTEMS = [
  { id: '01', title: 'Living dashboard', copy: 'A command center that turns income, spending, goals, and health into one readable system.', icon: Layers3 },
  { id: '02', title: 'Conscious companion', copy: 'An AI layer that remembers only your isolated context and helps the OS evolve around you.', icon: BrainCircuit },
  { id: '03', title: 'Self-building modules', copy: 'Log real life and Financial OS can create focused systems for vehicles, travel, habits, and more.', icon: Bot },
  { id: '04', title: 'Your data realm', copy: 'Every account receives its own workspace, settings, memory, categories, and financial history.', icon: Database },
];

export default function Login({ onEnter }) {

  return (
    <div className="os-landing">
      <nav className="landing-nav">
        <div className="landing-brand"><span><Zap size={16} /></span><strong>FINANCIAL OS</strong><small>YOUR LIVING MONEY SYSTEM</small></div>
        <div className="landing-nav__links"><a href="#systems">Systems</a><a href="#evolution">Evolution</a><a href="#privacy">Isolation</a></div>
        <button className="landing-login-button" onClick={onEnter}>Enter your OS<ArrowRight size={14} /></button>
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
              <button className="landing-primary" onClick={onEnter}>Initialize your OS<ArrowRight size={16} /></button>
              <button className="landing-secondary" onClick={() => document.getElementById('systems')?.scrollIntoView({ behavior: 'smooth' })}>See the system<ArrowDown size={15} /></button>
            </div>
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

        <section className="landing-showcase">
          <article>
            <div className="landing-showcase__copy"><span>AI FINANCE COACH</span><h2>A companion that understands context.</h2><p>Ask questions naturally, log real-life events, and receive concise guidance grounded in your own isolated financial world.</p></div>
            <div className="landing-mockup landing-mockup--coach"><div><Bot size={18} /><strong>COMPANION SIGNAL</strong></div><p>Your food spending is stable. Protect the remaining buffer by keeping transport below ₹2,000 this week.</p><span>Memory isolated · Context live</span></div>
          </article>
          <article>
            <div className="landing-mockup landing-mockup--analytics"><BarChart3 size={18} /><div><i style={{height:'52%'}}/><i style={{height:'78%'}}/><i style={{height:'43%'}}/><i style={{height:'92%'}}/><i style={{height:'68%'}}/></div><span>LIVE MONTHLY SIGNAL</span></div>
            <div className="landing-showcase__copy"><span>ANALYTICS</span><h2>See the story behind every number.</h2><p>Budgets, spending patterns, income, savings rate, and financial health become an understandable visual narrative.</p></div>
          </article>
          <article>
            <div className="landing-showcase__copy"><span>GOAL TRACKING</span><h2>Turn plans into active quests.</h2><p>Build savings goals, track progress, and keep the next milestone visible across your living dashboard.</p></div>
            <div className="landing-mockup landing-mockup--goal"><Target size={20}/><strong>JAPAN CHAPTER</strong><em>68%</em><div><span/></div><small>₹68,000 of ₹100,000 secured</small></div>
          </article>
        </section>

        <section className="landing-evolution" id="evolution">
          <div className="landing-evolution__copy"><span>THE OS EVOLVES WITH YOU</span><h2>Log life.<br />Unlock systems.</h2><p>Tell the AI about fuel, a trip, a goal, or a new routine. Financial OS connects the transaction to its financial context and can create a dedicated module when the pattern deserves one.</p><button className="landing-primary" onClick={onEnter}>Start your first chapter<ArrowRight size={16} /></button></div>
          <div className="landing-evolution__stack">
            <article><em>INPUT</em><strong>Fuel · 6 June · 9,890 km</strong><span>Natural language activity detected</span></article>
            <article><em>INTELLIGENCE</em><strong>Transport category + Vehicle OS</strong><span>Context classified and specialized</span></article>
            <article><em>OUTPUT</em><strong>Tracker updated. Module evolved.</strong><span>One action, connected everywhere</span></article>
          </div>
        </section>

        <section className="landing-privacy" id="privacy">
          <ShieldCheck size={30} /><span>YOUR PRIVATE REALM</span><h2>No shared memory.<br />No borrowed identity.</h2><p>Each user receives an isolated workspace. Your financial system is built from your own activity, goals, settings, and choices.</p><button className="landing-login-button" onClick={onEnter}>Enter Financial OS<ArrowRight size={14} /></button>
        </section>

        <section className="landing-testimonials">
          <header><span>BUILT FOR REAL FINANCIAL LIVES</span><h2>A calmer relationship with money.</h2></header>
          <div>{[
            ['The dashboard finally makes my month feel understandable instead of overwhelming.', 'Early access user'],
            ['Logging naturally and seeing a dedicated system evolve from it feels genuinely useful.', 'Independent professional'],
            ['I can see the buffer, goals, and spending story without opening five different tools.', 'Financial OS tester'],
          ].map(([quote, role]) => <article key={quote}><Quote size={18}/><p>{quote}</p><span>{role}</span></article>)}</div>
        </section>

        <section className="landing-pricing" id="pricing">
          <header><span>CHOOSE YOUR SYSTEM</span><h2>Start free. Direct your world with Pro.</h2></header>
          <div>
            <article><em>FREE</em><h3>Core OS</h3><strong>₹0</strong><p>Your onboarding-generated persona theme and complete financial workspace.</p>{['Living dashboard','AI finance coach','Analytics and goals','Isolated workspace'].map(item=><span key={item}><Check size={13}/>{item}</span>)}<button className="landing-secondary" onClick={onEnter}>Initialize free</button></article>
            <article className="is-featured"><em>PRO</em><h3>Visual Director</h3><strong>Admin enabled</strong><p>Everything in Core plus complete visual world customization.</p>{['AI-generated full UI themes','Six premium theme loadouts','Advanced motion and layout direction','All future visual personas'].map(item=><span key={item}><Check size={13}/>{item}</span>)}<button className="landing-primary" onClick={onEnter}>Enter Financial OS</button></article>
          </div>
        </section>

        <section className="landing-faq">
          <header><span>FAQ</span><h2>Before you initialize.</h2></header>
          <div>{[
            ['Will returning users still see this page?', 'Yes. The public landing page always opens first. Your session restores quietly in the background, then you choose when to continue.'],
            ['Is my theme shared with other users?', 'No. Your theme, financial data, AI memory, settings, and generated modules remain scoped to your own workspace.'],
            ['What is included for free?', 'Every user receives the complete Financial OS and their onboarding-generated persona theme. Pro unlocks theme switching and the AI Visual Director.'],
            ['Can a generated theme change financial logic?', 'No. Themes can direct the complete visual language, but they cannot inject code, alter APIs, or change your financial data logic.'],
          ].map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="landing-final-cta"><Sparkles size={24}/><span>YOUR NEXT FINANCIAL CHAPTER</span><h2>Make your money system feel alive.</h2><p>Initialize a private Financial OS built around your goals, activity, and future.</p><button className="landing-primary" onClick={onEnter}>Enter your OS<ArrowRight size={16}/></button></section>
      </main>
    </div>
  );
}
