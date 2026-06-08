/**
 * UNIVERSAL DYNAMIC THEME ENGINE
 * Supports dynamic CSS injection and AI theme generation.
 */
import { callAI } from './aiService';
import { getThemeKey } from './userStorage';
import { extractJsonObject } from './aiJson';

export const THEME_PRESETS = {
  shadowMonarch: {
    themeName: 'Shadow Monarch', layout: 'left-sidebar', cursor: 'terminal', decorations: 'shadow-particles',
    surfaceStyle: 'hologram', panelShape: 'cut-corner', motionStyle: 'cinematic', contentDensity: 'spacious', heroStyle: 'orbital', navStyle: 'rail', glowStrength: 'high',
    borderStyle: 'solid', bgMain: '#05030c', bgCard: 'rgba(18, 10, 37, 0.72)', bgSidebar: 'rgba(7, 4, 18, 0.96)',
    borderColor: 'rgba(168, 85, 247, 0.25)', primaryColor: '#a855f7', accentColor: '#7c3aed',
    textMain: '#f5f3ff', textMuted: '#8b82a8', fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '14px', shadowIntensity: 'rgba(126, 34, 206, 0.26)',
  },
  tokyoNeon: {
    themeName: 'Tokyo Neon', layout: 'left-sidebar', cursor: 'precision', decorations: 'neon-city',
    surfaceStyle: 'glass', panelShape: 'sharp', motionStyle: 'pulse', contentDensity: 'balanced', heroStyle: 'editorial', navStyle: 'dock', glowStrength: 'high',
    borderStyle: 'solid', bgMain: '#03040b', bgCard: 'rgba(8, 18, 35, 0.72)', bgSidebar: 'rgba(3, 8, 20, 0.96)',
    borderColor: 'rgba(34, 211, 238, 0.24)', primaryColor: '#22d3ee', accentColor: '#f472b6',
    textMain: '#ecfeff', textMuted: '#71869b', fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '10px', shadowIntensity: 'rgba(34, 211, 238, 0.2)',
  },
  crimsonAkatsuki: {
    themeName: 'Crimson Akatsuki', layout: 'left-sidebar', cursor: 'precision', decorations: 'crimson-clouds',
    surfaceStyle: 'solid', panelShape: 'cut-corner', motionStyle: 'cinematic', contentDensity: 'compact', heroStyle: 'editorial', navStyle: 'rail', glowStrength: 'high',
    borderStyle: 'solid', bgMain: '#080204', bgCard: 'rgba(35, 7, 12, 0.74)', bgSidebar: 'rgba(18, 3, 7, 0.96)',
    borderColor: 'rgba(239, 68, 68, 0.24)', primaryColor: '#ef4444', accentColor: '#fb7185',
    textMain: '#fff1f2', textMuted: '#a4777d', fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '8px', shadowIntensity: 'rgba(220, 38, 38, 0.22)',
  },
  oceanDragon: {
    themeName: 'Ocean Dragon', layout: 'left-sidebar', cursor: 'precision', decorations: 'water-ripples',
    surfaceStyle: 'glass', panelShape: 'soft', motionStyle: 'float', contentDensity: 'spacious', heroStyle: 'orbital', navStyle: 'dock', glowStrength: 'medium',
    borderStyle: 'solid', bgMain: '#020b18', bgCard: 'rgba(5, 29, 53, 0.72)', bgSidebar: 'rgba(2, 15, 31, 0.96)',
    borderColor: 'rgba(34, 211, 238, 0.23)', primaryColor: '#06b6d4', accentColor: '#38bdf8',
    textMain: '#ecfeff', textMuted: '#6c8ca1', fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '16px', shadowIntensity: 'rgba(6, 182, 212, 0.22)',
  },
  sakuraDream: {
    themeName: 'Sakura Dream', layout: 'left-sidebar', cursor: 'sakura', decorations: 'falling-sakura',
    surfaceStyle: 'paper', panelShape: 'soft', motionStyle: 'calm', contentDensity: 'spacious', heroStyle: 'minimal', navStyle: 'dock', glowStrength: 'low',
    borderStyle: 'solid', bgMain: '#160811', bgCard: 'rgba(48, 16, 36, 0.72)', bgSidebar: 'rgba(28, 8, 20, 0.96)',
    borderColor: 'rgba(244, 114, 182, 0.25)', primaryColor: '#f472b6', accentColor: '#fda4af',
    textMain: '#fff1f5', textMuted: '#be91a7', fontFamily: "'Outfit', 'Inter', sans-serif",
    cardRadius: '20px', shadowIntensity: 'rgba(244, 114, 182, 0.2)',
  },
  cyberHunter: {
    themeName: 'Cyber Hunter', layout: 'left-sidebar', cursor: 'terminal', decorations: 'hud-grid',
    surfaceStyle: 'hologram', panelShape: 'sharp', motionStyle: 'pulse', contentDensity: 'compact', heroStyle: 'command', navStyle: 'rail', glowStrength: 'high',
    borderStyle: 'solid', bgMain: '#01070d', bgCard: 'rgba(3, 24, 39, 0.76)', bgSidebar: 'rgba(1, 13, 24, 0.97)',
    borderColor: 'rgba(14, 165, 233, 0.25)', primaryColor: '#0ea5e9', accentColor: '#22d3ee',
    textMain: '#f0f9ff', textMuted: '#68889c', fontFamily: "'Orbitron', 'Inter', sans-serif",
    cardRadius: '4px', shadowIntensity: 'rgba(14, 165, 233, 0.22)',
  },
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

export function chooseLatestTheme(localTheme, serverTheme) {
  if (!localTheme) return serverTheme || null;
  if (!serverTheme) return localTheme;
  const localTime = Date.parse(localTheme.updatedAt || '') || 0;
  const serverTime = Date.parse(serverTheme.updatedAt || '') || 0;
  if (localTime === serverTime) return serverTheme;
  return localTime > serverTime ? localTheme : serverTheme;
}

export function normalizeTheme(theme, fallback = THEME_PRESETS.freelancer) {
  if (!theme || typeof theme !== 'object') theme = {};
  const allowedLayouts = ['left-sidebar', 'right-sidebar', 'topbar'];
  const allowedCursors = ['chalk', 'terminal', 'sakura', 'precision', 'normal'];
  const allowedDecorations = ['scanlines', 'blueprint-grid', 'falling-sakura', 'chalkboard-dust', 'shadow-particles', 'neon-city', 'crimson-clouds', 'water-ripples', 'hud-grid', 'none'];
  const allowedSurfaces = ['glass', 'solid', 'paper', 'hologram'];
  const allowedShapes = ['rounded', 'sharp', 'cut-corner', 'soft'];
  const allowedMotion = ['calm', 'float', 'pulse', 'cinematic'];
  const allowedDensity = ['compact', 'balanced', 'spacious'];
  const allowedHeroStyles = ['command', 'editorial', 'orbital', 'minimal'];
  const allowedNavStyles = ['rail', 'dock', 'bar'];
  const visualFallback = {
    surfaceStyle: 'glass',
    panelShape: 'rounded',
    motionStyle: 'float',
    contentDensity: 'balanced',
    heroStyle: 'command',
    navStyle: fallback.layout === 'topbar' ? 'bar' : 'rail',
    glowStrength: 'medium',
  };
  return {
    ...fallback,
    ...visualFallback,
    ...theme,
    layout: allowedLayouts.includes(theme.layout) ? theme.layout : fallback.layout,
    cursor: allowedCursors.includes(theme.cursor) ? theme.cursor : fallback.cursor,
    decorations: allowedDecorations.includes(theme.decorations) ? theme.decorations : fallback.decorations,
    surfaceStyle: allowedSurfaces.includes(theme.surfaceStyle) ? theme.surfaceStyle : visualFallback.surfaceStyle,
    panelShape: allowedShapes.includes(theme.panelShape) ? theme.panelShape : visualFallback.panelShape,
    motionStyle: allowedMotion.includes(theme.motionStyle) ? theme.motionStyle : visualFallback.motionStyle,
    contentDensity: allowedDensity.includes(theme.contentDensity) ? theme.contentDensity : visualFallback.contentDensity,
    heroStyle: allowedHeroStyles.includes(theme.heroStyle) ? theme.heroStyle : visualFallback.heroStyle,
    navStyle: allowedNavStyles.includes(theme.navStyle) ? theme.navStyle : visualFallback.navStyle,
    glowStrength: ['low', 'medium', 'high'].includes(theme.glowStrength) ? theme.glowStrength : visualFallback.glowStrength,
  };
}

/**
 * Injects a stylesheet into the document head dynamically using theme properties.
 */
export function applyDynamicTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  theme = normalizedTheme;
  let styleEl = document.getElementById('dynamic-theme-injected');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme-injected';
    document.head.appendChild(styleEl);
  }

  const borderStyle = theme.borderStyle || 'solid';
  const root = document.documentElement;
  root.dataset.surface = theme.surfaceStyle;
  root.dataset.panelShape = theme.panelShape;
  root.dataset.motion = theme.motionStyle;
  root.dataset.density = theme.contentDensity;
  root.dataset.hero = theme.heroStyle;
  root.dataset.nav = theme.navStyle;
  root.dataset.glow = theme.glowStrength;

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
      --theme-space: ${theme.contentDensity === 'compact' ? '12px' : theme.contentDensity === 'spacious' ? '24px' : '18px'};
      --theme-glow: ${theme.glowStrength === 'low' ? '0.55' : theme.glowStrength === 'high' ? '1.45' : '1'};
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
  if (!key) return null;
  try {
    let val = localStorage.getItem(key);
    if (!val) {
      val = localStorage.getItem(`financial_os_theme_${userId}`);
      if (val) {
        localStorage.setItem(key, val);
        localStorage.removeItem(`financial_os_theme_${userId}`);
      }
    }
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
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
You are selecting from a safe visual grammar. Never return code, CSS, HTML, URLs, scripts, event handlers, or application logic.

Respond ONLY with a JSON object matching this structure (no markdown, no backticks, no comments):
{
  "themeName": "short name for the generated theme (e.g. Neon Hacker)",
  "layout": "one of: 'left-sidebar', 'right-sidebar', 'topbar'",
  "cursor": "one of: 'chalk', 'terminal', 'sakura', 'precision', 'normal'",
  "decorations": "one of: 'scanlines', 'blueprint-grid', 'falling-sakura', 'chalkboard-dust', 'shadow-particles', 'neon-city', 'crimson-clouds', 'water-ripples', 'hud-grid', 'none'",
  "surfaceStyle": "one of: 'glass', 'solid', 'paper', 'hologram'",
  "panelShape": "one of: 'rounded', 'sharp', 'cut-corner', 'soft'",
  "motionStyle": "one of: 'calm', 'float', 'pulse', 'cinematic'",
  "contentDensity": "one of: 'compact', 'balanced', 'spacious'",
  "heroStyle": "one of: 'command', 'editorial', 'orbital', 'minimal'",
  "navStyle": "one of: 'rail', 'dock', 'bar'",
  "glowStrength": "one of: 'low', 'medium', 'high'",
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
      maxTokens: 800,
      key: geminiKey
    });
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return normalizeTheme(extractJsonObject(raw));
  } catch (err) {
    console.error('[themeEngine] Failed to generate AI theme', err);
    return null;
  }
}
