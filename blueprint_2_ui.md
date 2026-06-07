# 🎨 BLUEPRINT 2 — UI & ANIMATIONS OVERHAUL

> **✅ RULE: This document defines EVERY visual change, animation, layout fix, and UX improvement to be made. Only modify `style={{}}` objects, add CSS keyframes to `index.css`, wrap JSX in new layout divs, and add UI-only state variables (like `isSubmitting`). Cross-reference Blueprint 1 — do NOT touch any logic listed there.**

---

## ⚠️ CRITICAL CONSTRAINTS

1. **NO TAILWIND CSS** — Tailwind compilation is broken in this environment. All styles must be vanilla CSS in `index.css` or inline React `style={{}}` objects.
2. **NO NEW DEPENDENCIES** — Do not add any animation libraries (framer-motion, react-spring, etc.). Use only CSS `@keyframes` and `transition` properties.
3. **PRESERVE ALL LOGIC** — Every `onClick`, `onChange`, `useEffect`, `useCallback`, reducer dispatch, and API call must remain identical. Only the visual wrapping changes.
4. **FONTS** — Continue using `Orbitron` (headings) and `Inter` (body). Both are already imported in `index.css`.

---

## 1. GLOBAL CSS ADDITIONS (`src/index.css`)

### New Keyframes to Add
```css
/* ── Smooth entrance animations ──────────────────────────────────────────── */
@keyframes slideInLeft {
  from { transform: translateX(-30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes borderGlow {
  0%, 100% { border-color: #7c3aed40; box-shadow: 0 0 8px #7c3aed10; }
  50% { border-color: #7c3aed80; box-shadow: 0 0 20px #7c3aed30; }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes ripple {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}

@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Spinner for loading states ──────────────────────────────────────────── */
@keyframes spinnerRotate {
  to { transform: rotate(360deg); }
}

/* ── Subtle card hover lift ──────────────────────────────────────────────── */
@keyframes hoverLift {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}

/* ── Stagger animation helper classes ────────────────────────────────────── */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }
.stagger-6 { animation-delay: 0.3s; }
.stagger-7 { animation-delay: 0.35s; }
.stagger-8 { animation-delay: 0.4s; }
```

### New Utility Classes to Add
```css
/* ── Loading spinner ─────────────────────────────────────────────────────── */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff30;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinnerRotate 0.6s linear infinite;
}

.spinner-sm {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
}

.spinner-purple {
  border-color: #7c3aed30;
  border-top-color: #a78bfa;
}

.spinner-cyan {
  border-color: #06b6d430;
  border-top-color: #06b6d4;
}

/* ── Glassmorphism card variant ───────────────────────────────────────────── */
.card-glass {
  background: rgba(18, 18, 31, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(124, 58, 237, 0.15);
}

/* ── Animated gradient border ────────────────────────────────────────────── */
.gradient-border {
  position: relative;
  background: #12121f;
  border-radius: 12px;
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 13px;
  padding: 1px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4, #f472b6, #7c3aed);
  background-size: 300% 300%;
  animation: gradientShift 4s ease infinite;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  z-index: -1;
}

/* ── Smooth button press effect ──────────────────────────────────────────── */
.btn-press:active {
  transform: scale(0.96);
  transition: transform 0.1s ease;
}

/* ── Disabled button override ────────────────────────────────────────────── */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
```

---

## 2. LOADING STATE — AI LOGGER BUTTONS (CRITICAL FIX)

### Problem
Users can double-click "Log it", "Log Income", "Confirm Goal Update", "Mark Paid & Log Expense", "Confirm Delete" buttons, causing duplicate entries.

### Solution
Add `isSubmitting` state tracking per-action. While submitting, render a spinner inside the button and disable it.

### Implementation Details

#### File: `src/pages/AILogger.jsx`

