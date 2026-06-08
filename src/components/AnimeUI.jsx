import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export function AnimePanel({ children, className = '', accent = 'primary', style = {} }) {
  return (
    <section className={`anime-panel anime-panel--${accent} ${className}`} style={style}>
      <span className="anime-panel__corner anime-panel__corner--one" />
      <span className="anime-panel__corner anime-panel__corner--two" />
      {children}
    </section>
  );
}

export function SectionHeading({ eyebrow, title, note, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="section-heading__eyebrow">{eyebrow}</div>}
        <h2 className="section-heading__title">{title}</h2>
        {note && <p className="section-heading__note">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatPanel({ label, value, sub, icon: Icon, tone = 'cyan', delay = 0 }) {
  return (
    <AnimePanel accent={tone} className="stat-panel" style={{ '--entry-delay': `${delay}s` }}>
      <div className="stat-panel__header">
        <div className="stat-panel__label">{label}</div>
        {Icon && <div className={`stat-panel__icon stat-panel__icon--${tone}`}><Icon size={18} /></div>}
      </div>
      <div className={`stat-panel__value stat-panel__value--${tone}`}>{value}</div>
      <div className="stat-panel__sub">{sub}</div>
      <div className={`stat-panel__signal stat-panel__signal--${tone}`} />
    </AnimePanel>
  );
}

export function ActionButton({ children, onClick, secondary = false, icon = true, className = '' }) {
  return (
    <button onClick={onClick} className={`game-action ${secondary ? 'game-action--secondary' : ''} ${className}`}>
      <span>{children}</span>
      {icon && <ArrowUpRight size={15} />}
    </button>
  );
}

export function RankBadge({ score }) {
  const rank = score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  return (
    <div className={`rank-badge rank-badge--${rank.toLowerCase()}`}>
      <span className="rank-badge__label">CURRENT RANK</span>
      <strong>{rank}</strong>
      <Sparkles size={14} />
    </div>
  );
}

export function ProgressLine({ value, color = 'var(--primary-color)' }) {
  const boundedValue = Math.max(0, Math.min(Number(value) || 0, 100));
  return (
    <div className="game-progress">
      <div className="game-progress__fill" style={{ width: `${boundedValue}%`, background: color }} />
    </div>
  );
}
