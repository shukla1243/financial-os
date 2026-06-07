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
  initUser,
  proxyCheckUpdates,
  getDynamicSheet,
} from '../services/proxyService';
import { runConsciousnessScan, readBlueprint } from '../services/consciousnessEngine';
import { resolveAllInvestments } from '../services/walletService';

const AppContext = createContext();

const getInitialState = () => {
  const defaultState = {
    // Auth
    user: null, // { email, name, picture }
    isLoggedIn: false,

    // Onboarding
    profile: null,
    isOnboarded: false,

    // Config
    config: {
      name: 'Shreyansh',
      salary: 15000,
      homeIncome: 15500,
      activeMonth: new Date().toLocaleString('default', { month: 'short' }),
      activeYear: new Date().getFullYear(),
      budgets: {
        Housing: 7200, Food: 6620, Health: 1500, Telecom: 566,
        Subscriptions: 2098, Transport: 2000, Savings: 6000, Other: 0,
      },
    },

    fixedExpenses: {
      Rent: { amount: 6000, category: 'Housing', mode: 'Bank Transfer', fixed: true },
      Gym: { amount: 1500, category: 'Health', mode: 'Auto-debit', fixed: true },
      Adobe: { amount: 1600, category: 'Subscriptions', mode: 'Auto-debit', fixed: true },
      'Apple Cloud': { amount: 299, category: 'Subscriptions', mode: 'Auto-debit', fixed: true },
      'Google Cloud': { amount: 199, category: 'Subscriptions', mode: 'Auto-debit', fixed: true },
      Mobile: { amount: 333, category: 'Telecom', mode: 'Auto-debit', fixed: true },
      WiFi: { amount: 233, category: 'Telecom', mode: 'Auto-debit', fixed: true },
      SIP: { amount: 2500, category: 'Savings', mode: 'Auto-debit', fixed: true },
      'Emergency Fund': { amount: 2000, category: 'Savings', mode: 'Bank Transfer', fixed: true },
      'Travel Fund': { amount: 1500, category: 'Savings', mode: 'Bank Transfer', fixed: true },
      Electricity: { amount: null, category: 'Housing', mode: 'UPI', fixed: false },
    },

    // Data
    tracker: [],
    income: [],
    investments: [],
    savingsGoals: [
      { id: 1, name: 'Japan Trip', target: 50000, saved: 0, monthlyAdd: 1500, deadline: 'Dec 2026', icon: '✈️', color: 'cyan', status: 'On Track' },
      { id: 2, name: 'Emergency Fund', target: 100000, saved: 0, monthlyAdd: 2000, deadline: 'Dec 2027', icon: '🛡️', color: 'success', status: 'On Track' },
      { id: 3, name: 'SIP Corpus', target: 500000, saved: 0, monthlyAdd: 2500, deadline: 'Dec 2030', icon: '📈', color: 'purple', status: 'On Track' },
    ],
    billCalendar: [
      { id: 1, name: 'Rent', amount: 6000, dueDate: 1, frequency: 'Monthly', category: 'Housing', status: 'Unpaid' },
      { id: 2, name: 'SIP', amount: 2500, dueDate: 1, frequency: 'Monthly', category: 'Savings', status: 'Unpaid' },
      { id: 3, name: 'Gym', amount: 1500, dueDate: 1, frequency: 'Monthly', category: 'Health', status: 'Unpaid' },
      { id: 4, name: 'Adobe', amount: 1600, dueDate: 3, frequency: 'Monthly', category: 'Subscriptions', status: 'Unpaid' },
      { id: 5, name: 'Apple Cloud', amount: 299, dueDate: 3, frequency: 'Monthly', category: 'Subscriptions', status: 'Unpaid' },
      { id: 6, name: 'Google Cloud', amount: 199, dueDate: 3, frequency: 'Monthly', category: 'Subscriptions', status: 'Unpaid' },
      { id: 7, name: 'Mobile', amount: 333, dueDate: 15, frequency: '98-day', category: 'Telecom', status: 'Unpaid' },
      { id: 8, name: 'WiFi', amount: 233, dueDate: 6, frequency: 'Quarterly', category: 'Telecom', status: 'Unpaid' },
      { id: 9, name: 'Emergency Fund', amount: 2000, dueDate: 1, frequency: 'Monthly', category: 'Savings', status: 'Unpaid' },
      { id: 10, name: 'Travel Fund', amount: 1500, dueDate: 1, frequency: 'Monthly', category: 'Savings', status: 'Unpaid' },
    ],
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
    financialHealthScore: 0,
    isAdmin: false,
  };

  try {
    const saved = localStorage.getItem('financial-os-v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultState,
        ...parsed,
        sheetsConfig: {
          proxyUrl: PROXY_URL,
          connected: parsed.sheetsConfig?.connected || false,
        },
        geminiKey: parsed.geminiKey || DEFAULT_GEMINI_KEY || '',
      };
    }
  } catch (e) {}
  return defaultState;
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isLoggedIn: !!action.payload,
        isAdmin: action.payload?.email?.toLowerCase() === 'testaiworkforcollage@gmail.com'
      };
    case 'SET_ONBOARDED':
      return { 
        ...state, 
        isOnboarded: true, 
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
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'ADD_AI_MEMORY':
      return { ...state, aiMemory: [...state.aiMemory, { ...action.payload, id: Date.now(), date: new Date().toISOString() }] };
    case 'SET_BLUEPRINT':
      return { ...state, appBlueprint: action.payload };
    case 'ADD_BLUEPRINT_SECTION':
      return { ...state, appBlueprint: [...state.appBlueprint, action.payload] };
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
    case 'LOAD_FROM_PROXY': {
      let parsedTheme = null;
      if (action.payload.config?.ThemeJSON) {
        try { parsedTheme = JSON.parse(action.payload.config.ThemeJSON); } catch(e){}
      }
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
          budgets: { ...state.config.budgets, ...(action.payload.config?.budgets || {}) },
        },
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
  const consciousnessRanRef = useRef(false);
  const autoInitRef = useRef(false);
  const lastDriveUpdateRef = useRef(0);

  // AUTO-INIT: when user logs in, silently init + sync using hardcoded PROXY_URL
  // No user configuration needed — happens automatically in the background
  useEffect(() => {
    const email = state.user?.email;
    if (!email || !PROXY_URL || autoInitRef.current) return;
    autoInitRef.current = true;

    const autoInit = async () => {
      try {
        // Init user account (creates default rows if new user, no-op if returning)
        const initRes = await initUser(PROXY_URL, email);
        
        // 1. Get user status (Suspended Check)
        let isUserSuspended = false;
        let suspendReasonText = '';
        try {
          const { getUserStatus } = await import('../services/proxyService');
          const statusRes = await getUserStatus(PROXY_URL, email);
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
          const storedTheme = getStoredTheme(email);
          applyDynamicTheme(storedTheme);
          dispatch({ type: 'SET_CONFIG', payload: { theme: storedTheme } });
        } catch (themeErr) {}

        // Mark as connected
        dispatch({ type: 'SET_SHEETS_CONFIG', payload: { proxyUrl: PROXY_URL, connected: true } });
        // Sync all data from backend
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'syncing' } });
        const data = await loadAllFromProxy(PROXY_URL, email);
        if (data.success) {
          const invData = await getDynamicSheet(PROXY_URL, email, 'Investments').catch(() => []);
          data.investments = await resolveAllInvestments(invData);
          dispatch({ type: 'LOAD_FROM_PROXY', payload: data });
          dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'success', time: new Date().toISOString() } });
          const bp = await readBlueprint(PROXY_URL, email);
          if (bp.length > 0) dispatch({ type: 'SET_BLUEPRINT', payload: bp });
        } else {
          dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
        }
      } catch (e) {
        // Non-fatal — app still works offline from localStorage
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
      }
    };

    autoInit();
  }, [state.user?.email]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const toSave = {
      user: state.user,
      isLoggedIn: state.isLoggedIn,
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
      geminiKey: state.geminiKey,
      lastSynced: state.lastSynced,
      appBlueprint: state.appBlueprint,
      streaks: state.streaks,
      level: state.level,
      xp: state.xp,
      badges: state.badges,
      isAdmin: state.isAdmin,
    };
    localStorage.setItem('financial-os-v4', JSON.stringify(toSave));
  }, [state]);

  // Run consciousness scan once after proxy connects
  useEffect(() => {
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email && state.geminiKey && !consciousnessRanRef.current) {
      consciousnessRanRef.current = true;
      runConsciousnessScan(proxyUrl, email, state.geminiKey, state.tracker.slice(-50))
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
  }, [state.sheetsConfig?.connected, state.sheetsConfig?.proxyUrl, state.user?.email, state.geminiKey]);

  // (health score effect moved to after `computed` is defined below)

  // ─── SYNC FROM PROXY ────────────────────────────────────────────────────────
  const syncFromSheets = useCallback(async (proxyUrl, email) => {
    dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'syncing' } });
    try {
      const data = await loadAllFromProxy(proxyUrl, email);
      if (!data.success) throw new Error(data.error || 'Sync failed');
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
  }, []);

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
      await proxyLogExpense(proxyUrl, email, expenseWithId).catch(() => {});
    }
  }, [state.sheetsConfig, state.user]);

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
      await proxyLogIncome(proxyUrl, email, incomeWithId).catch(() => {});
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
      await writeGoals(proxyUrl, email, updatedGoals).catch(() => {});
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
      await proxyAddCategory(proxyUrl, email, categoryName, budget).catch(() => {});
    }
  }, [state.sheetsConfig, state.user]);

  // ─── ADD AI MEMORY FACT ──────────────────────────────────────────────────────
  const addMemoryFact = useCallback(async (observation, type = 'user_profile') => {
    const today = new Date().toLocaleDateString('en-IN');
    const newFact = { date: today, type, observation };
    dispatch({ type: 'ADD_AI_MEMORY', payload: newFact });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      await writeMemory(proxyUrl, email, type, observation).catch(() => {});
    }
  }, [state.sheetsConfig, state.user]);

  // ─── UPDATE DYNAMIC THEME ──────────────────────────────────────────────────
  const updateTheme = useCallback(async (newTheme) => {
    dispatch({ type: 'SET_CONFIG', payload: { theme: newTheme } });
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;
    if (connected && proxyUrl && email) {
      const { upsertConfig } = await import('../services/proxyService');
      await upsertConfig(proxyUrl, email, 'ThemeJSON', JSON.stringify(newTheme)).catch(() => {});
    }
  }, [state.sheetsConfig, state.user]);

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
    if (computed.totalIncome > 0) {
      const savingsScore = Math.min((parseFloat(computed.savingsRate) / 30) * 40, 40);
      const budgetScore = Object.entries(state.config.budgets).filter(([cat, budget]) => {
        return budget === 0 || (computed.categorySpend[cat] || 0) <= budget;
      }).length / Object.keys(state.config.budgets).length * 30;
      const streakScore = Math.min((state.streaks?.logging || 0) * 2, 20);
      const goalScore = state.savingsGoals.filter(g => g.saved > 0).length > 0 ? 10 : 0;
      const score = Math.round(savingsScore + budgetScore + streakScore + goalScore);
      if (score !== state.financialHealthScore) {
        dispatch({ type: 'SET_HEALTH_SCORE', payload: score });
      }
    }
  }, [state.tracker, state.income, state.config.budgets, state.streaks, state.savingsGoals, state.financialHealthScore]);

  return (
    <AppContext.Provider value={{ state, dispatch, computed, addExpense, deleteExpense, addNewCategory, syncFromSheets, addIncome, addGoal, updateGoal, updateBill, addMemoryFact, updateTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
