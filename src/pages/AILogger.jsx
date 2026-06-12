import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { buildDynamicSystemPrompt, parseExpensesForNewCategories, suggestNewCategory } from '../services/categoryEngine';
import { Send, Camera, Check, X, Edit3, Loader, Zap, Plus } from 'lucide-react';
import { callAI } from '../services/aiService';
import { sanitizeAITextForDisplay } from '../services/aiOutputGuard';
import { extractJsonObject } from '../services/aiJson';
import { guardParsedActions } from '../services/aiActionGuard';

function getCatIcon(cat) {
  const iconMap = {
    Housing: '🏠', Food: '🍱', Health: '💪', Telecom: '📡',
    Subscriptions: '📱', Transport: '⛽', Savings: '💾', Other: '📦',
    Wellness: '🧘', Education: '📚', Entertainment: '🎮', Shopping: '🛍️',
    Travel: '✈️', 'Pet Care': '🐾', Beauty: '💄', Sports: '🏃',
  };
  return iconMap[cat] || '📦';
}

// ── New Category Proposal Card ──────────────────────────────────────────────
function NewCategoryCard({ expense, suggestion, onAccept, onReject, onBudgetChange, submitting }) {
  const [budget, setBudget] = useState(suggestion?.budget || 1000);
  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#0f1a2e', border: '2px solid #06b6d440' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#06b6d420' }}>
          {suggestion?.icon || '✨'}
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 700, letterSpacing: '1px' }}>
            ✨ NEW CATEGORY DETECTED
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{suggestion?.reason}</div>
        </div>
      </div>

      <div style={{ borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#06b6d410' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category Name</span>
          <span style={{ fontSize: '13px', color: '#06b6d4', fontWeight: 700 }}>
            {suggestion?.icon} {suggestion?.categoryName || expense.suggestedCategoryName}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>This Expense</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>₹{expense.amount?.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Budget</span>
          <input
            type="number"
            value={budget}
            disabled={submitting}
            onChange={e => { setBudget(parseFloat(e.target.value) || 0); onBudgetChange(parseFloat(e.target.value) || 0); }}
            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', textAlign: 'right', width: '100px', padding: '4px 8px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Creating this category will add it to your dashboard, analytics, and AI logger — permanently, no code changes needed.
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onAccept(budget)}
          disabled={submitting}
          style={{ color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #06b6d4, #7c3aed)', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? <div className="spinner spinner-sm" /> : <Plus size={14} />} Create Category & Log
        </button>
        <button
          onClick={onReject}
          disabled={submitting}
          style={{ background: 'transparent', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', borderColor: '#ef444440', color: '#ef4444', border: '1px solid #ef444440', opacity: submitting ? 0.5 : 1 }}
        >
          <X size={14} /> Log as Other
        </button>
      </div>
    </div>
  );
}

// ── Regular Expense Card ────────────────────────────────────────────────────
function ExpenseCard({ expense, budgets, onConfirm, onEdit, onCancel, editing, onEditChange, submitting }) {
  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: 'var(--bg-main)', border: '1px solid #7c3aed40' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>{getCatIcon(expense.category)}</span>
        <div>
          <div style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600, letterSpacing: '1px' }}>EXPENSE DETECTED</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{expense.date}</div>
        </div>
      </div>

      {expense.isDuplicate && (
        <div style={{ borderRadius: '8px', padding: '10px', marginBottom: '12px', background: '#ef444415', border: '1px solid #ef444430', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>⚠️ Possible Duplicate: Already logged in your sheet.</span>
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {[
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount (₹)', type: 'number' },
            { key: 'category', label: 'Category' },
            { key: 'mode', label: 'Payment Mode' },
            ...(expense.odometer ? [{ key: 'odometer', label: 'Odometer', type: 'number' }] : []),
            ...(expense.pricePerLitre ? [{ key: 'pricePerLitre', label: 'Fuel Rate', type: 'number' }] : []),
          ].map(({ key, label, type }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '80px', flexShrink: 0 }}>{label}</span>
              <input
                type={type || 'text'}
                value={expense[key]}
                disabled={submitting}
                onChange={e => onEditChange(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '14px', padding: '6px 10px' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Category', value: expense.category },
            { label: 'Description', value: expense.description },
            { label: 'Amount', value: `₹${expense.amount?.toLocaleString()}`, highlight: true },
            { label: 'Mode', value: expense.mode },
            ...(expense.odometer ? [{ label: 'Odometer', value: `${expense.odometer} km` }] : []),
            ...(expense.pricePerLitre ? [{ label: 'Fuel Rate', value: `₹${expense.pricePerLitre}/L` }] : []),
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '13px', color: highlight ? '#10b981' : 'var(--text-main)', fontWeight: highlight ? 700 : 500 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)40' }}>
        <button onClick={onConfirm} disabled={submitting} style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? <div className="spinner spinner-sm" /> : <Check size={14} />} {expense.isDuplicate ? 'Log Anyway' : 'Log it'}
        </button>
        <button onClick={onEdit} disabled={submitting} style={{ background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed40', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.5 : 1 }}>
          <Edit3 size={14} /> Edit
        </button>
        <button onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1px solid #ef444440', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: '#ef4444', opacity: submitting ? 0.5 : 1 }}>
          <X size={14} /> Ignore
        </button>
      </div>
    </div>
  );
}

// ── Income Card ─────────────────────────────────────────────────────────────
function IncomeCard({ income, onConfirm, onEdit, onCancel, editing, onEditChange, submitting }) {
  const getIncomeIcon = (type) => {
    const iconMap = { Salary: '💼', HomeIncome: '🏠', Freelance: '💻', Other: '🪙' };
    return iconMap[type] || '🪙';
  };

  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#121f1a', border: '1px solid #10b98140' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>{getIncomeIcon(income.type)}</span>
        <div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, letterSpacing: '1px' }}>INCOME DETECTED</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{income.date}</div>
        </div>
      </div>

      {income.isDuplicate && (
        <div style={{ borderRadius: '8px', padding: '10px', marginBottom: '12px', background: '#ef444415', border: '1px solid #ef444430', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>⚠️ Possible Duplicate: Already logged in your sheet.</span>
        </div>
      )}

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {[
            { key: 'source', label: 'Source' },
            { key: 'amount', label: 'Amount (₹)', type: 'number' },
            { key: 'type', label: 'Type' },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '80px', flexShrink: 0 }}>{label}</span>
              <input
                type={type || 'text'}
                value={income[key]}
                disabled={submitting}
                onChange={e => onEditChange(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', width: '100%', fontSize: '14px', padding: '6px 10px' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Source', value: income.source },
            { label: 'Amount', value: `₹${income.amount?.toLocaleString()}`, highlight: true },
            { label: 'Type', value: income.type },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '13px', color: highlight ? '#10b981' : 'var(--text-main)', fontWeight: highlight ? 700 : 500 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)40' }}>
        <button onClick={onConfirm} disabled={submitting} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? <div className="spinner spinner-sm" /> : <Check size={14} />} {income.isDuplicate ? 'Log Anyway' : 'Log Income'}
        </button>
        <button onClick={onEdit} disabled={submitting} style={{ background: 'transparent', color: '#10b981', border: '1px solid #10b98140', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.5 : 1 }}>
          <Edit3 size={14} /> Edit
        </button>
        <button onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1px solid #ef444440', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: '#ef4444', opacity: submitting ? 0.5 : 1 }}>
          <X size={14} /> Ignore
        </button>
      </div>
    </div>
  );
}

// ── Savings Goal Proposal Card ──────────────────────────────────────────────
function GoalUpdateCard({ goalUpdate, onConfirm, onCancel, submitting }) {
  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#2e250f', border: '1px solid #fbbf2440' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div>
          <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600, letterSpacing: '1px' }}>GOAL UPDATE DETECTED</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Savings Goal Action</div>
        </div>
      </div>

      <div style={{ borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#fbbf2410' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Goal Name</span>
          <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 700 }}>{goalUpdate.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Action</span>
          <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 500 }}>
            {goalUpdate.action === 'add' ? `Add ₹${goalUpdate.amount?.toLocaleString()}` : `Set total to ₹${goalUpdate.saved?.toLocaleString()}`}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>New Saved Total</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>₹{goalUpdate.saved?.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onConfirm} disabled={submitting} style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? <div className="spinner spinner-sm" style={{ borderTopColor: '#000' }} /> : <Check size={14} />} Confirm Goal Update
        </button>
        <button onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1px solid #ef444440', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: '#ef4444', opacity: submitting ? 0.5 : 1 }}>
          <X size={14} /> Ignore
        </button>
      </div>
    </div>
  );
}

// ── Bill Payment Proposal Card ──────────────────────────────────────────────
function BillPaymentCard({ billUpdate, onConfirm, onCancel, submitting }) {
  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#0f2e24', border: '1px solid #10b98140' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>📅</span>
        <div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, letterSpacing: '1px' }}>BILL PAYMENT DETECTED</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bill Calendar Action</div>
        </div>
      </div>

      <div style={{ borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#10b98110' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bill Name</span>
          <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 700 }}>{billUpdate.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount Paid</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 700 }}>₹{billUpdate.amount?.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status Change</span>
          <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>Unpaid → Paid</span>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Confirming will mark the bill as paid in your calendar AND automatically log a corresponding expense transaction.
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onConfirm} disabled={submitting} style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? <div className="spinner spinner-sm" /> : <Check size={14} />} Mark Paid & Log Expense
        </button>
        <button onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1px solid #ef444440', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: '#ef4444', opacity: submitting ? 0.5 : 1 }}>
          <X size={14} /> Ignore
        </button>
      </div>
    </div>
  );
}

