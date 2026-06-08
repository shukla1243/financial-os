import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { PROXY_URL, GEMINI_KEY as DEFAULT_GEMINI_KEY } from '../config';
import {
  logExpense as proxyLogExpense,
  deleteExpense as proxyDeleteExpense,
  logIncome as proxyLogIncome,
  writeGoals,
  writeBills,
  writeMemory,
  loadAllFromProxy,
  addCategory as proxyAddCategory,
  proxyCheckUpdates,
  getUserStatus,
  getDynamicSheet,
  completeOnboarding as proxyCompleteOnboarding,
  saveConfig as proxySaveConfig,
} from '../services/proxyService';
import { autoLogExpenseToSections, runConsciousnessScan, readBlueprint } from '../services/consciousnessEngine';
import { resolveAllInvestments } from '../services/walletService';
import { clearLegacyStorage, getStableUserId, readUserState, writeUserState } from '../services/userStorage';
import { calculateFinancialHealth } from '../services/financialHealth';
import { isValidMemoryObservation } from '../services/memoryGuard';
import { restoreAuthenticatedUser } from '../services/googleAuth';
import { chooseLatestTheme, normalizeTheme } from '../services/themeEngine';

const AppContext = createContext();

export const createDefaultState = () => ({
    // Auth
    user: null, // { email, name, picture }
    isLoggedIn: false,
    isAuthReady: false,
    isSessionReady: false,
    sessionEntryAllowed: false,
    initializationError: '',

    // Onboarding
    profile: null,
    isOnboarded: false,
    onboardingStatus: 'unknown',

    // Config
    config: {
  name: '',
  salary: 0,
  homeIncome: 0,
  activeMonth: new Date().toLocaleString('default', { month: 'short' }),
  activeYear: new Date().getFullYear(),
  budgets: {},
},

    fixedExpenses: {},

    // Data
    tracker: [],
    income: [],
    investments: [],
    savingsGoals: [],
    billCalendar: [],
    monthlySnapshots: [],
    aiMemory: [],
    accountability: [],

    // Self-evolution
    appBlueprint: [], // AI-built sections
    newSectionNotifications: [], // "I built something new!" messages
    aiInsights: [], // AI-generated insights

    sheetsConfig: { proxyUrl: PROXY_URL, connected: false },
    geminiKey: DEFAULT_GEMINI_KEY,

    // UI
    notifications: [],
    sidebarOpen: true,
    syncStatus: 'idle',
    lastSynced: null,

    // Gamification
    streaks: { logging: 0, underBudget: 0, savingsGoal: 0 },
    level: 1,
    xp: 0,
    financialHealthScore: null,
    isAdmin: false,
    plan: 'Free',
    planExpiresOn: '',
  });

