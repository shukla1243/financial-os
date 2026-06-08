/**
 * UNIVERSAL DYNAMIC THEME ENGINE
 * Supports dynamic CSS injection and AI theme generation.
 */
import { callAI } from './aiService';
import { getThemeKey } from './userStorage';
import { extractJsonObject } from './aiJson';

export const THEME_PRESETS = {
  cyberpunk: {
    themeName: 'Cyberpunk Neon',
    layout: 'left-sidebar',
    cursor: 'terminal',
    decorations: 'scanlines',
    borderStyle: 'solid',
    bgMain: '#0a0a14',
    bgCard: '#12121f',
    bgSidebar: '#0d0d1a',
    borderColor: '#1e1e35',
    primaryColor: '#7c3aed',
    accentColor: '#06b6d4',
    textMain: '#e2e8f0',
    textMuted: '#64748b',
    fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '12px',
    shadowIntensity: 'rgba(124, 58, 237, 0.15)',
  },
  freelancer: {
    themeName: 'Freelancer Workspace',
    layout: 'topbar',
    cursor: 'precision',
    decorations: 'blueprint-grid',
    borderStyle: 'solid',
    bgMain: '#0f172a',
    bgCard: '#1e293b',
    bgSidebar: '#0f172a',
    borderColor: '#334155',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    fontFamily: "'Inter', sans-serif",
    cardRadius: '8px',
    shadowIntensity: 'rgba(59, 130, 246, 0.1)',
  },
  teacher: {
    themeName: 'Chalkboard Classroom',
    layout: 'right-sidebar',
    cursor: 'chalk',
    decorations: 'chalkboard-dust',
    borderStyle: 'dashed',
    bgMain: '#142820', // Chalkboard Green
    bgCard: '#1a3c2f',
    bgSidebar: '#142820',
    borderColor: 'rgba(255,255,255,0.35)',
    primaryColor: '#fbbf24', // Yellow chalk
    accentColor: '#ffffff', // White chalk
    textMain: '#f0fdf4',
    textMuted: '#86efac',
    fontFamily: "'Comic Sans MS', cursive, sans-serif",
    cardRadius: '4px',
    shadowIntensity: 'rgba(251, 191, 36, 0.05)',
  },
  minimalist: {
    themeName: 'Clean Minimalist',
    layout: 'left-sidebar',
    cursor: 'normal',
    decorations: 'none',
    borderStyle: 'solid',
    bgMain: '#fafafa',
    bgCard: '#ffffff',
    bgSidebar: '#f4f4f5',
    borderColor: '#e4e4e7',
    primaryColor: '#18181b',
    accentColor: '#71717a',
    textMain: '#18181b',
    textMuted: '#a1a1aa',
    fontFamily: "'Inter', sans-serif",
    cardRadius: '6px',
    shadowIntensity: 'rgba(24, 24, 27, 0.03)',
  },
  sakura: {
    themeName: 'Sakura Blossom',
    layout: 'left-sidebar',
    cursor: 'sakura',
    decorations: 'falling-sakura',
    borderStyle: 'solid',
    bgMain: '#fff5f7',
    bgCard: '#ffe4e6',
    bgSidebar: '#fecdd3',
    borderColor: '#fda4af',
    primaryColor: '#db2777',
    accentColor: '#f43f5e',
    textMain: '#4c0519',
    textMuted: '#9f1239',
    fontFamily: "'Outfit', sans-serif",
    cardRadius: '16px',
    shadowIntensity: 'rgba(219, 39, 119, 0.08)',
  }
};

export function personalizeTheme(theme, seed) {
  const value = String(seed || 'financial-os');
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    ...theme,
    primaryColor: `hsl(${hue}, 72%, 58%)`,
    accentColor: `hsl(${(hue + 47) % 360}, 78%, 55%)`,
    shadowIntensity: `hsla(${hue}, 72%, 45%, 0.16)`,
  };
}

export function normalizeTheme(theme, fallback = THEME_PRESETS.freelancer) {
  if (!theme || typeof theme !== 'object') return { ...fallback };
  const allowedLayouts = ['left-sidebar', 'right-sidebar', 'topbar'];
  const allowedCursors = ['chalk', 'terminal', 'sakura', 'precision', 'normal'];
  const allowedDecorations = ['scanlines', 'blueprint-grid', 'falling-sakura', 'chalkboard-dust', 'none'];
  return {
    ...fallback,
    ...theme,
    layout: allowedLayouts.includes(theme.layout) ? theme.layout : fallback.layout,
    cursor: allowedCursors.includes(theme.cursor) ? theme.cursor : fallback.cursor,
    decorations: allowedDecorations.includes(theme.decorations) ? theme.decorations : fallback.decorations,
  };
}

/**
 * Injects a stylesheet into the document head dynamically using theme properties.
 */