**Add new state** (UI-only, does not affect logic):
```js
const [submittingExpenses, setSubmittingExpenses] = useState(new Set());
const [submittingIncome, setSubmittingIncome] = useState(new Set());
const [submittingGoals, setSubmittingGoals] = useState(new Set());
const [submittingBills, setSubmittingBills] = useState(new Set());
const [submittingDeletions, setSubmittingDeletions] = useState(new Set());
const [submittingNewCats, setSubmittingNewCats] = useState(new Set());
```

**Wrap each confirm function** (preserve logic, add visual guard):
```js
// Example for confirmExpense — apply same pattern to all confirm functions
const confirmExpense = async (expense, index) => {
  if (submittingExpenses.has(index)) return; // prevent double-click
  setSubmittingExpenses(prev => new Set(prev).add(index));
  await addExpense(expense); // ← UNCHANGED LOGIC
  setPendingExpenses(prev => prev.filter(e => e !== expense)); // ← UNCHANGED
  setLoggedCount(c => c + 1); // ← UNCHANGED
  setMessages(prev => [...prev, { role: 'ai', text: `✅ Logged...` }]); // ← UNCHANGED
  setSubmittingExpenses(prev => { const s = new Set(prev); s.delete(index); return s; });
};
```

**Update every confirm button** to show spinner when submitting:
```jsx
{/* Before */}
<button onClick={onConfirm}>
  <Check size={14} /> Log it
</button>

{/* After */}
<button onClick={onConfirm} disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <span className="spinner spinner-sm" /> Logging...
    </>
  ) : (
    <>
      <Check size={14} /> {expense.isDuplicate ? 'Log Anyway' : 'Log it'}
    </>
  )}
</button>
```

#### Buttons to Add Spinner to:
| Card Component | Button Text | Loading Text |
|----------------|-------------|--------------|
| `ExpenseCard` | "Log it" / "Log Anyway" | "Logging..." |
| `IncomeCard` | "Log Income" | "Logging..." |
| `GoalUpdateCard` | "Confirm Goal Update" | "Updating..." |
| `BillPaymentCard` | "Mark Paid & Log Expense" | "Processing..." |
| `DeleteProposalCard` | "Confirm Delete" | "Deleting..." |
| `NewCategoryCard` | "Create Category & Log" | "Creating..." |

#### Send Button Improvement
The main send button at the bottom already disables when `loading` is true. Enhance it:
```jsx
<button onClick={handleSend} disabled={!input.trim() || loading}
  style={{ /* existing styles */ }}>
  {loading ? (
    <span className="spinner" />
  ) : (
    <Send size={16} />
  )}
</button>
```

---

## 3. PAGE-BY-PAGE UI IMPROVEMENTS

### 3A. LOGIN PAGE (`src/pages/Login.jsx`)

#### Current Issues
- Background effects are static radial gradients
- Features list has no entrance animation
- Logo doesn't animate on load

#### Changes
1. **Logo entrance**: Add `animation: 'bounceIn 0.6s ease-out'` to the logo icon div
2. **Title shimmer**: Add shimmer effect to "FINANCIAL OS" text:
   ```js
   style={{
     backgroundSize: '200% auto',
     animation: 'shimmer 3s linear infinite',
     background: 'linear-gradient(90deg, #a78bfa, #06b6d4, #f472b6, #a78bfa)',
     backgroundSize: '200% auto',
     WebkitBackgroundClip: 'text',
     WebkitTextFillColor: 'transparent',
   }}
   ```
3. **Feature items stagger**: Each feature item should use `animation: 'slideInLeft 0.4s ease-out'` with stagger delay (`animationDelay: '${i * 0.1}s'`)
4. **Google button hover**: Add `boxShadow: '0 4px 20px rgba(124,58,237,0.3)'` on hover
5. **Background orbs animation**: Add `animation: 'float 6s ease-in-out infinite'` to background gradient circles, with different delays for each

---

### 3B. DASHBOARD (`src/pages/Dashboard.jsx`)

#### Current Issues
- KPI cards appear all at once (no stagger)
- Category bars have no entrance animation
- Health score number is static
- Quick action buttons are flat