// ── Delete Proposal Card ────────────────────────────────────────────────────
function DeleteProposalCard({ deletion, onConfirm, onCancel, submitting }) {
  return (
    <div style={{ animation: 'slideUp 0.4s ease-out', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#2e0f15', border: '1px solid #ef444440' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>🗑️</span>
        <div>
          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, letterSpacing: '1px' }}>DELETE EXPENSE</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Remove Duplicate from Sheet</div>
        </div>
      </div>

      <div style={{ borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#ef444410' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date</span>
          <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 500 }}>{deletion.date}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Description</span>
          <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 700 }}>{deletion.description}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount</span>
          <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>₹{deletion.amount?.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onConfirm} disabled={submitting} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '12px', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? <div className="spinner spinner-sm" /> : <Check size={14} />} Confirm Delete
        </button>
        <button onClick={onCancel} disabled={submitting} style={{ background: 'transparent', border: '1px solid var(--text-muted)40', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', opacity: submitting ? 0.5 : 1 }}>
          <X size={14} /> Keep it
        </button>
      </div>
    </div>
  );
}

function Message({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
      {msg.role === 'ai' && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', flexShrink: 0, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', marginTop: '2px' }}>
          <Zap size={12} color="white" />
        </div>
      )}
      <div
        style={{
          padding: '10px 16px', borderRadius: '16px', maxWidth: '320px',
          background: msg.role === 'user' ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'var(--bg-main)',
          color: 'var(--text-main)', fontSize: '13px', lineHeight: '1.5',
          border: msg.role === 'ai' ? '1px solid var(--border-color)' : 'none',
          borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
          borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

export default function AILogger() {
  const { state, addExpense, deleteExpense, addNewCategory, addIncome, updateGoal, updateBill, addMemoryFact } = useApp();
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hey! Just tell me what you spent or earned — I'll handle the rest. New categories? Goals? Bills? I'll build buttons for whatever you need! 🚀" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingActions, setSubmittingActions] = useState({});
  
  // Pending action lists
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [pendingNewCategories, setPendingNewCategories] = useState([]);
  const [pendingIncome, setPendingIncome] = useState([]);
  const [pendingGoals, setPendingGoals] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  
  // Edit indices
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingIncomeIndex, setEditingIncomeIndex] = useState(null);
  
  const [loggedCount, setLoggedCount] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingExpenses, pendingNewCategories, pendingIncome, pendingGoals, pendingBills]);

  const parseWithGemini = async (text, history = []) => {
    if (!state.geminiKey) return { error: 'No OpenRouter API key set. Contact your system admin to configure it.' };
    try {
      const systemPrompt = buildDynamicSystemPrompt(state);
      const contents = history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      }));
      contents.push({ role: 'user', content: text });

      const data = await callAI({
        systemInstruction: systemPrompt,
        contents: contents,
        temperature: 0.1,
        maxTokens: 1000,
        key: state.geminiKey,
      });
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try {
        return extractJsonObject(raw);
      } catch (parseError) {
        const retryData = await callAI({
          systemInstruction: `${systemPrompt}\n\nCRITICAL RETRY: The previous response was not valid JSON. Return only the required JSON object. Do not say that anything was logged.`,
          contents: [...contents, { role: 'assistant', content: raw }, { role: 'user', content: 'Return the requested action as valid JSON only.' }],
          temperature: 0,
          maxTokens: 1000,
          key: state.geminiKey,
        });
        const retryRaw = retryData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        try {
          return extractJsonObject(retryRaw);
        } catch (retryParseError) {
          return { error: 'AI returned a chat reply instead of structured transaction data. Nothing was logged. Please try again.' };
        }
      }
    } catch (e) {
      return { error: e.message };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Background call to parse user profile updates
    import('../services/aiService').then(({ extractProfileFact }) => {
      extractProfileFact(userMsg, state.geminiKey).then(fact => {
        if (fact) {
          addMemoryFact(fact);
        }
      });
    }).catch(() => {});

    try {
      const parsedResult = await parseWithGemini(userMsg, messages);
      const result = guardParsedActions(parsedResult, userMsg, state);
      if (result.error) {
        setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${result.error}` }]);
        return;
      }
      if (result.needsClarification) {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: sanitizeAITextForDisplay(result.clarificationQuestion),
        }]);
        return;
      }

      let foundAction = false;

      // 1. Process Expenses
      if (result.expenses?.length > 0) {
        foundAction = true;
        const { regular: knownCategoryExpenses, newCategoryExpenses } = parseExpensesForNewCategories(
          result.expenses,
          state.config.budgets
        );
        const regular = [...knownCategoryExpenses];

        if (newCategoryExpenses.length > 0) {
          const proposals = await Promise.all(newCategoryExpenses.map(async expense => {
            const suggestion = await suggestNewCategory(
              state.geminiKey,
              expense,
              Object.keys(state.config.budgets)
            );
            return { expense, suggestion };
          }));
          setPendingNewCategories(prev => [...prev, ...proposals]);
          setMessages(prev => [...prev, {
            role: 'ai',
            text: 'I found a possible new category. Confirm it before I create or log anything.'
          }]);
        }

        if (regular.length > 0) {
          setMessages(prev => [...prev, { role: 'ai', text: regular.length > 1 ? `Found ${regular.length} expenses — confirm each one:` : "Got it! Here's what I captured:" }]);
          
          // Check for duplicate expenses in tracker
          const processedRegular = regular.map(exp => {
            const isDuplicate = state.tracker.some(t => 
              t.amount === exp.amount && 
              t.description.toLowerCase() === exp.description.toLowerCase() &&
              (t.date === exp.date || t.month === exp.month)
            );
            return { ...exp, isDuplicate };
          });
          setPendingExpenses(prev => [...prev, ...processedRegular]);
        }
      }

      // 2. Process Income
      if (result.income?.length > 0) {
        foundAction = true;
        setMessages(prev => [...prev, { role: 'ai', text: result.income.length > 1 ? `Found ${result.income.length} income entries — confirm each one:` : "I parsed an income transaction. Confirm:" }]);
        
        // Check for duplicate income
        const processedIncome = result.income.map(inc => {
          const isDuplicate = state.income.some(i => 
            i.amount === inc.amount && 
            i.source.toLowerCase() === inc.source.toLowerCase() &&
            i.date === inc.date
          );
          return { ...inc, isDuplicate };
        });
        setPendingIncome(prev => [...prev, ...processedIncome]);
      }

      // 3. Process Savings Goals updates
      if (result.goals?.length > 0) {
        foundAction = true;
        setMessages(prev => [...prev, { role: 'ai', text: "Parsed savings goals updates. Confirm details:" }]);
        setPendingGoals(prev => [...prev, ...result.goals]);
      }

      // 4. Process Bill Payments
      if (result.bills?.length > 0) {
        foundAction = true;
        setMessages(prev => [...prev, { role: 'ai', text: "Parsed bill calendar updates. Confirm details:" }]);
        setPendingBills(prev => [...prev, ...result.bills]);
      }

      // 5. Process Deletions
      if (result.deletions?.length > 0) {
        foundAction = true;
        setMessages(prev => [...prev, { role: 'ai', text: `Found ${result.deletions.length} matching expenses. Select which ones to delete:` }]);
        setPendingDeletions(prev => [...prev, ...result.deletions]);
      }

      if (!foundAction) {
        setMessages(prev => [...prev, { role: 'ai', text: "I couldn't parse that. Try including an action, amount, and category." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Make sure AI is fully configured.' }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmExpense = async (expense) => {
    const key = `exp-${expense.date}-${expense.amount}-${expense.description}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      await addExpense(expense);
      setPendingExpenses(prev => prev.filter(e => e !== expense));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Logged ₹${expense.amount?.toLocaleString()} for "${expense.description}". Anything else?` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelExpense = (expense) => {
    setPendingExpenses(prev => prev.filter(e => e !== expense));
    setMessages(prev => [...prev, { role: 'ai', text: 'Got it, ignored that one.' }]);
  };

  const confirmIncome = async (incomeItem) => {
    const key = `inc-${incomeItem.date}-${incomeItem.amount}-${incomeItem.source}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      await addIncome(incomeItem);
      setPendingIncome(prev => prev.filter(i => i !== incomeItem));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Logged income of ₹${incomeItem.amount?.toLocaleString()} from "${incomeItem.source}". Anything else?` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelIncome = (incomeItem) => {
    setPendingIncome(prev => prev.filter(i => i !== incomeItem));
    setMessages(prev => [...prev, { role: 'ai', text: 'Ignored this income entry.' }]);
  };

  const confirmGoal = async (goalUpdate) => {
    const key = `goal-${goalUpdate.id}-${goalUpdate.saved}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      const originalGoal = state.savingsGoals.find(g => g.id === goalUpdate.id);
      if (!originalGoal) {
        setMessages(prev => [...prev, { role: 'ai', text: `❌ Could not find savings goal with ID ${goalUpdate.id}.` }]);
        setPendingGoals(prev => prev.filter(g => g !== goalUpdate));
        return;
      }
      const updatedGoal = { ...originalGoal, saved: goalUpdate.saved };
      await updateGoal(updatedGoal);
      setPendingGoals(prev => prev.filter(g => g !== goalUpdate));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Updated savings goal "${originalGoal.name}": Saved total is now ₹${goalUpdate.saved.toLocaleString()}.` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelGoal = (goalUpdate) => {
    setPendingGoals(prev => prev.filter(g => g !== goalUpdate));
    setMessages(prev => [...prev, { role: 'ai', text: 'Ignored goal update.' }]);
  };

  const confirmBill = async (billUpdate) => {
    const key = `bill-${billUpdate.id}-${billUpdate.amount}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      const originalBill = state.billCalendar.find(b => b.id === billUpdate.id);
      if (!originalBill) {
        setMessages(prev => [...prev, { role: 'ai', text: `❌ Could not find bill with ID ${billUpdate.id}.` }]);
        setPendingBills(prev => prev.filter(b => b !== billUpdate));
        return;
      }
      const updatedBill = { ...originalBill, status: 'Paid', lastPaid: new Date().toISOString().split('T')[0] };
      await updateBill(updatedBill);

      // Auto-log bill payment as an expense in state.tracker
      const todayObj = new Date();
      const dayStr = todayObj.toLocaleString('default', { weekday: 'short' });
      const fullDateStr = todayObj.toISOString().split('T')[0];
      await addExpense({
        month: state.config.activeMonth,
        year: state.config.activeYear,
        day: dayStr,
        date: fullDateStr,
        category: originalBill.category,
        description: originalBill.name,
        amount: billUpdate.amount || originalBill.amount,
        mode: 'Auto-debit',
        note: 'Logged from AI Logger via Bill Pay',
      });

      setPendingBills(prev => prev.filter(b => b !== billUpdate));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Marked bill "${originalBill.name}" as Paid and logged corresponding expense.` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelBill = (billUpdate) => {
    setPendingBills(prev => prev.filter(b => b !== billUpdate));
    setMessages(prev => [...prev, { role: 'ai', text: 'Ignored bill payment.' }]);
  };

  const confirmDeletion = async (deletion) => {
    const key = `del-${deletion.date}-${deletion.amount}-${deletion.description}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      await deleteExpense(deletion);
      setPendingDeletions(prev => prev.filter(d => d !== deletion));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Deleted duplicate expense: ₹${deletion.amount?.toLocaleString()} for "${deletion.description}".` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const cancelDeletion = (deletion) => {
    setPendingDeletions(prev => prev.filter(d => d !== deletion));
    setMessages(prev => [...prev, { role: 'ai', text: 'Ignored deletion request.' }]);
  };

  const acceptNewCategory = async (item, confirmedBudget) => {
    const key = `newcat-${item.expense.date}-${item.expense.amount}-${item.expense.description}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      const catName = item.suggestion?.categoryName || item.expense.suggestedCategoryName;
      await addNewCategory(catName, confirmedBudget);
      const finalExpense = { ...item.expense, category: catName };
      await addExpense(finalExpense);
      setPendingNewCategories(prev => prev.filter(i => i !== item));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `✨ Created "${catName}" category (budget ₹${confirmedBudget.toLocaleString()}/mo) and logged ₹${item.expense.amount?.toLocaleString()}.`
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const rejectNewCategory = async (item) => {
    const key = `newcat-${item.expense.date}-${item.expense.amount}-${item.expense.description}`;
    if (submittingActions[key]) return;
    setSubmittingActions(prev => ({ ...prev, [key]: true }));
    try {
      const fallback = { ...item.expense, category: 'Other' };
      await addExpense(fallback);
      setPendingNewCategories(prev => prev.filter(i => i !== item));
      setLoggedCount(c => c + 1);
      setMessages(prev => [...prev, { role: 'ai', text: `Logged ₹${item.expense.amount?.toLocaleString()} under Other.` }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingActions(prev => ({ ...prev, [key]: false }));
    }
  };

  const editExpense = (index) => setEditingIndex(editingIndex === index ? null : index);
  const handleEditChange = (index, key, value) => {
    setPendingExpenses(prev => prev.map((e, i) => i === index ? { ...e, [key]: value } : e));
  };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out both', height: '100%', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 130px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#06b6d4' }}>AI EXPENSE LOGGER</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7c3aed80', letterSpacing: '2px' }}>自然言語で支出を記録 — Self-evolving categories 🧬</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {state.sheetsConfig.connected && (
            <div style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: '#10b98120', color: '#10b981' }}>⚡ Sheets Live</div>
          )}
          {loggedCount > 0 && (
            <div style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: '#10b98120', color: '#10b981' }}>{loggedCount} logged</div>
          )}
        </div>
      </div>

      {!state.geminiKey && (
        <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '16px', animation: 'slideUp 0.4s ease-out both', background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
          <span style={{ fontSize: '13px', color: '#fbbf24' }}>
            ⚙️ OpenRouter API key is missing. Contact system administrator to configure it.
          </span>
        </div>
      )}

      {/* Category pill bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.keys(state.config.budgets).map(cat => (
          <span key={cat} style={{ fontSize: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px' }}>
            {getCatIcon(cat)} {cat}
          </span>
        ))}
        <span style={{ fontSize: '10px', background: '#06b6d410', border: '1px solid #06b6d430', color: '#06b6d4', padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px' }}>
          ✨ +New auto-creates
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '4px', minHeight: 0 }}>
        <div style={{ padding: '8px 0' }}>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {/* NEW category proposal cards */}
          {pendingNewCategories.map((item, i) => {
            const key = `newcat-${item.expense.date}-${item.expense.amount}-${item.expense.description}`;
            return (
              <NewCategoryCard
                key={`newcat-${i}`}
                expense={item.expense}
                suggestion={item.suggestion}
                onAccept={(budget) => acceptNewCategory(item, budget)}
                onReject={() => rejectNewCategory(item)}
                onBudgetChange={(b) => {
                  setPendingNewCategories(prev => prev.map((it, idx) => idx === i ? { ...it, budget: b } : it));
                }}
                submitting={submittingActions[key]}
              />
            );
          })}

          {/* Regular expense cards */}
          {pendingExpenses.map((expense, i) => {
            const key = `exp-${expense.date}-${expense.amount}-${expense.description}`;
            return (
              <ExpenseCard
                key={`exp-${i}`}
                expense={expense}
                budgets={state.config.budgets}
                editing={editingIndex === i}
                onConfirm={() => confirmExpense(expense)}
                onEdit={() => editExpense(i)}
                onCancel={() => cancelExpense(expense)}
                onEditChange={(key, val) => handleEditChange(i, key, val)}
                submitting={submittingActions[key]}
              />
            );
          })}

          {/* Pending income cards */}
          {pendingIncome.map((incomeItem, i) => {
            const key = `inc-${incomeItem.date}-${incomeItem.amount}-${incomeItem.source}`;
            return (
              <IncomeCard
                key={`inc-${i}`}
                income={incomeItem}
                editing={editingIncomeIndex === i}
                onConfirm={() => confirmIncome(incomeItem)}
                onEdit={() => setEditingIncomeIndex(editingIncomeIndex === i ? null : i)}
                onCancel={() => cancelIncome(incomeItem)}
                onEditChange={(key, val) => {
                  setPendingIncome(prev => prev.map((inc, idx) => idx === i ? { ...inc, [key]: val } : inc));
                }}
                submitting={submittingActions[key]}
              />
            );
          })}

          {/* Pending savings goal updates */}
          {pendingGoals.map((goalUpdate, i) => {
            const key = `goal-${goalUpdate.id}-${goalUpdate.saved}`;
            return (
              <GoalUpdateCard
                key={`goal-${i}`}
                goalUpdate={goalUpdate}
                onConfirm={() => confirmGoal(goalUpdate)}
                onCancel={() => cancelGoal(goalUpdate)}
                submitting={submittingActions[key]}
              />
            );
          })}

          {/* Pending bill calendar payments */}
          {pendingBills.map((billUpdate, i) => {
            const key = `bill-${billUpdate.id}-${billUpdate.amount}`;
            return (
              <BillPaymentCard
                key={`bill-${i}`}
                billUpdate={billUpdate}
                onConfirm={() => confirmBill(billUpdate)}
                onCancel={() => cancelBill(billUpdate)}
                submitting={submittingActions[key]}
              />
            );
          })}

          {/* Pending deletions */}
          {pendingDeletions.map((deletion, i) => {
            const key = `del-${deletion.date}-${deletion.amount}-${deletion.description}`;
            return (
              <DeleteProposalCard
                key={`del-${i}`}
                deletion={deletion}
                onConfirm={() => confirmDeletion(deletion)}
                onCancel={() => cancelDeletion(deletion)}
                submitting={submittingActions[key]}
              />
            );
          })}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
                <Zap size={12} color="white" />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: 'float 1.2s ease-in-out infinite', animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', resize: 'none', paddingRight: '48px', lineHeight: '1.5' }}
            placeholder="Describe a transaction, income entry, goal update, or bill payment..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button style={{ position: 'absolute', right: '12px', bottom: '12px', padding: '6px', borderRadius: '8px', background: '#7c3aed20', color: '#a78bfa', border: 'none', cursor: 'pointer' }} title="Upload receipt (coming soon)">
            <Camera size={16} />
          </button>
        </div>
        <button onClick={handleSend} disabled={!input.trim() || loading} onMouseDown={e => { if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(0.96)'; }} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'transform 0.1s ease' }}>
          <Send size={16} />
        </button>
      </div>
      <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
        Enter to send • Dynamic action cards created automatically 🧬
      </div>
    </div>
  );
}