const getInitialState = () => {
  clearLegacyStorage();
  return createDefaultState();
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { 
        ...createDefaultState(),
        user: action.payload, 
        isLoggedIn: !!action.payload,
        isAdmin: false
      };
    case 'SWITCH_USER': {
      const user = action.payload.user;
      const cached = action.payload.cached || {};
      return {
        ...createDefaultState(),
        ...cached,
        user,
        isLoggedIn: true,
        isAuthReady: true,
        isSessionReady: false,
        sessionEntryAllowed: action.payload.allowInit === true,
        onboardingStatus: 'unknown',
        isAdmin: false,
        sheetsConfig: { proxyUrl: PROXY_URL, connected: false },
      };
    }
    case 'RESET_SESSION':
      return { ...createDefaultState(), isAuthReady: true };
    case 'SET_AUTH_READY':
      return { ...state, isAuthReady: true };
    case 'SET_INITIALIZATION_ERROR':
      return { ...state, initializationError: action.payload || '' };
    case 'SET_SESSION_READY':
      return { ...state, isSessionReady: action.payload === true };
    case 'SET_SESSION_ENTRY_ALLOWED':
      return { ...state, sessionEntryAllowed: action.payload === true };
    case 'SET_ONBOARDED':
      return { 
        ...state, 
        isOnboarded: true, 
        onboardingStatus: 'complete',
        user: state.user ? { ...state.user, onboardingCompleted: true } : state.user,
        profile: action.payload,
        config: {
          ...state.config,
          theme: action.payload.theme || state.config.theme
        }
      };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'ADD_CATEGORY': {
      const { name, budget } = action.payload;
      if (state.config.budgets[name] !== undefined) return state;
      return { ...state, config: { ...state.config, budgets: { ...state.config.budgets, [name]: budget } } };
    }
    case 'ADD_EXPENSE':
      return { ...state, tracker: [...state.tracker, { ...action.payload, id: action.payload.id || Date.now() }] };
    case 'REMOVE_EXPENSE': {
      const index = state.tracker.findLastIndex(e => 
        e.date === action.payload.date && 
        parseFloat(e.amount) === parseFloat(action.payload.amount) && 
        e.description.toLowerCase() === action.payload.description.toLowerCase() && 
        e.category === action.payload.category
      );
      if (index !== -1) {
        const newTracker = [...state.tracker];
        newTracker.splice(index, 1);
        return { ...state, tracker: newTracker };
      }
      return state;
    }
    case 'ADD_INCOME':
      return { ...state, income: [...state.income, { ...action.payload, id: action.payload.id || Date.now() }] };
    case 'ADD_INVESTMENT':
      return { ...state, investments: [...state.investments, { ...action.payload, id: action.payload.id || Date.now() }] };
    case 'UPDATE_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g) };
    case 'ADD_GOAL':
      return { ...state, savingsGoals: [...state.savingsGoals, { ...action.payload, id: action.payload.id || Date.now() }] };
    case 'SET_GOALS':
      return { ...state, savingsGoals: action.payload };
    case 'DELETE_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.filter(g => g.id !== action.payload) };
    case 'UPDATE_BILL':
      return { ...state, billCalendar: state.billCalendar.map(b => b.id === action.payload.id ? { ...b, ...action.payload } : b) };
    case 'SET_SHEETS_CONFIG':
      return { ...state, sheetsConfig: { ...state.sheetsConfig, ...action.payload } };
    case 'SET_GEMINI_KEY':
      return { ...state, geminiKey: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'ADD_AI_MEMORY':
      return { ...state, aiMemory: [...state.aiMemory, { ...action.payload, id: Date.now(), date: new Date().toISOString() }] };
    case 'SET_BLUEPRINT':
      return { ...state, appBlueprint: action.payload };
    case 'ADD_BLUEPRINT_SECTION': {
      const exists = state.appBlueprint.some(section => section.SectionID === action.payload.SectionID);
      return exists ? state : { ...state, appBlueprint: [...state.appBlueprint, action.payload] };
    }
    case 'ADD_NEW_SECTION_NOTIFICATION':
      return { ...state, newSectionNotifications: [...state.newSectionNotifications, action.payload] };
    case 'CLEAR_NEW_SECTION_NOTIFICATIONS':
      return { ...state, newSectionNotifications: [] };
    case 'SET_AI_INSIGHTS':
      return { ...state, aiInsights: action.payload };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload.status, lastSynced: action.payload.time || state.lastSynced };
    case 'ADD_XP': {
      const newXp = (state.xp || 0) + (action.payload || 0);
      const newLevel = Math.floor(newXp / 500) + 1;
      return { ...state, xp: newXp, level: newLevel };
    }
    case 'ADD_BADGE':
      if (state.badges?.includes(action.payload)) return state;
      return { ...state, badges: [...(state.badges || []), action.payload] };
    case 'SET_HEALTH_SCORE':
      return { ...state, financialHealthScore: action.payload };
    case 'SET_PLAN':
      return { ...state, plan: action.payload?.plan === 'Pro' || action.payload === 'Pro' ? 'Pro' : 'Free', planExpiresOn: action.payload?.planExpiresOn || '' };
    case 'LOAD_FROM_PROXY': {
      let parsedTheme = null;
      if (action.payload.config?.ThemeJSON) {
        try { parsedTheme = JSON.parse(action.payload.config.ThemeJSON); } catch(e){}
      }
      const selectedTheme = chooseLatestTheme(state.config.theme, parsedTheme);
      return {
        ...state,
        tracker: action.payload.tracker || [],
        income: action.payload.income || [],
        investments: action.payload.investments || [],
        savingsGoals: action.payload.savingsGoals || [],
        billCalendar: action.payload.billCalendar || [],
        aiMemory: action.payload.aiMemory || [],
        config: {
          ...state.config,
          ...(action.payload.config || {}),
          theme: selectedTheme || {
            bgMain: 'var(--bg-main)',
            bgCard: 'var(--bg-card)',
            bgSidebar: 'var(--bg-sidebar)',
            borderColor: 'var(--border-color)',
            primaryColor: '#7c3aed',
            accentColor: '#06b6d4',
            textMain: 'var(--text-main)',
            textMuted: 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
            cardRadius: '12px',
            shadowIntensity: 'rgba(124, 58, 237, 0.15)',
          },
          budgets: action.payload.config?.budgets || {},
        },
        profile: action.payload.profile || null,
        isOnboarded: action.payload.isOnboarded === true,
        onboardingStatus: action.payload.isOnboarded === true ? 'complete' : 'incomplete',
        user: state.user ? { ...state.user, onboardingCompleted: action.payload.isOnboarded === true } : state.user,
        isAdmin: action.payload.isAdmin === true,
        plan: action.payload.plan === 'Pro' ? 'Pro' : state.plan,
      };
    }
    case 'SET_SUSPENDED':
      return {
        ...state,
        isSuspended: action.payload.isSuspended,
        suspendReason: action.payload.reason
      };
    case 'SET_SHOW_LOGOUT':
      return {
        ...state,
        showLogoutButton: action.payload
      };
    case 'LOAD_STATE': {
      let parsedTheme = null;
      if (action.payload.config?.ThemeJSON) {
        try { parsedTheme = JSON.parse(action.payload.config.ThemeJSON); } catch(e){}
      } else if (action.payload.config?.theme) {
        parsedTheme = action.payload.config.theme;
      }
      return {
        ...state,
        ...action.payload,
        config: {
          ...state.config,
          ...(action.payload.config || {}),
          theme: parsedTheme || state.config.theme || {
            bgMain: 'var(--bg-main)',
            bgCard: 'var(--bg-card)',
            bgSidebar: 'var(--bg-sidebar)',
            borderColor: 'var(--border-color)',
            primaryColor: '#7c3aed',
            accentColor: '#06b6d4',
            textMain: 'var(--text-main)',
            textMuted: 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
            cardRadius: '12px',
            shadowIntensity: 'rgba(124, 58, 237, 0.15)',
          },
        },
        // Always use the hardcoded proxy URL — never override from localStorage
        sheetsConfig: {
          proxyUrl: PROXY_URL,
          connected: action.payload.sheetsConfig?.connected || false,
        },
        // Use hardcoded Gemini key as default, allow user override only if they explicitly set one
        geminiKey: action.payload.geminiKey || DEFAULT_GEMINI_KEY || '',
        isOnboarded: action.payload.isOnboarded ?? false,
        isLoggedIn: action.payload.isLoggedIn ?? false,
        user: action.payload.user || null,
        profile: action.payload.profile || null,
        savingsGoals: action.payload.savingsGoals || state.savingsGoals,
        investments: action.payload.investments || [],
        appBlueprint: action.payload.appBlueprint || [],
        isSuspended: action.payload.isSuspended ?? false,
        suspendReason: action.payload.suspendReason || '',
        showLogoutButton: action.payload.showLogoutButton ?? true,
      };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const consciousnessScanRef = useRef('');
  const autoInitRef = useRef('');
  const lastDriveUpdateRef = useRef(0);
  const writeTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    restoreAuthenticatedUser()
      .then(user => {
        if (!active) return;
        if (user) dispatch({ type: 'SWITCH_USER', payload: { user, cached: readUserState(user), allowInit: false } });
        else dispatch({ type: 'SET_AUTH_READY' });
      })
      .catch(() => {
        if (active) dispatch({ type: 'SET_AUTH_READY' });
      });
    return () => { active = false; };
  }, []);

  // AUTO-INIT: when user logs in, silently init + sync using hardcoded PROXY_URL
  // No user configuration needed — happens automatically in the background
  useEffect(() => {
    const email = state.user?.email;
    const userId = getStableUserId(state.user);
    if (!state.sessionEntryAllowed || !email || !userId || !PROXY_URL || autoInitRef.current === userId) return;
    autoInitRef.current = userId;
    consciousnessScanRef.current = '';
    lastDriveUpdateRef.current = 0;

    const autoInit = async () => {
      try {
        dispatch({ type: 'SET_INITIALIZATION_ERROR', payload: '' });
        // 1. Get user status (Suspended Check)
        let isUserSuspended = false;
        let suspendReasonText = '';
        try {
          const { getUserStatus } = await import('../services/proxyService');
          const statusRes = await getUserStatus(PROXY_URL, email);
          if (statusRes.success) {
            dispatch({ type: 'SET_PLAN', payload: statusRes });
            if (statusRes.giftMessage && !state.notifications.some(n => n.giftId === statusRes.giftId)) {
              dispatch({ type: 'ADD_NOTIFICATION', payload: { giftId: statusRes.giftId, type: 'gift', message: statusRes.giftMessage, read: false } });
            }
          }
          if (statusRes.success && statusRes.status === 'Suspended') {
            isUserSuspended = true;
            suspendReasonText = statusRes.reason || 'Account suspended by administrator.';
            dispatch({ type: 'SET_SUSPENDED', payload: { isSuspended: true, reason: suspendReasonText } });
            return; // Halt any further loading
          }
        } catch (statusErr) {
          console.warn('Could not verify account status', statusErr);
        }

        // Apply per-user theme
        try {
          const { getStoredTheme, applyDynamicTheme } = await import('../services/themeEngine');
          const storedTheme = getStoredTheme(userId);
          if (storedTheme) {
            applyDynamicTheme(storedTheme);
            dispatch({ type: 'SET_CONFIG', payload: { theme: storedTheme } });
          }
        } catch (themeErr) {}

        // Mark as connected
        dispatch({ type: 'SET_SHEETS_CONFIG', payload: { proxyUrl: PROXY_URL, connected: true } });
        // Sync all data from backend
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'syncing' } });
        const data = await loadAllFromProxy(PROXY_URL, email);
        if (data.success) {
          if (data.config?.ThemeJSON) {
            try {
              const serverTheme = JSON.parse(data.config.ThemeJSON);
              if (serverTheme && Object.keys(serverTheme).length > 0) {
                const { setStoredTheme } = await import('../services/themeEngine');
                const latestTheme = chooseLatestTheme(state.config.theme, serverTheme);
                setStoredTheme(userId, latestTheme);
                data.config.ThemeJSON = JSON.stringify(latestTheme);
              }
            } catch (themeError) {}
          }
          const invData = await getDynamicSheet(PROXY_URL, email, 'Investments').catch(() => []);
          data.investments = await resolveAllInvestments(invData);
          dispatch({ type: 'LOAD_FROM_PROXY', payload: data });
          dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'success', time: new Date().toISOString() } });
          dispatch({ type: 'SET_SESSION_READY', payload: true });
          const bp = await readBlueprint(PROXY_URL, email);
          if (bp.length > 0) dispatch({ type: 'SET_BLUEPRINT', payload: bp });
        } else {
          autoInitRef.current = '';
          dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
          dispatch({ type: 'SET_INITIALIZATION_ERROR', payload: data.error || 'Could not load your workspace.' });
        }
      } catch (e) {
        autoInitRef.current = '';
        // Non-fatal — app still works offline from localStorage
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
        dispatch({ type: 'SET_INITIALIZATION_ERROR', payload: e.message || 'Could not load your workspace.' });
      }
    };

    autoInit();
  }, [state.sessionEntryAllowed, state.user?.sub, state.user?.email]);

  // Save only to the authenticated user's scoped cache.
  useEffect(() => {
    const userId = getStableUserId(state.user);
    if (!userId || !state.isLoggedIn) return;
    clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      const toSave = {
        profile: state.profile,
        isOnboarded: state.isOnboarded,
        config: state.config,
        tracker: state.tracker,
        income: state.income,
        investments: state.investments,
        savingsGoals: state.savingsGoals,
        billCalendar: state.billCalendar,
        monthlySnapshots: state.monthlySnapshots,
        aiMemory: state.aiMemory,
        sheetsConfig: state.sheetsConfig,
        lastSynced: state.lastSynced,
        appBlueprint: state.appBlueprint,
        streaks: state.streaks,
        level: state.level,
        xp: state.xp,
        badges: state.badges,
        notifications: state.notifications,
        plan: state.plan,
        planExpiresOn: state.planExpiresOn,
      };
      writeUserState(userId, toSave);
    }, 500);
  }, [state]);

  // Scan after workspace data is ready and whenever confirmed expenses change.
  useEffect(() => {
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    const userId = getStableUserId(state.user);
    const latestExpense = state.tracker[state.tracker.length - 1];
    const scanKey = `${userId}:${state.tracker.length}:${latestExpense?.id || ''}`;
    if (state.isSessionReady && connected && proxyUrl && email && consciousnessScanRef.current !== scanKey) {
      consciousnessScanRef.current = scanKey;
      runConsciousnessScan(proxyUrl, email, state.tracker.slice(-50))
        .then(({ newSections, insights }) => {
          if (newSections.length > 0) {
            newSections.forEach(s => {
              dispatch({ type: 'ADD_BLUEPRINT_SECTION', payload: { SectionID: s.sectionId, Name: s.name, Icon: s.icon, SheetRef: s.sheetRef, Status: 'Active' } });
              dispatch({ type: 'ADD_NEW_SECTION_NOTIFICATION', payload: s });
            });
          }
          if (insights.length > 0) dispatch({ type: 'SET_AI_INSIGHTS', payload: insights });
          // Also reload full blueprint
          readBlueprint(proxyUrl, email).then(bp => {
            if (bp.length > 0) dispatch({ type: 'SET_BLUEPRINT', payload: bp });
          });
        }).catch(() => {});
    }
  }, [state.isSessionReady, state.sheetsConfig?.connected, state.sheetsConfig?.proxyUrl, state.user, state.tracker]);

  // (health score effect moved to after `computed` is defined below)

  // ─── SYNC FROM PROXY ────────────────────────────────────────────────────────
  const syncFromSheets = useCallback(async (proxyUrl, email) => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'syncing' } });
    try {
      const data = await loadAllFromProxy(proxyUrl, email);
      if (!data.success) throw new Error(data.error || 'Sync failed');
      const statusRes = await getUserStatus(proxyUrl, email).catch(() => null);
      if (statusRes?.success) {
        dispatch({ type: 'SET_PLAN', payload: statusRes });
        if (statusRes.giftMessage && !state.notifications.some(n => n.giftId === statusRes.giftId)) {
          dispatch({ type: 'ADD_NOTIFICATION', payload: { giftId: statusRes.giftId, type: 'gift', message: statusRes.giftMessage, read: false } });
        }
      }
      const invData = await getDynamicSheet(proxyUrl, email, 'Investments').catch(() => []);
      data.investments = await resolveAllInvestments(invData);
      dispatch({ type: 'LOAD_FROM_PROXY', payload: data });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'success', time: new Date().toISOString() } });
      // Load blueprint
      const bp = await readBlueprint(proxyUrl, email);
      if (bp.length > 0) dispatch({ type: 'SET_BLUEPRINT', payload: bp });
      return { success: true };
    } catch (e) {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
      return { success: false, error: e.message };
    }
  }, [state.notifications]);

  // ─── AUTO-SYNC POLLER ────────────────────────────────────────────────────────
  useEffect(() => {
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (!connected || !proxyUrl || !email) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await proxyCheckUpdates(proxyUrl, email);
        if (res.success && res.lastUpdated) {
          if (lastDriveUpdateRef.current !== 0 && res.lastUpdated > lastDriveUpdateRef.current) {
            await syncFromSheets(proxyUrl, email);
          }
          lastDriveUpdateRef.current = res.lastUpdated;
        }
      } catch (err) {
        // Silently fail polling on network issues
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [state.sheetsConfig?.connected, state.sheetsConfig?.proxyUrl, state.user?.email, syncFromSheets]);

  // ─── ADD EXPENSE ─────────────────────────────────────────────────────────────
  const addExpense = useCallback(async (expense) => {
    const expenseWithId = { ...expense, id: expense.id || Date.now() };
    dispatch({ type: 'ADD_EXPENSE', payload: expenseWithId });
    dispatch({ type: 'ADD_XP', payload: 10 });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await proxyLogExpense(proxyUrl, email, expenseWithId).catch(() => {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            message: '⚠️ Expense saved locally but sheet sync failed. It will retry on next sync.',
          },
        });
      });
      const existingSectionIds = state.appBlueprint.map(section => section.SectionID);
      const createdSections = await autoLogExpenseToSections(proxyUrl, email, expenseWithId, existingSectionIds).catch(() => []);
      createdSections.forEach(section => {
        dispatch({ type: 'ADD_BLUEPRINT_SECTION', payload: section });
        dispatch({
          type: 'ADD_NEW_SECTION_NOTIFICATION',
          payload: {
            sectionId: section.SectionID,
            name: section.Name,
            icon: section.Icon,
            sheetRef: section.SheetRef,
            message: `I built you a ${section.Name} and logged this transaction there too.`,
          },
        });
      });
    }
  }, [state.sheetsConfig, state.user, state.appBlueprint]);

  // ─── DELETE EXPENSE ──────────────────────────────────────────────────────────
  const deleteExpense = useCallback(async (expense) => {
    // Optimistically remove from local state immediately
    dispatch({ type: 'REMOVE_EXPENSE', payload: expense });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      try {
        const result = await proxyDeleteExpense(proxyUrl, email, expense);
        if (!result?.success) {
          console.error('Sheet delete failed:', result);
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              type: 'error',
              message: `⚠️ Deleted locally but sheet sync failed: ${result?.error || 'Unknown error'}`,
            },
          });
        }
      } catch (err) {
        console.error('deleteExpense network error:', err);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            message: `⚠️ Deleted locally but could not reach sheet: ${err.message}`,
          },
        });
      }
    }
  }, [state.sheetsConfig, state.user]);

  // ─── ADD INCOME ──────────────────────────────────────────────────────────────
  const addIncome = useCallback(async (incomeItem) => {
    const incomeWithId = { ...incomeItem, id: incomeItem.id || Date.now() };
    dispatch({ type: 'ADD_INCOME', payload: incomeWithId });
    dispatch({ type: 'ADD_XP', payload: 10 });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await proxyLogIncome(proxyUrl, email, incomeWithId).catch(() => {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            message: '⚠️ Income saved locally but sheet sync failed. It will retry on next sync.',
          },
        });
      });
    }
  }, [state.sheetsConfig, state.user]);

  // ─── ADD GOAL ─────────────────────────────────────────────────────────────
  const addGoal = useCallback(async (goal) => {
    const newGoal = { ...goal, id: goal.id || Date.now() };
    dispatch({ type: 'ADD_GOAL', payload: newGoal });
    dispatch({ type: 'ADD_XP', payload: 15 });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const updatedGoals = [...state.savingsGoals, newGoal];
      await writeGoals(proxyUrl, email, updatedGoals).catch(() => {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            message: '⚠️ Goal saved locally but sheet sync failed. It will retry on next sync.',
          },
        });
      });
    }
  }, [state.sheetsConfig, state.user, state.savingsGoals]);

  // ─── UPDATE GOAL ─────────────────────────────────────────────────────────────
  const updateGoal = useCallback(async (goal) => {
    dispatch({ type: 'UPDATE_GOAL', payload: goal });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const updatedGoals = state.savingsGoals.map(g => g.id === goal.id ? { ...g, ...goal } : g);
      await writeGoals(proxyUrl, email, updatedGoals).catch(() => {});
    }
  }, [state.sheetsConfig, state.user, state.savingsGoals]);

  const deleteGoal = useCallback(async (goalId) => {
    const updatedGoals = state.savingsGoals.filter(goal => goal.id !== goalId);
    dispatch({ type: 'DELETE_GOAL', payload: goalId });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) await writeGoals(proxyUrl, email, updatedGoals);
  }, [state.sheetsConfig, state.user, state.savingsGoals]);

  // ─── UPDATE BILL ─────────────────────────────────────────────────────────────
  const updateBill = useCallback(async (bill) => {
    dispatch({ type: 'UPDATE_BILL', payload: bill });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const updatedBills = state.billCalendar.map(b => b.id === bill.id ? { ...b, ...bill } : b);
      await writeBills(proxyUrl, email, updatedBills).catch(() => {});
    }
  }, [state.sheetsConfig, state.user, state.billCalendar]);

  // ─── ADD NEW CATEGORY (self-writing) ────────────────────────────────────────
  const addNewCategory = useCallback(async (categoryName, budget = 0) => {
    dispatch({ type: 'ADD_CATEGORY', payload: { name: categoryName, budget } });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await proxyAddCategory(proxyUrl, email, categoryName, budget).catch(() => {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'error',
            message: '⚠️ Category added locally but sheet sync failed. It will retry on next sync.',
          },
        });
      });
    }
  }, [state.sheetsConfig, state.user]);

  // ─── ADD AI MEMORY FACT ──────────────────────────────────────────────────────
  const addMemoryFact = useCallback(async (observation, type = 'user_profile') => {
    const normalized = String(observation || '').trim();
    if (!isValidMemoryObservation(normalized)) return;
    const alreadyKnown = state.aiMemory.some(
      memory => String(memory.observation || '').trim().toLowerCase() === normalized.toLowerCase()
    );
    if (alreadyKnown) return;
    const today = new Date().toLocaleDateString('en-IN');
    const newFact = { date: today, type, observation: normalized };
    dispatch({ type: 'ADD_AI_MEMORY', payload: newFact });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await writeMemory(proxyUrl, email, type, normalized).catch(() => {});
    }
  }, [state.sheetsConfig, state.user, state.aiMemory]);

  // ─── UPDATE DYNAMIC THEME ──────────────────────────────────────────────────
  const updateTheme = useCallback(async (newTheme) => {
    if (!state.isAdmin && state.plan !== 'Pro') throw new Error('AI Visual Director is available on the Pro plan.');
    const timestampedTheme = normalizeTheme({ ...newTheme, updatedAt: new Date().toISOString() });
    dispatch({ type: 'SET_CONFIG', payload: { theme: timestampedTheme } });
    const userId = getStableUserId(state.user);
    if (userId) {
      const { setStoredTheme } = await import('../services/themeEngine');
      setStoredTheme(userId, timestampedTheme);
    }
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const result = await proxySaveConfig(proxyUrl, email, { ThemeJSON: JSON.stringify(timestampedTheme) });
      if (!result?.success) throw new Error(result?.error || 'Could not save your theme.');
    }
    return timestampedTheme;
  }, [state.sheetsConfig, state.user, state.isAdmin, state.plan]);

  const completeOnboarding = useCallback(async (profile) => {
    const { proxyUrl } = state.sheetsConfig;
    const email = state.user?.email;
    if (!proxyUrl || !email) throw new Error('User account is not connected.');
    const result = await proxyCompleteOnboarding(proxyUrl, email, profile);
    if (!result?.success) throw new Error(result?.error || 'Could not save onboarding.');
    dispatch({ type: 'SET_ONBOARDED', payload: result.profile || profile });
    dispatch({ type: 'SET_CONFIG', payload: { name: profile.name || '', theme: profile.theme } });
    const userId = getStableUserId(state.user);
    if (userId && profile.theme) {
      const { setStoredTheme, applyDynamicTheme } = await import('../services/themeEngine');
      setStoredTheme(userId, profile.theme);
      applyDynamicTheme(profile.theme);
    }
    return result;
  }, [state.sheetsConfig, state.user]);

  const saveSettings = useCallback(async (values) => {
    const { proxyUrl } = state.sheetsConfig;
    const email = state.user?.email;
    if (!proxyUrl || !email) throw new Error('User account is not connected.');
    const result = await proxySaveConfig(proxyUrl, email, values);
    if (!result?.success) throw new Error(result?.error || 'Could not save settings.');
    const configUpdate = {};
    if (Object.prototype.hasOwnProperty.call(values, 'Name')) configUpdate.name = values.Name;
    if (Object.prototype.hasOwnProperty.call(values, 'Salary')) configUpdate.salary = Number(values.Salary) || 0;
    if (Object.prototype.hasOwnProperty.call(values, 'HomeIncome')) configUpdate.homeIncome = Number(values.HomeIncome) || 0;
    const budgetEntries = Object.entries(values).filter(([key]) => key.startsWith('Budget:'));
    if (budgetEntries.length > 0) {
      configUpdate.budgets = {
        ...state.config.budgets,
        ...Object.fromEntries(budgetEntries.map(([key, value]) => [key.replace('Budget:', ''), Number(value) || 0])),
      };
    }
    dispatch({ type: 'SET_CONFIG', payload: configUpdate });
    return result;
  }, [state.sheetsConfig, state.user, state.config.budgets]);

  // ─── COMPUTED VALUES ─────────────────────────────────────────────────────────
  const currentMonth = state.config.activeMonth;
  const currentYear = state.config.activeYear;
  const currentMonthExpenses = state.tracker.filter(t => t.month === currentMonth && String(t.year) === String(currentYear));
  const currentMonthIncome = state.income.filter(i => i.month === currentMonth && String(i.year) === String(currentYear));
  const baseIncome = state.config.salary + state.config.homeIncome;
  const extraIncome = currentMonthIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalIncome = baseIncome + extraIncome;
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categorySpend = {};
  Object.keys(state.config.budgets).forEach(cat => {
    categorySpend[cat] = currentMonthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
  });

  const computed = {
    currentMonthExpenses,
    currentMonthIncome,
    totalIncome,
    totalExpenses,
    totalBudget: Object.values(state.config.budgets).reduce((a, b) => a + b, 0),
    categorySpend,
    buffer: totalIncome - totalExpenses,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0',
    baseIncome,
    extraIncome,
  };

  // Compute financial health score (must be after `computed` is defined)
  useEffect(() => {
    const score = calculateFinancialHealth({
      totalIncome: computed.totalIncome,
      savingsRate: computed.savingsRate,
      categorySpend: computed.categorySpend,
      budgets: state.config.budgets,
      goals: state.savingsGoals,
      hasTransactions: state.tracker.length > 0,
      hasIncomeEntries: state.income.length > 0,
    });
    if (score !== state.financialHealthScore) dispatch({ type: 'SET_HEALTH_SCORE', payload: score });
  }, [computed.totalIncome, computed.savingsRate, computed.categorySpend, state.tracker.length, state.income.length, state.config.budgets, state.savingsGoals, state.financialHealthScore]);

  return (
    <AppContext.Provider value={{ state, dispatch, computed, addExpense, deleteExpense, addNewCategory, syncFromSheets, addIncome, addGoal, updateGoal, deleteGoal, updateBill, addMemoryFact, updateTheme, completeOnboarding, saveSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