#### Changes
1. **KPI card stagger**: Each of the 4 KPI cards should animate in with `scaleIn 0.4s ease-out` and stagger delays (0s, 0.08s, 0.16s, 0.24s)
2. **Category bar entrance**: Each `CategoryBar` should use `slideInLeft 0.3s ease-out` with stagger based on index
3. **Category bar fill animation**: Change the bar fill `transition` from `width 0.8s ease` to `width 1.2s cubic-bezier(0.4, 0, 0.2, 1)` for a more satisfying fill
4. **Health score counter**: Animate the health score number counting up from 0 to the actual value over 1.5 seconds. Use a `useEffect` with `requestAnimationFrame` or `setInterval` to increment the displayed number. (This is UI-only — does not change the underlying state value.)
5. **Net worth card**: Add `animation: 'borderGlow 3s ease-in-out infinite'` to give it a subtle pulsing glow
6. **Quick action buttons**: Add `transition: 'all 0.2s ease'` and on hover: `transform: 'translateX(4px)'` (shift right on hover to suggest navigation)
7. **Over-budget alert**: Add `animation: 'slideUp 0.4s ease-out'` and a subtle left-border pulse effect
8. **Savings Goals progress bars**: Add same `cubic-bezier(0.4, 0, 0.2, 1)` transition as category bars

---

### 3C. AI LOGGER (`src/pages/AILogger.jsx`)

#### Current Issues
- Action cards appear without smooth animation (basic slideUp exists but needs more personality)
- Send button has no press feedback
- Typing indicator is generic

#### Changes
1. **Action card entrance**: Keep existing `slideUp 0.4s ease-out` but add `opacity: 0` initial state and `animation-fill-mode: forwards` to ensure smooth appearance
2. **Send button press**: Add `transition: 'transform 0.1s ease'` and `:active { transform: scale(0.92) }` via inline onMouseDown/onMouseUp:
   ```js
   onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
   onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
   ```
3. **Typing indicator enhancement**: Replace the current `<Loader>` spinner with 3 animated dots:
   ```jsx
   <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
     {[0, 1, 2].map(i => (
       <div key={i} style={{
         width: 6, height: 6, borderRadius: '50%', background: '#7c3aed',
         animation: 'float 1.2s ease-in-out infinite',
         animationDelay: `${i * 0.15}s`
       }} />
     ))}
   </div>
   ```
4. **Category pill bar**: Add `animation: 'fadeIn 0.5s ease-out'` with stagger per pill
5. **Message bubble entrance**: Each message should use `animation: 'scaleIn 0.2s ease-out'` instead of just fadeIn
6. **Logged count badge**: When count changes, briefly pulse the badge: `animation: 'bounceIn 0.3s ease-out'`

---

### 3D. ANALYTICS (`src/pages/Analytics.jsx`)

#### Current Issues
- Month selector buttons are flat
- Highlight cards all appear at once
- Charts pop in without transition

#### Changes
1. **Month selector active button**: Add `boxShadow: '0 0 12px rgba(124,58,237,0.4)'` to the active month button
2. **Highlight stat cards**: Stagger entrance with `scaleIn 0.3s ease-out` and delays (0s, 0.05s, 0.1s, 0.15s)
3. **Best/worst month cards**: Add `slideInLeft` and `slideInRight` respectively
4. **Chart containers**: Add `animation: 'fadeIn 0.6s ease-out'` to chart wrapper divs
5. **Drill-down entrance**: When drill-down opens, use `scaleIn 0.3s ease-out`

---

### 3E. SAVINGS GOALS (`src/pages/SavingsGoals.jsx`)

#### Current Issues
- Goal cards appear all at once
- Progress ring animation is too simple
- "Add Money" transition is abrupt

#### Changes
1. **Goal card stagger**: Each GoalCard gets `animation: 'slideUp 0.4s ease-out'` with stagger delay by index
2. **Progress ring animation**: The SVG circle `strokeDasharray` currently uses `transition: 'stroke-dasharray 1s ease'`. Change to `transition: 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)'` for a more satisfying fill
3. **Progress ring glow**: Add a drop shadow filter to the progress circle: `filter: 'drop-shadow(0 0 6px ${color}40)'`
4. **Add money panel**: When `showAdd` toggles to true, wrap in a div with `animation: 'slideUp 0.25s ease-out'`
5. **Summary stat cards**: Stagger entrance with `scaleIn`

