import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getDynamicSheet, appendDynamicRow } from '../services/proxyService';
import { callAI } from '../services/aiService';
import { TrendingUp, Upload, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

import { 
  resolveAllInvestments, 
  fetchSingleWalletBalance, 
  fetchCoinGeckoPrices, 
  COINGECKO_MAPPING 
} from '../services/walletService';

export default function Investments() {
  const { state } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [cryptoPrices, setCryptoPrices] = useState({
    bitcoin: { inr: 5800000 },
    ethereum: { inr: 320000 },
    solana: { inr: 14000 },
    cardano: { inr: 45 },
    binancecoin: { inr: 50000 },
    'matic-network': { inr: 55 }
  });

  // Statement parsing state
  const [statementText, setStatementText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedHoldings, setParsedHoldings] = useState([]);
  const [selectedHoldings, setSelectedHoldings] = useState({});

  // Tabs: 'parser', 'manual_sip', or 'wallet_tracker'
  const [activeTab, setActiveTab] = useState('parser');
  
  // Manual Mutual Fund Form state
  const [manualName, setManualName] = useState('');
  const [manualUnits, setManualUnits] = useState('');
  const [manualBuyPrice, setManualBuyPrice] = useState(''); // Price per unit
  const [manualCurrentValue, setManualCurrentValue] = useState('');
  const [manualPlatform, setManualPlatform] = useState('Groww');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNote, setManualNote] = useState('');

  // Wallet tracker state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletAsset, setWalletAsset] = useState('evm-wallet');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet data to a clean CSV text string
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        setStatementText(csvText);
        setParsing(false);
        alert('Excel statement loaded! Click "Parse Statement with Gemini" below to extract your mutual funds.');
      } catch (err) {
        console.error(err);
        alert('Failed to read Excel file.');
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fetchCryptoPrices = async (portfolioData = portfolio) => {
    try {
      const cryptoItems = portfolioData.filter(item => item.Type === 'Crypto');
      const uniqueGeckoIds = cryptoItems.map(item => {
        const coinSym = (item.Fund_Coin || '').toLowerCase();
        return COINGECKO_MAPPING[coinSym] || coinSym;
      }).filter(Boolean);

      const prices = await fetchCoinGeckoPrices(uniqueGeckoIds);
      if (prices) {
        setCryptoPrices(prev => ({ ...prev, ...prices }));
      }
    } catch (e) {
      console.warn('CoinGecko API rate limited, using fallback prices', e);
    }
  };

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const { proxyUrl, connected } = state.sheetsConfig;
      const email = state.user?.email;
      if (connected && proxyUrl && email) {
        const data = await getDynamicSheet(proxyUrl, email, 'Investments');
        
        // Resolve wallet balances dynamically
        const resolvedData = await resolveAllInvestments(data || []);
        setPortfolio(resolvedData);
        await fetchCryptoPrices(resolvedData);
      }
    } catch (e) {
      console.error('Failed to load investments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, [state.sheetsConfig?.connected]);

  // Handle parsing statement using Gemini
  const handleParseStatement = async () => {
    if (!statementText.trim()) return;
    if (!state.geminiKey) {
      alert('Configure your Gemini API key in Settings first.');
      return;
    }
    setParsing(true);
    setParsedHoldings([]);

    const prompt = `Extract mutual fund investment details from the following statement transcript. Identify the fund name, invested amount, units held, and current value.

Statement Text:
"""
${statementText}
"""

Return ONLY a JSON array matching this format (no markdown code blocks, no trailing comments):
[
  {
    "name": "Mutual Fund Name",
    "invested": 10000,
    "units": 120.5,
    "currentValue": 11500,
    "platform": "Groww"
  }
]`;

    try {
      const res = await callAI({
        contents: prompt,
        key: state.geminiKey,
        temperature: 0.1
      });
      const rawText = res.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanedText = rawText.replace(/```json|```/g, '').trim();
      const holdings = JSON.parse(cleanedText);
      setParsedHoldings(holdings);
      
      // Default all selected to true
      const selectMap = {};
      holdings.forEach((_, idx) => { selectMap[idx] = true; });
      setSelectedHoldings(selectMap);
    } catch (e) {
      console.error(e);
      alert('Failed to parse statement. Please ensure it contains readable text.');
    } finally {
      setParsing(false);
    }
  };

  // Commit selected holdings to Google Sheets
  const handleSaveParsedHoldings = async () => {
    const toSave = parsedHoldings.filter((_, idx) => selectedHoldings[idx]);
    if (toSave.length === 0) return;

    setSaving(true);
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;

    try {
      for (const holding of toSave) {
        const dateStr = new Date().toLocaleDateString('en-IN');
        const rowData = [
          dateStr,
          'SIP',
          holding.name,
          holding.units,
          holding.invested / holding.units, // Buy Price = Invested / Units
          holding.currentValue,
          holding.platform || 'Groww',
          'Imported via Statement Parser'
        ];
        await appendDynamicRow(proxyUrl, email, 'Investments', rowData);
      }
      setStatementText('');
      setParsedHoldings([]);
      await fetchInvestments();
      alert('Holdings logged to Sheets successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to sync holdings to Sheets.');
    } finally {
      setSaving(false);
    }
  };

  // Commit manual holding to Google Sheets
  const handleSaveManualHolding = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualUnits || !manualBuyPrice) {
      alert('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;

    try {
      const unitsNum = parseFloat(manualUnits);
      const buyPriceNum = parseFloat(manualBuyPrice);
      const currentValNum = manualCurrentValue ? parseFloat(manualCurrentValue) : buyPriceNum * unitsNum;
      const dateStr = manualDate ? new Date(manualDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
      
      const rowData = [
        dateStr,
        'SIP',
        manualName.trim(),
        unitsNum,
        buyPriceNum,
        currentValNum, 
        manualPlatform || 'Groww',
        manualNote || 'Manually Logged SIP'
      ];

      if (connected && proxyUrl && email) {
        await appendDynamicRow(proxyUrl, email, 'Investments', rowData);
        alert('Investment added successfully!');
        setManualName('');
        setManualUnits('');
        setManualBuyPrice('');
        setManualCurrentValue('');
        setManualNote('');
        await fetchInvestments();
      } else {
        alert('Sheet connection is not active.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to log investment.');
    } finally {
      setSaving(false);
    }
  };

  // Add tracked wallet address
  const handleAddTrackedWallet = async (e) => {
    e.preventDefault();
    if (!walletAddress.trim()) {
      alert('Please enter a wallet address.');
      return;
    }

    setSaving(true);
    const { proxyUrl, connected } = state.sheetsConfig;
    const email = state.user?.email;

    try {
      const dateStr = new Date().toLocaleDateString('en-IN');
      // Fetch initial balance
      let balance = 0;
      if (walletAsset !== 'evm-wallet') {
        balance = await fetchSingleWalletBalance(walletAddress.trim(), walletAsset) || 0;
      }

      const rowData = [
        dateStr,
        'Crypto',
        walletAsset, // e.g. evm-wallet, bitcoin, ethereum, solana
        balance, // initial units balance
        0, // buy price = 0
        0, // current val = 0
        'Wallet: ' + walletAddress.trim(),
        'Tracked Wallet Address'
      ];

      if (connected && proxyUrl && email) {
        await appendDynamicRow(proxyUrl, email, 'Investments', rowData);
        alert('Wallet added successfully!');
        setWalletAddress('');
        await fetchInvestments();
      } else {
        alert('Sheet connection is not active.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add tracked wallet.');
    } finally {
      setSaving(false);
    }
  };

  // Process data for charts & UI
  const mutualFunds = portfolio.filter(item => item.Type === 'SIP');
  const cryptoHoldings = portfolio.filter(item => item.Type === 'Crypto');

  const mfInvested = mutualFunds.reduce((sum, item) => sum + (parseFloat(item.Units) * parseFloat(item.BuyPrice) || 0), 0);
  const mfCurrent = mutualFunds.reduce((sum, item) => sum + (parseFloat(item.CurrentValue) || 0), 0);
  const mfReturns = mfCurrent - mfInvested;
  const mfReturnPct = mfInvested > 0 ? (mfReturns / mfInvested) * 100 : 0;

  // Crypto values based on live prices
  const getCryptoCurrentVal = (item) => {
    const coinId = (item.Fund_Coin || '').toLowerCase();
    const price = cryptoPrices[coinId]?.inr || parseFloat(item.CurrentValue) || 0;
    return parseFloat(item.Units) * price;
  };

  const cryptoInvested = cryptoHoldings.reduce((sum, item) => sum + (parseFloat(item.Units) * parseFloat(item.BuyPrice) || 0), 0);
  const cryptoCurrent = cryptoHoldings.reduce((sum, item) => sum + getCryptoCurrentVal(item), 0);
  const cryptoReturns = cryptoCurrent - cryptoInvested;
  const cryptoReturnPct = cryptoInvested > 0 ? (cryptoReturns / cryptoInvested) * 100 : 0;

  const totalInvested = mfInvested + cryptoInvested;
  const totalCurrentValue = mfCurrent + cryptoCurrent;
  const totalReturns = totalCurrentValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Net Worth Chart Allocation
  const cashBuffer = 0;
  const netWorthData = [
    { name: 'Mutual Funds', value: Math.round(mfCurrent), color: 'var(--primary-color)' },
    { name: 'Crypto', value: Math.round(cryptoCurrent), color: 'var(--accent-color)' },
    { name: 'Cash Buffer', value: cashBuffer, color: '#10b981' }
  ].filter(d => d.value > 0);

  return (
    <div style={{ animation: 'slideUp 0.35s ease-out' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INVESTMENTS</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary-color)80', letterSpacing: '2px' }}>資産運用 — Mutual Funds (SIP) & Live Crypto Portfolio</div>
        </div>
        <button onClick={fetchInvestments} style={{ padding: '8px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(180deg)'}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* API Restriction Alert */}
      <div style={{ borderRadius: '12px', padding: '14px', marginBottom: '20px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start', animation: 'fadeIn 0.5s ease-out' }}>
        <AlertCircle size={18} color="var(--primary-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>🔒 Groww / Retail Broker Integration Notice</div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
            Indian retail brokers (Groww, Zerodha, etc.) do not offer public API integration due to strict regulatory compliance & credential restrictions. To bypass this, we provide a secure **client-side statement parser** to drag & drop exported statements directly, or a **manual transaction logging form** below.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>TOTAL INVESTED</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', fontFamily: 'Orbitron, monospace', color: 'var(--text-main)' }}>
            ₹{totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="card" style={{ padding: '20px', transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>CURRENT VALUE</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', fontFamily: 'Orbitron, monospace', color: 'var(--primary-color)' }}>
            ₹{totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: `3px solid ${totalReturns >= 0 ? '#10b981' : '#ef4444'}`, transition: 'all 0.3s ease', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>TOTAL RETURNS</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '6px', fontFamily: 'Orbitron, monospace', color: totalReturns >= 0 ? '#10b981' : '#ef4444' }}>
            {totalReturns >= 0 ? '+' : ''}₹{totalReturns.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span style={{ fontSize: '12px', marginLeft: '6px' }}>({totalReturnPct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Parser/Manual log + Allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', marginBottom: '24px' }} className="report-main-grid">
        
        {/* Left Card: Multi-Tab Action Center */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveTab('parser')}
              style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, border: 'none', background: activeTab === 'parser' ? 'linear-gradient(135deg, var(--primary-color), var(--accent-color))' : 'transparent', color: activeTab === 'parser' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
            >
              📊 Upload Groww Statement (AI)
            </button>
            <button 
              onClick={() => setActiveTab('manual_sip')}
              style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, border: 'none', background: activeTab === 'manual_sip' ? 'linear-gradient(135deg, var(--primary-color), var(--accent-color))' : 'transparent', color: activeTab === 'manual_sip' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
            >
              📈 Log Mutual Fund Manually
            </button>
            <button 
              onClick={() => setActiveTab('wallet_tracker')}
              style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, border: 'none', background: activeTab === 'wallet_tracker' ? 'linear-gradient(135deg, var(--primary-color), var(--accent-color))' : 'transparent', color: activeTab === 'wallet_tracker' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}
            >
              ₿ Track Crypto Wallet Address
            </button>
          </div>

          {activeTab === 'parser' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Upload size={16} color="var(--primary-color)" />
                <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700 }}>STATEMENT AI PARSER</h3>
              </div>
              
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                Upload your Groww Excel (.xlsx) report directly, or paste your statement text below.
              </p>

              <div 
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => document.getElementById('excel-file-input').click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <Upload size={24} color="var(--primary-color)" style={{ margin: '0 auto 8px' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>Upload Groww Excel Statement</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Drag & drop or click to upload (.xlsx, .xls, .csv)</span>
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>OR PASTE TEXT</span>
                <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
              </div>

              <textarea
                className="input-dark"
                style={{ minHeight: '100px', fontSize: '12px', resize: 'vertical', padding: '12px', marginBottom: '16px' }}
                placeholder="Paste raw portfolio text summary here..."
                value={statementText}
                onChange={e => setStatementText(e.target.value)}
              />

              <button
                onClick={handleParseStatement}
                disabled={parsing || !statementText.trim()}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: (parsing || !statementText.trim()) ? 0.5 : 1 }}
              >
                {parsing ? 'Analyzing Portfolio...' : 'Parse Statement with Gemini'}
              </button>
            </div>
          )}

          {activeTab === 'manual_sip' && (
            <form onSubmit={handleSaveManualHolding} style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--primary-color)' }}>MANUAL MUTUAL FUND LOG</h3>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mutual Fund Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Nippon India Small Cap Fund" 
                  value={manualName} 
                  onChange={e => setManualName(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Units Held *</label>
                  <input 
                    type="number" 
                    step="any" 
                    placeholder="0.00" 
                    value={manualUnits} 
                    onChange={e => setManualUnits(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Average Buy Price (₹) *</label>
                  <input 
                    type="number" 
                    step="any" 
                    placeholder="0.00" 
                    value={manualBuyPrice} 
                    onChange={e => setManualBuyPrice(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current Value (₹)</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Current portfolio value" 
                  value={manualCurrentValue} 
                  onChange={e => setManualCurrentValue(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Platform</label>
                  <input 
                    type="text" 
                    placeholder="Groww, Zerodha" 
                    value={manualPlatform} 
                    onChange={e => setManualPlatform(e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input 
                    type="date" 
                    value={manualDate} 
                    onChange={e => setManualDate(e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Note</label>
                <input 
                  type="text" 
                  placeholder="Additional description..." 
                  value={manualNote} 
                  onChange={e => setManualNote(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }} 
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Adding to Sheets...' : 'Log Mutual Fund'}
              </button>
            </form>
          )}

          {activeTab === 'wallet_tracker' && (
            <form onSubmit={handleAddTrackedWallet} style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)' }}>CRYPTO WALLET TRACKER (LIVE COINGECKO)</h3>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Enter your public wallet address. The system will automatically fetch your balance and track the live valuation in INR using the CoinGecko API.
              </p>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Coin Asset</label>
                <select 
                  value={walletAsset} 
                  onChange={e => setWalletAsset(e.target.value)} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
                >
                  <option value="evm-wallet">Multi-chain EVM Wallet (ETH, BNB, MATIC, etc.)</option>
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum Only (ETH)</option>
                  <option value="solana">Solana (SOL)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Public Wallet Address *</label>
                <input 
                  type="text" 
                  placeholder="e.g. 0x... or Solana Address or BTC Address" 
                  value={walletAddress} 
                  onChange={e => setWalletAddress(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace', fontSize: '12px' }} 
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Fetching balance & adding...' : 'Connect & Track Wallet'}
              </button>
            </form>
          )}

          {/* Parsed Output Review */}
          {parsedHoldings.length > 0 && activeTab === 'parser' && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: 'var(--primary-color)' }}>CONFIRM DETECTED HOLDINGS</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {parsedHoldings.map((h, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedHoldings[idx]}
                      onChange={e => setSelectedHoldings(prev => ({ ...prev, [idx]: e.target.checked }))}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Invested: ₹{h.invested.toLocaleString()} | Current Value: ₹{h.currentValue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveParsedHoldings}
                disabled={saving}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                {saving ? 'Syncing to Sheets...' : 'Log Selected Holdings'}
              </button>
            </div>
          )}
        </div>

        {/* Allocation Donut Chart */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', fontWeight: 700, marginBottom: '20px', width: '100%' }}>
            ASSET ALLOCATION
          </h3>
          {netWorthData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginTop: '40px' }}>
              <AlertCircle size={14} />
              <span>No investment data logged yet.</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: '200px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={netWorthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {netWorthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {netWorthData.map(d => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                  <span>{d.name}</span>
                </div>
                <span style={{ fontWeight: 600 }}>₹{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mutual Funds holdings table */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          MUTUAL FUNDS (SIP PORTFOLIO)
        </h3>

        {mutualFunds.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No mutual funds logged.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Fund Name</th>
                  <th style={{ padding: '10px' }}>Units</th>
                  <th style={{ padding: '10px' }}>Invested</th>
                  <th style={{ padding: '10px' }}>Current Value</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Returns</th>
                </tr>
              </thead>
              <tbody>
                {mutualFunds.map(mf => {
                  const invested = parseFloat(mf.Units) * parseFloat(mf.BuyPrice) || 0;
                  const current = parseFloat(mf.CurrentValue) || 0;
                  const returns = current - invested;
                  return (
                    <tr key={mf.Fund_Coin} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 500 }}>{mf.Fund_Coin}</td>
                      <td style={{ padding: '12px 10px' }}>{parseFloat(mf.Units).toFixed(3)}</td>
                      <td style={{ padding: '12px 10px' }}>₹{invested.toLocaleString()}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--primary-color)' }}>₹{current.toLocaleString()}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: returns >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {returns >= 0 ? '+' : ''}₹{returns.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Crypto Holdings Table */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          ₿ CRYPTOCURRENCY HOLDINGS
        </h3>

        {cryptoHoldings.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No crypto holdings logged.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Asset</th>
                  <th style={{ padding: '10px' }}>Units</th>
                  <th style={{ padding: '10px' }}>Platform / Address</th>
                  <th style={{ padding: '10px' }}>Current Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Current Value</th>
                </tr>
              </thead>
              <tbody>
                {cryptoHoldings.map((crypto, idx) => {
                  const coinSym = (crypto.Fund_Coin || '').toLowerCase();
                  const coinId = COINGECKO_MAPPING[coinSym] || coinSym;
                  const curPrice = cryptoPrices[coinId]?.inr || parseFloat(crypto.CurrentValue) || 0;
                  const curVal = parseFloat(crypto.Units || 0) * curPrice;
                  const isWallet = crypto.Platform?.startsWith('Wallet:');
                  return (
                    <tr key={`${crypto.Fund_Coin}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600, textTransform: 'uppercase' }}>{crypto.Fund_Coin}</td>
                      <td style={{ padding: '12px 10px' }}>{parseFloat(crypto.Units || 0).toFixed(4)}</td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {isWallet ? crypto.Platform.replace('Wallet:', '') : crypto.Platform || 'Manual'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>₹{curPrice.toLocaleString()}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-color)' }}>
                        ₹{curVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
