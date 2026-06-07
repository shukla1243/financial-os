/**
 * DYNAMIC SECTION RENDERER
 * Renders any AI-built section from _AppBlueprint config.
 * No hardcoded pages — reads from blueprint and renders universally.
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { readDynamicSheet, writeToDynamicSheet } from '../services/consciousnessEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const SECTION_CONFIGS = {
  vehicle: {
    title: '🚗 Vehicle OS',
    subtitle: 'クルマ — Mileage, fuel & cost tracking',
    metrics: [
      { label: 'TOTAL FUEL COST', field: 'FuelAmount', sum: true, prefix: '₹', color: '#f59e0b' },
      { label: 'LITRES FILLED', field: 'LitresFilled', sum: true, suffix: 'L', color: '#06b6d4' },
      { label: 'FILL-UPS', field: 'Date', count: true, color: '#a78bfa' },
      { label: 'AVG COST/FILL', field: 'FuelAmount', avg: true, prefix: '₹', color: '#10b981' },
    ],
    logFields: [
      { key: 'FuelAmount', label: 'Amount Spent (₹)', type: 'number', placeholder: '350' },
      { key: 'Odometer', label: 'Odometer Reading (km)', type: 'number', placeholder: '9690' },
      { key: 'PricePerLitre', label: 'Price per Litre (₹)', type: 'number', placeholder: '114' },
      { key: 'Note', label: 'Note', type: 'text', placeholder: 'Optional note' },
    ],
    chartField: 'FuelAmount',
    chartLabel: 'Fuel Spend (₹)',
  },
  health: {
    title: '💪 Health OS',
    subtitle: '健康 — Workout log & consistency',
    metrics: [
      { label: 'SESSIONS THIS MONTH', field: 'Date', count: true, color: '#10b981' },
      { label: 'TOTAL HEALTH SPEND', field: 'Cost', sum: true, prefix: '₹', color: '#f472b6' },
      { label: 'AVG COST/SESSION', field: 'Cost', avg: true, prefix: '₹', color: '#06b6d4' },
      { label: 'ACTIVITIES', field: 'Activity', unique: true, color: '#a78bfa' },
    ],
    logFields: [
      { key: 'Activity', label: 'Activity', type: 'text', placeholder: 'Gym, Run, Yoga...' },
      { key: 'Duration', label: 'Duration (mins)', type: 'number', placeholder: '60' },
      { key: 'Cost', label: 'Cost (₹)', type: 'number', placeholder: '0' },
      { key: 'Note', label: 'Note', type: 'text', placeholder: 'How was it?' },
    ],
    chartField: 'Cost',
    chartLabel: 'Health Spend (₹)',
  },
  medical: {
    title: '🩺 Medical Log',
    subtitle: '医療 — Health visits & medicine',
    metrics: [
      { label: 'MEDICAL SPEND', field: 'Amount', sum: true, prefix: '₹', color: '#ef4444' },
      { label: 'VISITS', field: 'Date', count: true, color: '#06b6d4' },
      { label: 'AVG SPEND', field: 'Amount', avg: true, prefix: '₹', color: '#f59e0b' },
      { label: 'TYPES', field: 'Type', unique: true, color: '#a78bfa' },
    ],
    logFields: [
      { key: 'Type', label: 'Type', type: 'select', options: ['Doctor Visit', 'Medicine', 'Test', 'Emergency', 'Other'] },
      { key: 'Description', label: 'Description', type: 'text', placeholder: 'What for?' },
      { key: 'Amount', label: 'Amount (₹)', type: 'number', placeholder: '500' },
      { key: 'Doctor', label: 'Doctor/Hospital', type: 'text', placeholder: 'Optional' },
    ],
    chartField: 'Amount',
    chartLabel: 'Medical Spend (₹)',
  },
  work: {
    title: '💼 Work OS',
    subtitle: '仕事 — Freelance & project earnings',
    metrics: [
      { label: 'EARNED THIS MONTH', field: 'Amount', sum: true, prefix: '₹', color: '#10b981' },
      { label: 'PROJECTS', field: 'Date', count: true, color: '#06b6d4' },
      { label: 'AVG PER PROJECT', field: 'Amount', avg: true, prefix: '₹', color: '#a78bfa' },
      { label: 'CLIENTS', field: 'Client', unique: true, color: '#f472b6' },
    ],
    logFields: [
      { key: 'Client', label: 'Client', type: 'text', placeholder: 'Client name' },
      { key: 'Amount', label: 'Amount Earned (₹)', type: 'number', placeholder: '5000' },
      { key: 'Status', label: 'Status', type: 'select', options: ['Received', 'Pending', 'Partial'] },
      { key: 'Note', label: 'Project', type: 'text', placeholder: 'What project?' },
    ],
    chartField: 'Amount',
    chartLabel: 'Earnings (₹)',
  },
};

function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function computeMetric(data, metricConfig) {
  const values = data.map(r => parseFloat(r[metricConfig.field] || 0)).filter(v => !isNaN(v));
  if (metricConfig.count) return data.length.toString();
  if (metricConfig.unique) return [...new Set(data.map(r => r[metricConfig.field]).filter(Boolean))].length.toString();
  if (metricConfig.sum) {
    const sum = values.reduce((a, b) => a + b, 0);
    return `${metricConfig.prefix || ''}${sum.toLocaleString()}${metricConfig.suffix || ''}`;
  }
  if (metricConfig.avg) {
    const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(0) : 0;
    return `${metricConfig.prefix || ''}${parseInt(avg).toLocaleString()}${metricConfig.suffix || ''}`;
  }
  return '0';
}

export default function DynamicSection({ sectionId }) {
  const { state } = useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const config = SECTION_CONFIGS[sectionId];
  const sheetRef = state.appBlueprint?.find(s => s.SectionID === sectionId)?.SheetRef || sectionId;

  useEffect(() => {
    if (state.sheetsConfig?.proxyUrl && state.user?.email) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [sectionId, state.sheetsConfig?.proxyUrl, state.user?.email]);

  const loadData = async () => {
    setLoading(true);
    const rows = await readDynamicSheet(state.sheetsConfig.proxyUrl, state.user?.email, sheetRef);
    setData(rows);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!state.sheetsConfig?.proxyUrl || !state.user?.email) return;
    setSaving(true);
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN');
    const monthStr = today.toLocaleString('default', { month: 'short' });
    const yearNum = today.getFullYear();

    let row = [];
    if (sectionId === 'vehicle') {
      const amt = parseFloat(formData.FuelAmount || 0);
      const price = parseFloat(formData.PricePerLitre || 0);
      const litres = price > 0 ? (amt / price).toFixed(2) : '';
      row = [dateStr, monthStr, yearNum, amt, formData.Odometer || '', price, litres, '', formData.Note || ''];
    } else if (sectionId === 'health') {
      row = [dateStr, monthStr, yearNum, formData.Activity || '', formData.Duration || '', parseFloat(formData.Cost || 0), '', formData.Note || ''];
    } else if (sectionId === 'medical') {
      row = [dateStr, monthStr, yearNum, formData.Type || '', formData.Description || '', parseFloat(formData.Amount || 0), formData.Doctor || '', ''];
    } else if (sectionId === 'work') {
      row = [dateStr, monthStr, yearNum, 'Freelance', formData.Client || '', parseFloat(formData.Amount || 0), formData.Status || 'Received', formData.Note || ''];
    } else {
      row = [
        dateStr,
        monthStr,
        yearNum,
        ...config.logFields.map(f => formData[f.key] || ''),
      ];
    }

    await writeToDynamicSheet(state.sheetsConfig.proxyUrl, state.user?.email, sheetRef, row);
    await loadData();
    setFormData({});
    setShowLog(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Build chart data by month
  const chartData = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(month => ({
    month,
    value: data.filter(r => r.Month === month).reduce((s, r) => s + parseFloat(r[config?.chartField] || 0), 0),
  })).filter(d => d.value > 0);

  if (!config) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      Section config not found for: {sectionId}
    </div>
  );

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '4px' }}>AI-BUILT SECTION</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
          {config.title}
        </h1>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>{config.subtitle}</div>
        <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', background: '#7c3aed15', border: '1px solid #7c3aed30' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '10px', color: '#a78bfa' }}>Auto-built by Financial OS AI</span>
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 80, background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
          {config.metrics.map(m => (
            <MetricCard key={m.label} label={m.label} value={data.length > 0 ? computeMetric(data, m) : '—'} color={m.color} />
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '16px' }}>{config.chartLabel} — MONTHLY</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dynGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#dynGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log New Entry */}
      {showLog ? (
        <div style={{ background: 'var(--bg-card)', border: '2px solid #7c3aed40', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', color: '#a78bfa', marginBottom: '16px' }}>LOG NEW ENTRY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {config.logFields.map(field => (
              <div key={field.key}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select value={formData[field.key] || ''} onChange={e => setFormData(p => ({...p, [field.key]: e.target.value}))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px' }}>
                    <option value="">Select...</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={formData[field.key] || ''} placeholder={field.placeholder}
                    onChange={e => setFormData(p => ({...p, [field.key]: e.target.value}))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '12px', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
              {saving ? 'Saving...' : '✓ Save Entry'}
            </button>
            <button onClick={() => setShowLog(false)}
              style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowLog(true)}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px dashed #7c3aed40', background: 'transparent', color: '#7c3aed', fontSize: '13px', cursor: 'pointer', fontWeight: 500, marginBottom: '20px' }}>
          + Log New {config.title.split(' ')[1]} Entry
        </button>
      )}

      {/* Recent entries table */}
      {data.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1.5px' }}>RECENT ENTRIES</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {Object.keys(data[0]).map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', color: '#475569', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).reverse().map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)50' }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#475569', fontSize: '13px' }}>
          No entries yet. Log your first one above ↑
        </div>
      )}
    </div>
  );
}