---

### 3F. BILL CALENDAR (`src/pages/BillCalendar.jsx`)

#### Current Issues
- Calendar cells are static
- Bill list items appear without animation
- Mark Paid button has no feedback

#### Changes
1. **Calendar cell hover**: Add `transition: 'all 0.15s ease'` and on hover: `background: '#7c3aed10'` and `transform: 'scale(1.05)'`
2. **Today cell**: Add `animation: 'borderGlow 2s ease-in-out infinite'` to the "today" cell
3. **Bill list item stagger**: Each bill card gets `slideInRight 0.3s ease-out` with stagger
4. **Mark Paid button**: Add press animation and briefly flash green on success:
   ```js
   style={{ transition: 'all 0.2s ease' }}
   onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
   onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
   ```
5. **Overdue bills**: Add a subtle `animation: 'glowPulse 2s ease-in-out infinite'` with red color variant to overdue bill cards

---

### 3G. AI CHAT (`src/pages/AIChat.jsx`)

#### Current Issues
- Quick prompt buttons are flat
- Chat bubbles pop in without smooth animation
- Loading dots need more personality

#### Changes
1. **Quick prompt buttons**: Add `transition: 'all 0.2s ease'` and on hover: `transform: 'translateY(-2px)'` and `boxShadow: '0 4px 12px rgba(124,58,237,0.2)'`
2. **Chat bubble entrance**: Each message uses `animation: 'scaleIn 0.2s ease-out'`
3. **Loading dots**: Already has pulse animation — change to `float` animation for a more organic feel
4. **Input focus glow**: When input is focused, add `boxShadow: '0 0 0 2px rgba(124,58,237,0.3)'` transition

---

### 3H. SETTINGS (`src/pages/Settings.jsx`)

#### Current Issues
- Sections appear all at once
- Save button has no feedback animation

#### Changes
1. **Section stagger**: Each `<Section>` gets `slideUp 0.4s ease-out` with stagger
2. **Save button success**: When saved, the button should briefly flash green and scale up:
   ```js
   style={{
     ...existingStyles,
     transition: 'all 0.3s ease',
     background: saved === id ? '#10b981' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
     transform: saved === id ? 'scale(1.05)' : 'scale(1)',
   }}
   ```
3. **Sync button spin**: Already has spin animation — ensure it's smooth with `animation: 'spinnerRotate 0.8s linear infinite'`
4. **Category pills**: Add entrance stagger animation

---

### 3I. ONBOARDING (`src/pages/Onboarding.jsx`)

#### Current Issues
- Logo doesn't animate
- Chat panel appears instantly

#### Changes
1. **Logo bounce**: `animation: 'bounceIn 0.6s ease-out'`
2. **Chat panel entrance**: `animation: 'scaleIn 0.3s ease-out'`
3. **Message bubble animation**: Same `scaleIn 0.2s` as AI Chat
4. **Skip button**: Add subtle hover effect: `color: '#a78bfa'` on hover

---

## 4. SIDEBAR IMPROVEMENTS (`src/components/Sidebar.jsx`)

#### Current Issues
- Nav items have basic hover but no smooth transition
- Level bar fills instantly on load
- No visual distinction for AI-built sections

#### Changes
1. **Nav item transitions**: Already has `transition: 'all 0.15s'` — keep it but add hover scale: `transform: 'scale(1.02)'` on hover
2. **Active item indicator**: Add a small animated dot or vertical bar with `animation: 'glowPulse 2s infinite'` to the left border of the active item
3. **Level bar fill**: Add `animation: 'slideInLeft 1s ease-out'` to the XP progress bar fill on mount
4. **AI-built section label**: Add a small pulsing `✨` emoji with `animation: 'float 2s ease-in-out infinite'`
5. **Logo glow**: Add `animation: 'glowPulse 3s ease-in-out infinite'` to the sidebar logo icon

