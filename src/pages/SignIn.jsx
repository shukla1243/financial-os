import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, LockKeyhole, UserRound, Zap } from 'lucide-react';
import { getAccessToken, getUserInfo } from '../services/googleAuth';

export default function SignIn({ restoredUser, sessionReady, onBack, onLogin, onContinue }) {
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
      setError(e.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-gateway">
      <button className="signin-back" onClick={onBack}><ArrowLeft size={14} /> Back to overview</button>
      <section className="signin-gateway__card">
        <div className="signin-gateway__mark"><Zap size={30} /></div>
        <span className="landing-kicker">SECURE SYSTEM ENTRY</span>
        <h1>{restoredUser ? 'Welcome back.' : 'Initialize your realm.'}</h1>
        <p>{restoredUser ? 'Your previous Google session was restored in the background. Continue when you are ready.' : 'Sign in with Google to open your isolated Financial OS workspace.'}</p>
        {restoredUser && (
          <div className="signin-user">
            {restoredUser.picture ? <img src={restoredUser.picture} alt="" /> : <UserRound size={24} />}
            <span><strong>{restoredUser.name}</strong><small>{restoredUser.email}</small></span>
            <CheckCircle size={16} />
          </div>
        )}
        {restoredUser ? (
          <button className="landing-primary signin-main-action" onClick={onContinue} disabled={!sessionReady}>
            {sessionReady ? 'Continue to your OS' : 'Preparing your workspace...'} <ArrowRight size={16} />
          </button>
        ) : (
          <button className="signin-google" onClick={handleGoogleLogin} disabled={loading}>
            <span>G</span>{loading ? 'Connecting securely...' : 'Continue with Google'}<ArrowRight size={15} />
          </button>
        )}
        {error && <div className="landing-error">{error}</div>}
        <div className="signin-security"><LockKeyhole size={13} /> Your identity opens only your isolated workspace.</div>
      </section>
    </div>
  );
}