export function applyDynamicTheme(theme) {
  let styleEl = document.getElementById('dynamic-theme-injected');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme-injected';
    document.head.appendChild(styleEl);
  }

  const borderStyle = theme.borderStyle || 'solid';

  let cursorCss = '';
  if (theme.cursor === 'chalk') {
    cursorCss = `* { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><rect x='2' y='8' width='16' height='8' rx='2' fill='white' transform='rotate(-30 10 12)'/><line x1='12' y1='6' x2='18' y2='10' stroke='%23ffffff' stroke-width='2'/></svg>") 0 0, auto !important; }`;
  } else if (theme.cursor === 'terminal') {
    cursorCss = `* { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><rect x='0' y='0' width='8' height='14' fill='%2339ff14'/></svg>") 0 0, auto !important; }`;
  } else if (theme.cursor === 'sakura') {
    cursorCss = `* { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path d='M12 2C8.5 7 4 10 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8c0-4-4.5-7-8-12z' fill='%23db2777'/></svg>") 10 10, auto !important; }`;
  } else if (theme.cursor === 'precision') {
    cursorCss = `* { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'><circle cx='8' cy='8' r='3' fill='%233b82f6'/><circle cx='8' cy='8' r='6' fill='none' stroke='%233b82f6' stroke-width='1.5' opacity='0.6'/></svg>") 8 8, auto !important; }`;
  }

  styleEl.innerHTML = `
    :root {
      --bg-main: ${theme.bgMain || '#0a0a14'};
      --bg-card: ${theme.bgCard || '#12121f'};
      --bg-sidebar: ${theme.bgSidebar || '#0d0d1a'};
      --border-color: ${theme.borderColor || '#1e1e35'};
      --primary-color: ${theme.primaryColor || '#7c3aed'};
      --accent-color: ${theme.accentColor || '#06b6d4'};
      --text-main: ${theme.textMain || '#e2e8f0'};
      --text-muted: ${theme.textMuted || '#64748b'};
      --font-family: ${theme.fontFamily || "'Inter', sans-serif"};
      --card-radius: ${theme.cardRadius || '12px'};
      --shadow-intensity: ${theme.shadowIntensity || 'rgba(124, 58, 237, 0.15)'};
    }

    body {
      background: var(--bg-main) !important;
      color: var(--text-main) !important;
      font-family: var(--font-family) !important;
      transition: background 0.5s ease, color 0.5s ease;
    }

    ${cursorCss}

    .card {
      background: var(--bg-card) !important;
      border: 1px ${borderStyle} var(--border-color) !important;
      border-radius: var(--card-radius) !important;
      box-shadow: 0 4px 20px var(--shadow-intensity) !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }

    input, select, textarea, button {
      font-family: var(--font-family) !important;
    }

    input, select, textarea {
      background: var(--bg-main) !important;
      border: 1px ${borderStyle} var(--border-color) !important;
      color: var(--text-main) !important;
      border-radius: calc(var(--card-radius) * 0.7) !important;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color)) !important;
      border-radius: calc(var(--card-radius) * 0.7) !important;
    }

    .btn-ghost {
      color: var(--primary-color) !important;
      border-color: var(--border-color) !important;
      border-radius: calc(var(--card-radius) * 0.7) !important;
    }

    /* Style the select options to prevent unreadable dark text on dark background default styling */
    select option {
      background: var(--bg-card) !important;
      color: var(--text-main) !important;
    }
  `;
}

/**
 * Persist and retrieve theme configuration per email
 */
export function getStoredTheme(userId) {
  const key = getThemeKey(userId);
  if (!key) return THEME_PRESETS.cyberpunk;
  try {
    let val = localStorage.getItem(key);
    if (!val) {
      val = localStorage.getItem(`financial_os_theme_${userId}`);
      if (val) {
        localStorage.setItem(key, val);
        localStorage.removeItem(`financial_os_theme_${userId}`);
      }
    }
    return val ? JSON.parse(val) : THEME_PRESETS.cyberpunk;
  } catch (e) {
    return THEME_PRESETS.cyberpunk;
  }
}

export function setStoredTheme(userId, themeObj) {
  const key = getThemeKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(themeObj));
  } catch (e) {}
}

export function clearStoredTheme(userId) {
  const key = getThemeKey(userId);
  if (key) localStorage.removeItem(key);
}

/**
 * Ask Gemini to generate a custom, harmonious dynamic theme JSON object based on a user vibe description.
 */
export async function generateThemeFromVibe(geminiKey, vibeDescription) {
  const prompt = `You are a dynamic UI theme generator. The user wants a theme with the following vibe: "${vibeDescription}".
Create a harmonious, premium dark-mode or light-mode visual design based on their prompt.
Verify that the primary and accent colors contrast well with the backgrounds, and text remains highly readable.

Respond ONLY with a JSON object matching this structure (no markdown, no backticks, no comments):
{
  "themeName": "short name for the generated theme (e.g. Neon Hacker)",
  "layout": "one of: 'left-sidebar', 'right-sidebar', 'topbar'",
  "cursor": "one of: 'chalk', 'terminal', 'sakura', 'precision', 'normal'",
  "decorations": "one of: 'scanlines', 'blueprint-grid', 'falling-sakura', 'chalkboard-dust', 'none'",
  "borderStyle": "one of: 'solid', 'dashed', 'double'",
  "bgMain": "hex color (main page background)",
  "bgCard": "hex color (card background)",
  "bgSidebar": "hex color (sidebar background)",
  "borderColor": "hex color (borders/divider lines)",
  "primaryColor": "hex color (primary buttons, active highlights)",
  "accentColor": "hex color (KPI values, success highlights)",
  "textMain": "hex color (main text color)",
  "textMuted": "hex color (subtitles/muted label colors)",
  "fontFamily": "font-family string (e.g. 'Courier New', 'Inter', 'monospace', 'serif', 'cursive')",
  "cardRadius": "radius string (e.g. '4px', '8px', '16px')",
  "shadowIntensity": "rgba color with opacity (e.g. 'rgba(0,0,0,0.2)')"
}`;

  try {
    const data = await callAI({
      contents: prompt,
      temperature: 0.7,
      maxTokens: 500,
      key: geminiKey
    });
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return normalizeTheme(extractJsonObject(raw));
  } catch (err) {
    console.error('[themeEngine] Failed to generate AI theme', err);
    return null;
  }
}