---

## 5. HEADER IMPROVEMENTS (`src/components/Header.jsx`)

#### Current Issues
- Health score badge is static
- Buttons have no press feedback

#### Changes
1. **Health score badge**: Add `transition: 'all 0.3s ease'` and subtle `boxShadow` on hover
2. **Sync button rotation**: Already works — ensure `animation: 'spinnerRotate 0.8s linear infinite'` is used
3. **Notification bell**: When unread exists, add `animation: 'float 1.5s ease-in-out infinite'` to the red dot
4. **AI insight badge**: Add `animation: 'borderGlow 2s ease-in-out infinite'` for a subtle glow
5. **All header buttons**: Add `transition: 'all 0.15s ease'` and `transform: 'scale(0.95)'` on active

---

## 6. LAYOUT FIXES

### Misaligned Buttons — Known Issues

1. **Dashboard "Log Expense" button**: Verify vertical alignment with the "BUDGET STATUS" label. The button should be perfectly vertically centered with the label using `alignItems: 'center'` on the parent flex container.

2. **AI Logger Send button**: The send button height should exactly match the textarea height. Set both to use consistent padding. Send button: `padding: '12px 20px'` → verify it aligns with the 2-row textarea.

3. **AI Logger Camera button**: The camera button inside the textarea is absolutely positioned at `right: 12px, bottom: 12px`. Verify it doesn't overlap text when the textarea has content.

4. **Bill Calendar "Mark Paid" buttons**: Ensure consistent button width across all bill cards. Set `minWidth: '90px'` on the button to prevent layout shift between "Mark Paid ✓" and "Undo" text.

5. **Settings Save buttons**: The `SaveButton` should align to the right edge of its section. Ensure the parent has `justifyContent: 'flex-end'` or `'space-between'` properly set.

6. **Savings Goals "Add Money" input row**: The input, "Add" button, and "X" button should be the same height. Set all to `height: '36px'` explicitly.

7. **Sidebar collapse**: When collapsed (56px), ensure all icon-only nav items are perfectly centered. Set `justifyContent: 'center'` on collapsed items.

8. **Main content area**: The `marginLeft` transition when sidebar collapses (220px → 56px) should be smooth. Already has `transition: 'margin-left 0.3s ease'` — verify it works with all page content.

---

## 7. RESPONSIVE CONSIDERATIONS

Even though this is primarily a desktop app, ensure:
1. **Dashboard grid**: The `gridTemplateColumns: '1fr 300px'` layout should not break if viewport narrows. Add `minWidth: 0` to the left column to prevent overflow.
2. **Analytics 4-column highlight grid**: On narrower viewports, the `repeat(4, 1fr)` might squish cards. Consider adding `minWidth: '140px'` per card.
3. **KPI cards grid**: The `1fr 1fr` grid should maintain equal heights. Already correct but verify.

---

## 8. MICRO-INTERACTION SUMMARY TABLE

| Element | Current | Target Animation | Duration | Easing |
|---------|---------|-----------------|----------|--------|
| Page entrance | `slideUp 0.35s` | Keep | 0.35s | ease-out |
| KPI cards | No stagger | `scaleIn` + stagger | 0.4s | ease-out |
| Category bars | No entrance | `slideInLeft` + stagger | 0.3s | ease-out |
| Bar fills | `width 0.8s ease` | `width 1.2s cubic-bezier` | 1.2s | cubic-bezier(0.4,0,0.2,1) |
| Action cards | `slideUp 0.4s` | Keep + opacity fix | 0.4s | ease-out |
| Buttons | No press | `scale(0.92)` on press | 0.1s | ease |
| Logger buttons | No spinner | Spinner + disable | — | — |
| Health score | Static number | Count-up animation | 1.5s | linear |
| Progress rings | `1s ease` | `1.5s cubic-bezier` | 1.5s | cubic-bezier(0.4,0,0.2,1) |
| Chat bubbles | `fadeIn 0.3s` | `scaleIn 0.2s` | 0.2s | ease-out |
| Quick prompts | No hover | `translateY(-2px)` + shadow | 0.2s | ease |
| Sidebar active | Border glow | Animated glow pulse | 2s | infinite |
| Login logo | Static | `bounceIn` | 0.6s | ease-out |
| Calendar today | Static border | `borderGlow` infinite | 2s | infinite |
| Net worth card | Static | `borderGlow` infinite | 3s | infinite |
| Save button | Text swap | Scale + color flash | 0.3s | ease |

