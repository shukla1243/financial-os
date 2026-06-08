import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { getAccessToken, getUserInfo } from '../services/googleAuth';

const FEATURES = [
  { icon: '🧠', text: 'AI that learns you over time' },
  { icon: '📊', text: 'Live dashboard across all devices' },
  { icon: '🌱', text: 'App builds new sections automatically' },
  { icon: '💹', text: 'Investments, goals & bill tracking' },
  { icon: '🔒', text: 'Your data, privacy-first centralized backend' },
];

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await getAccessToken(true);
      const user = await getUserInfo();
      if (!user) throw new Error('Could not get user info');

      onLogin(user);
    } catch (e) {
      setError(e.message?.includes('access_denied')
        ? 'Access denied. Make sure you are added as a test user in Google Console.'
        : e.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background effects */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed08 0%, transparent 70%)', pointerEvents: 'none', animation: 'float 6s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, #06b6d408 0%, transparent 70%)', pointerEvents: 'none', animation: 'float 8s ease-in-out infinite reverse' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', marginBottom: '16px', boxShadow: '0 0 40px #7c3aed40', animation: 'bounceIn 0.6s ease-out' }}>
            <Zap size={36} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '28px', fontWeight: 900, background: 'linear-gradient(90deg, #a78bfa, #06b6d4, #f472b6, #a78bfa)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 3s linear infinite', marginBottom: '6px' }}>
            FINANCIAL OS
          </h1>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', letterSpacing: '2px' }}>
            金融システム — Your Living Finance AI
          </div>
        </div>

        {/* Main card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '32px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#a78bfa', letterSpacing: '1px', marginBottom: '8px' }}>WELCOME BACK</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Sign in with Google to access your personal Financial OS. Your data syncs instantly across all devices.
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)',
              background: loading ? 'var(--bg-main)' : '#fff', color: loading ? '#475569' : 'var(--bg-main)',
              fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              transition: 'all 0.2s', marginBottom: '12px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? (
              <>
                <div style={{ width: 20, height: 20, border: '2px solid #475569', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Connecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ef444415', border: '1px solid #ef444430', fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', lineHeight: '1.5' }}>
            🔒 We only access your Google Sheets — nothing else. Your financial data never leaves your account.
          </div>
        </div>

        {/* Features */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '1.5px', marginBottom: '14px' }}>WHAT YOU GET</div>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', animation: 'slideInLeft 0.4s ease-out both', animationDelay: `${i * 0.1}s` }}>
              <span style={{ fontSize: '16px' }}>{f.icon}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#334155' }}>
          Built with ❤️ · Your personal AI-powered Financial OS
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
