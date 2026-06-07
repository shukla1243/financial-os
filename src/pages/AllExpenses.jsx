import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Trash2, Calendar, Filter, ArrowUpDown } from 'lucide-react';

export default function AllExpenses() {
  const { state, deleteExpense } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete "${expense.description}" for ₹${expense.amount}?`)) return;
    setDeletingId(expense.id);
    try {
      await deleteExpense(expense);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const categories = ['All', ...Object.keys(state.config.budgets)];
  const modes = ['All', 'UPI', 'Cash', 'Auto-debit', 'Bank Transfer', 'Credit Card'];

  // Filter and sort tracker rows
  const filteredExpenses = state.tracker
    .filter(item => {
      const matchSearch = (item.description || '').toLowerCase().includes(search.toLowerCase()) || 
                          (item.note || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchMode = selectedMode === 'All' || item.mode === selectedMode;
      return matchSearch && matchCat && matchMode;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        const dateA = new Date(`${a.month} ${a.date}, ${a.year}`);
        const dateB = new Date(`${b.month} ${b.date}, ${b.year}`);
        return dateB - dateA;
      }
      if (sortBy === 'date-asc') {
        const dateA = new Date(`${a.month} ${a.date}, ${a.year}`);
        const dateB = new Date(`${b.month} ${b.date}, ${b.year}`);
        return dateA - dateB;
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TRANSACTIONS</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary-color)80', letterSpacing: '2px' }}>取引明細一覧 — All logged expenses & records</div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Search */}
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              style={{ paddingLeft: '36px', height: '40px' }}
              className="input-dark"
              placeholder="Search descriptions, merchants..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ height: '40px', padding: '0 12px', width: '100%', outline: 'none' }}
            >
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? '📁 All Categories' : c}</option>)}
            </select>
          </div>

          {/* Mode Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
              style={{ height: '40px', padding: '0 12px', width: '100%', outline: 'none' }}
            >
              {modes.map(m => <option key={m} value={m}>{m === 'All' ? '💳 All Modes' : m}</option>)}
            </select>
          </div>

          {/* Sort Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ height: '40px', padding: '0 12px', width: '100%', outline: 'none' }}
            >
              <option value="date-desc">📅 Date: Newest First</option>
              <option value="date-asc">📅 Date: Oldest First</option>
              <option value="amount-desc">💰 Amount: High to Low</option>
              <option value="amount-asc">💰 Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No matching transactions found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Mode</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Notes</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="nav-item"
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s ease',
                      borderRadius: 0,
                      display: 'table-row',
                      cursor: 'default',
                      color: 'var(--text-main)'
                    }}
                  >
                    {/* Date */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={13} color="var(--primary-color)" />
                        <span>
                          {item.date
                            ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : `${item.date} ${item.month} ${item.year}`}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(124,58,237,0.1)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {item.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                      {item.description}
                    </td>

                    {/* Mode */}
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {item.mode}
                    </td>

                    {/* Notes */}
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.note || '—'}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--accent-color)' }}>
                      ₹{item.amount.toLocaleString()}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                          color: '#ef4444',
                          opacity: deletingId === item.id ? 0.4 : 0.8,
                          transition: 'opacity 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px'
                        }}
                        onMouseEnter={e => { if (deletingId !== item.id) e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { if (deletingId !== item.id) e.currentTarget.style.opacity = '0.8'; }}
                      >
                        {deletingId === item.id ? (
                          <div className="spinner spinner-sm spinner-purple" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