---

## 9. COLOR & VISUAL CONSTANTS (Reference)

These are the established design tokens — use them consistently:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a14` | Body, deepest background |
| `bg-card` | `#12121f` | Card backgrounds |
| `bg-elevated` | `#1a1a2e` | Elevated surfaces, chat bubbles |
| `border-default` | `#1e1e35` | Default borders |
| `border-active` | `#7c3aed40` | Active/hover borders |
| `text-primary` | `#e2e8f0` | Main text |
| `text-secondary` | `#94a3b8` | Secondary text |
| `text-muted` | `#64748b` | Labels, descriptions |
| `text-dim` | `#475569` | Disabled/dim text |
| `text-ghost` | `#334155` | Japanese subtitles |
| `purple` | `#7c3aed` | Primary accent |
| `purple-light` | `#a78bfa` | Active text, highlights |
| `cyan` | `#06b6d4` | Secondary accent, income |
| `pink` | `#f472b6` | Expenses, tertiary |
| `gold` | `#fbbf24` | Warnings, streaks |
| `green` | `#10b981` | Success, savings |
| `red` | `#ef4444` | Danger, over-budget |
| `orange` | `#f59e0b` | Warning states |
| `gradient-primary` | `linear-gradient(135deg, #7c3aed, #06b6d4)` | Buttons, logos |
| `gradient-text` | `linear-gradient(135deg, #a78bfa, #06b6d4, #f472b6)` | Headings |

---

## 10. IMPLEMENTATION ORDER (Recommended)

1. **`index.css`** — Add all new keyframes and utility classes
2. **`AILogger.jsx`** — Add loading spinners to all action buttons (highest priority fix)
3. **`Dashboard.jsx`** — Stagger animations, health score counter, bar fill improvements
4. **`Sidebar.jsx`** — Active glow, XP bar animation, logo glow
5. **`Header.jsx`** — Button press effects, notification pulse
6. **`Login.jsx`** — Logo bounce, shimmer title, stagger features
7. **`Analytics.jsx`** — Card staggers, chart fade-ins
8. **`SavingsGoals.jsx`** — Ring glow, card stagger, add-money animation
9. **`BillCalendar.jsx`** — Calendar cell hover, today glow, bill stagger
10. **`AIChat.jsx`** — Bubble animations, quick prompt hover
11. **`Onboarding.jsx`** — Logo bounce, panel entrance
12. **`Settings.jsx`** — Section stagger, save button flash
13. **Layout fixes** — Button alignment pass across all pages

---

## FINAL CHECKLIST BEFORE COMMITTING

- [ ] All `confirm*` buttons in AILogger show spinner when submitting
- [ ] All `confirm*` buttons are disabled during submission (no double-click)
- [ ] No Tailwind classes added anywhere
- [ ] No new npm dependencies added
- [ ] All animations use CSS keyframes from `index.css` or inline `transition`
- [ ] No business logic changed (cross-reference Blueprint 1)
- [ ] All pages still render correctly with no data (empty state)
- [ ] Sidebar collapse/expand transition still smooth
- [ ] All action creators (`addExpense`, `deleteExpense`, etc.) still called with same args
- [ ] `useReducer` and all dispatch calls unchanged
- [ ] No changes to `proxyService.js`, `aiService.js`, `categoryEngine.js`, `googleAuth.js`, `config.js`, or `Code.gs`
