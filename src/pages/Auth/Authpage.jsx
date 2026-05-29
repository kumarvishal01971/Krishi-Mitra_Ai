// src/pages/Auth/AuthPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Icon from '../../components/common/Icon';
import { syncUser } from '../../services/userService';

// ── Backend base URL ──────────────────────────────────────────
// Add VITE_API_URL=http://localhost:4000 to your frontend .env
const API = import.meta.env.VITE_API_URL || '';

// ── Backend API helpers ───────────────────────────────────────
/**
 * Calls YOUR Express server → which proxies to Auth0 /passwordless/start
 * This sidesteps Auth0's CORS block on direct browser calls.
 */
const sendOtp = async (email) => {
  const res = await fetch(`${API}/auth/send-otp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to send OTP');
  return data;
};

/**
 * Calls YOUR Express server → which proxies to Auth0 /oauth/token
 * Returns { user: { name, email, picture }, access_token, id_token }
 */
const verifyOtp = async (email, otp) => {
  const res = await fetch(`${API}/auth/verify-otp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'OTP verification failed');
  return data;
};

// ── Google Sign-In Button ─────────────────────────────────────
const GoogleBtn = ({ onClick, loading }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    style={{
      width: '100%', padding: '12px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 11, cursor: loading ? 'not-allowed' : 'pointer',
      color: '#f0fdf4', fontFamily: "'Poppins', sans-serif",
      fontSize: 14, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      transition: 'all 0.22s', opacity: loading ? 0.6 : 1,
    }}
    onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
  >
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
    {loading ? 'Redirecting to Google…' : 'Continue with Google'}
  </button>
);

// ── Divider ───────────────────────────────────────────────────
const Divider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
    <span style={{ color: 'rgba(200,230,201,0.3)', fontSize: 11, fontFamily: "'Poppins', sans-serif" }}>
      or continue with email
    </span>
    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
  </div>
);

// ── Reusable input field ──────────────────────────────────────
const Field = ({ label, type = 'text', placeholder, value, onChange, icon, error }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, letterSpacing: 1.4,
        color: focused ? '#4ade80' : 'rgba(200,230,201,0.45)',
        textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif", transition: 'color 0.2s',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', opacity: focused ? 1 : 0.35, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
          <Icon name={icon} size={14} color={focused ? '#4ade80' : '#c8e6c9'} />
        </div>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 16px 12px 40px',
            background: focused ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? '#f87171' : focused ? 'rgba(74,222,128,0.45)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 11, color: '#f0fdf4', fontFamily: "'Poppins', sans-serif", fontSize: 13,
            outline: 'none', transition: 'all 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(74,222,128,0.07)' : 'none',
          }}
        />
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4, fontFamily: "'Poppins', sans-serif" }}>{error}</p>}
    </div>
  );
};

// ── OTP Input (6 boxes) ───────────────────────────────────────
const OtpInput = ({ value, onChange, error }) => {
  const inputsRef = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, i) + value.slice(i + 1));
      if (i > 0) inputsRef.current[i - 1]?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = (value.slice(0, i) + e.key + value.slice(i + 1)).slice(0, 6);
    onChange(next);
    if (i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: 'rgba(200,230,201,0.45)', textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif" }}>
        Enter OTP
      </label>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[0,1,2,3,4,5].map(i => (
          <input
            key={i} ref={el => inputsRef.current[i] = el}
            type="text" inputMode="numeric" maxLength={1}
            value={digits[i].trim()} onChange={() => {}}
            onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
            onFocus={e => e.target.select()}
            style={{
              width: 46, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 600,
              background: digits[i].trim() ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${error ? '#f87171' : digits[i].trim() ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 11, color: '#f0fdf4', fontFamily: "'Poppins', sans-serif",
              outline: 'none', transition: 'all 0.15s', caretColor: '#4ade80',
            }}
          />
        ))}
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 11, marginTop: 8, textAlign: 'center', fontFamily: "'Poppins', sans-serif" }}>{error}</p>}
    </div>
  );
};

// ── Resend timer ──────────────────────────────────────────────
const ResendTimer = ({ onResend, loading }) => {
  const [seconds, setSeconds]     = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  const startTimer = () => {
    setSeconds(60); setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => { if (s <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0; } return s - 1; });
    }, 1000);
  };

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current); }, []);

  return (
    <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(200,230,201,0.4)', fontFamily: "'Poppins', sans-serif", marginBottom: 16 }}>
      {canResend
        ? <button type="button" onClick={() => { startTimer(); onResend?.(); }} disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
            Resend OTP
          </button>
        : <>Resend OTP in <span style={{ color: '#86efac', fontWeight: 600 }}>{seconds}s</span></>
      }
    </p>
  );
};

// ── Submit button ─────────────────────────────────────────────
const SubmitBtn = ({ children, loading, type = 'submit' }) => (
  <button type={type} disabled={loading} style={{
    width: '100%', padding: '13px',
    background: loading ? 'rgba(74,222,128,0.12)' : 'linear-gradient(135deg, #1a5c32, #2d6a3f)',
    border: '1px solid rgba(74,222,128,0.3)', borderRadius: 11,
    cursor: loading ? 'not-allowed' : 'pointer',
    color: loading ? 'rgba(134,239,172,0.4)' : '#a3f0be',
    fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: loading ? 'none' : '0 4px 20px rgba(74,222,128,0.14)',
    transition: 'all 0.22s', marginTop: 8,
  }}>
    {loading && <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(134,239,172,0.2)', borderTopColor: '#4ade80', animation: 'spin 0.7s linear infinite' }} />}
    {loading ? 'Please wait…' : children}
  </button>
);

// ── Error Banner ──────────────────────────────────────────────
const ErrorBanner = ({ message }) => !message ? null : (
  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 12, fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 14 }}>⚠</span> {message}
  </div>
);

// ── OTP Step ──────────────────────────────────────────────────
const OtpStep = ({ email, onVerified, onBack, loading, setLoading, errors, setErrors }) => {
  const [otp, setOtp]           = useState('');
  const [apiError, setApiError] = useState('');

  const handleResend = async () => {
    setApiError(''); setLoading(true);
    try { await sendOtp(email); }
    catch (err) { setApiError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setApiError('');
    if (otp.length < 6) { setErrors({ otp: 'Please enter the complete 6-digit OTP' }); return; }
    setErrors({}); setLoading(true);
    try {
      const result = await verifyOtp(email, otp);
      onVerified(result.user);   // { name, email, picture }
    } catch (err) {
      const msg = err.message.toLowerCase().includes('wrong') || err.message.toLowerCase().includes('verification code')
        ? 'Incorrect OTP. Please check and try again.'
        : err.message.toLowerCase().includes('expired')
        ? 'OTP has expired. Please request a new one.'
        : err.message;
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 11, padding: '10px 14px', marginBottom: 22 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(74,222,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={14} color="#4ade80" />
        </div>
        <div>
          <p style={{ color: '#86efac', fontSize: 12, fontWeight: 600, margin: 0, fontFamily: "'Poppins', sans-serif" }}>OTP sent to your email</p>
          <p style={{ color: 'rgba(200,230,201,0.5)', fontSize: 11, margin: 0, fontFamily: "'Poppins', sans-serif" }}>{email}</p>
        </div>
        <button type="button" onClick={onBack} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,230,201,0.4)', fontSize: 11, fontFamily: "'Poppins', sans-serif" }}>
          Change
        </button>
      </div>
      <ErrorBanner message={apiError} />
      <OtpInput value={otp} onChange={setOtp} error={errors.otp} />
      <ResendTimer onResend={handleResend} loading={loading} />
      <SubmitBtn loading={loading}>Verify & Continue</SubmitBtn>
    </form>
  );
};

// ── Main AuthPage ─────────────────────────────────────────────
const AuthPage = ({ onAuthSuccess, onBack }) => {
  const { loginWithRedirect, isAuthenticated, isLoading: auth0Loading, user } = useAuth0();

  const [mode, setMode]         = useState('login');
  const [step, setStep]         = useState('form');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [authUser, setAuthUser] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [regName, setRegName]       = useState('');
  const [regPhone, setRegPhone]     = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regState, setRegState]     = useState('');
  const [regCrop, setRegCrop]       = useState('');

  const indianStates = [
    'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Gujarat','Haryana','Himachal Pradesh',
    'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab',
    'Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal',
  ];
  const crops = ['Rice','Wheat','Maize','Cotton','Sugarcane','Tomato','Potato','Soybean','Groundnut'];

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const doSync = async () => {
      const u = { name: user.name, email: user.email, picture: user.picture };
      try {
        const mongoUser = await syncUser({ auth0Id: user.sub, email: user.email, name: user.name });
        if (mongoUser?._id) {
          u.mongoId = mongoUser._id;
        }
      } catch (err) {
        console.error('Google sync failed:', err);
      } finally {
        // Always store a minimal krishi_user so front-end has a consistent object
        localStorage.setItem('krishi_user', JSON.stringify(u));
        setAuthUser(u);
        setSuccess(true);
        setTimeout(() => onAuthSuccess?.(u), 900);
      }
    };

    doSync();
  }, [isAuthenticated, user]);

  const handleGoogleLogin = () => {
    setLoading(true);
    loginWithRedirect({ authorizationParams: { connection: 'google-oauth2', prompt: 'select_account' } });
  };

  const validateLoginEmail = () => {
    const e = {};
    if (!loginEmail.trim()) e.loginEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(loginEmail)) e.loginEmail = 'Enter a valid email';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e = {};
    if (!regName.trim())  e.regName  = 'Full name is required';
    if (!regPhone.trim()) e.regPhone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(regPhone)) e.regPhone = 'Enter valid 10-digit mobile number';
    if (!regEmail.trim()) e.regEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(regEmail)) e.regEmail = 'Enter a valid email';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleLoginSendOtp = async (e) => {
    e.preventDefault();
    if (!validateLoginEmail()) return;
    setApiError(''); setLoading(true);
    try { await sendOtp(loginEmail); setStep('otp'); }
    catch (err) { setApiError(err.message); }
    finally { setLoading(false); }
  };

  const handleRegisterSendOtp = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setApiError(''); setLoading(true);
    try { await sendOtp(regEmail); setStep('otp'); }
    catch (err) { setApiError(err.message); }
    finally { setLoading(false); }
  };

  const handleOtpVerified = async (verifiedUser) => {
    const u = {
      name: verifiedUser?.name || (mode === 'login' ? loginEmail.split('@')[0] : regName),
      email: verifiedUser?.email || (mode === 'login' ? loginEmail : regEmail),
      picture: verifiedUser?.picture || null,
    };

    // Sync user to MongoDB and store their _id using the shared service
    try {
      const mongoUser = await syncUser({ email: u.email, name: u.name });
      if (mongoUser?._id) {
        u.mongoId = mongoUser._id;
      }
      localStorage.setItem('krishi_user', JSON.stringify(u));
    } catch (err) {
      console.error('User sync failed:', err); // non-fatal, auth still succeeds
    }

    setAuthUser(u); setSuccess(true);
    setTimeout(() => onAuthSuccess?.(u), 900);
  };

  const switchMode = (m) => { setMode(m); setStep('form'); setErrors({}); setApiError(''); setSuccess(false); };
  const activeEmail = mode === 'login' ? loginEmail : regEmail;

  if (auth0Loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#202c21' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(74,222,128,0.2)', borderTopColor: '#4ade80', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', fontFamily: "'Poppins', sans-serif", background: `radial-gradient(ellipse at 10% 20%, rgba(45,106,63,0.28) 0%, transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(26,51,32,0.38) 0%, transparent 50%), #202c21`, overflow: 'hidden' }}>

      {/* ── LEFT PANEL ─────────────────────────────── */}
      <div style={{ flex: '0 0 44%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 52px', background: 'linear-gradient(160deg, rgba(20,60,32,0.97) 0%, rgba(14,30,18,0.99) 100%)', borderRight: '1px solid rgba(74,222,128,0.09)', overflow: 'hidden' }}>
        {[{s:360,t:-90,l:-90},{s:220,t:260,l:270},{s:160,t:-30,l:330},{s:440,t:420,l:-130}].map((c,i) => (
          <div key={i} style={{ position: 'absolute', width: c.s, height: c.s, borderRadius: '50%', border: '1px solid rgba(74,222,128,0.15)', top: c.t, left: c.l, pointerEvents: 'none' }} />
        ))}
        {[...Array(5)].map((_,i) => (
          <div key={i} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: '#4ade80', opacity: 0.35, top: `${18+i*15}%`, left: `${68+(i%2)*18}%`, boxShadow: '0 0 8px rgba(74,222,128,0.5)', animation: `floatDot ${2.5+i*0.5}s ease-in-out infinite alternate` }} />
        ))}
        <button onClick={onBack} style={{ position: 'absolute', top: 28, left: 28, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'rgba(134,239,172,0.7)', fontSize: 12, fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.13)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.07)'}>
          <Icon name="back" size={13} color="currentColor" /> Back to app
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1a5c32, #0f3d1f)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 22px rgba(74,222,128,0.18)' }}>
            <Icon name="leaf" size={22} color="#86efac" />
          </div>
          <div>
            <div style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 21, fontWeight: 700, color: '#f0fdf4', lineHeight: 1 }}>कृषि Mitra</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(134,239,172,0.55)', letterSpacing: 2.2, textTransform: 'uppercase' }}>AI Farm Manager</div>
          </div>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#f0fdf4', lineHeight: 1.25, marginBottom: 14 }}>
          Smart farming<br /><span style={{ color: '#4ade80' }}>starts here.</span>
        </h1>
        <p style={{ color: 'rgba(200,230,201,0.6)', fontSize: 14, lineHeight: 1.85, maxWidth: 340, marginBottom: 40 }}>
          Join thousands of Indian farmers using AI to detect crop diseases, get weather alerts, and maximise yields — all in one place.
        </p>
        {[
          { icon: 'alert',  text: 'AI disease detection in seconds'      },
          { icon: 'cloud',  text: 'Hyper-local weather & farming alerts' },
          { icon: 'market', text: 'Live mandi prices across India'       },
          { icon: 'gov',    text: 'Government schemes & subsidy tracker' },
          { icon: 'users',  text: 'Farmer community & expert advice'     },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={f.icon} size={14} color="#4ade80" />
            </div>
            <span style={{ color: 'rgba(200,230,201,0.75)', fontSize: 13 }}>{f.text}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', bottom: 28, left: 52, fontSize: 11, color: 'rgba(134,239,172,0.3)', letterSpacing: 0.3 }}>🌾 Trusted by 50,000+ farmers across India</div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {step === 'form' && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, marginBottom: 30 }}>
              {['login', 'register'].map(m => (
                <button key={m} type="button" onClick={() => switchMode(m)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: mode === m ? 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(74,222,128,0.09))' : 'transparent', color: mode === m ? '#86efac' : 'rgba(200,230,201,0.35)', border: mode === m ? '1px solid rgba(74,222,128,0.22)' : '1px solid transparent' }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {step === 'otp' && !success && (
            <div style={{ marginBottom: 28 }}>
              <button type="button" onClick={() => setStep('form')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(134,239,172,0.55)', fontSize: 12, fontFamily: "'Poppins', sans-serif", marginBottom: 18, padding: 0 }}>
                <Icon name="back" size={12} color="currentColor" /> Back
              </button>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#f0fdf4', marginBottom: 4 }}>Check your inbox</h2>
              <p style={{ color: 'rgba(200,230,201,0.45)', fontSize: 13 }}>We've sent a 6-digit code to verify your identity.</p>
            </div>
          )}

          {success && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(74,222,128,0.12)', border: '2px solid rgba(74,222,128,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(74,222,128,0.18)' }}>
                <Icon name="check" size={26} color="#4ade80" />
              </div>
              {authUser?.picture && <img src={authUser.picture} alt="profile" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(74,222,128,0.4)', margin: '0 auto 12px', display: 'block' }} />}
              <h3 style={{ color: '#f0fdf4', fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>{mode === 'login' ? 'Welcome back!' : 'Account created!'}</h3>
              {authUser?.name && <p style={{ color: '#86efac', fontSize: 14, marginBottom: 4 }}>{authUser.name}</p>}
              <p style={{ color: 'rgba(200,230,201,0.5)', fontSize: 13 }}>Redirecting to your dashboard…</p>
            </div>
          )}

          {!success && step === 'otp' && (
            <OtpStep email={activeEmail} onVerified={handleOtpVerified} onBack={() => setStep('form')}
              loading={loading} setLoading={setLoading} errors={errors} setErrors={setErrors} />
          )}

          {!success && step === 'form' && mode === 'login' && (
            <form onSubmit={handleLoginSendOtp}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#f0fdf4', marginBottom: 4 }}>Welcome back</h2>
              <p style={{ color: 'rgba(200,230,201,0.45)', fontSize: 13, marginBottom: 24 }}>Sign in to your कृषि Mitra account</p>
              <GoogleBtn onClick={handleGoogleLogin} loading={loading} />
              <Divider />
              <ErrorBanner message={apiError} />
              <Field label="Email address" type="email" placeholder="yourname@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} icon="send" error={errors.loginEmail} />
              <SubmitBtn loading={loading}>Send OTP</SubmitBtn>
              <p style={{ textAlign: 'center', color: 'rgba(200,230,201,0.35)', fontSize: 12, marginTop: 18 }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>Create one free</button>
              </p>
            </form>
          )}

          {!success && step === 'form' && mode === 'register' && (
            <form onSubmit={handleRegisterSendOtp}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#f0fdf4', marginBottom: 4 }}>Create your account</h2>
              <p style={{ color: 'rgba(200,230,201,0.45)', fontSize: 13, marginBottom: 22 }}>Free forever · No credit card needed</p>
              <GoogleBtn onClick={handleGoogleLogin} loading={loading} />
              <Divider />
              <ErrorBanner message={apiError} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Full Name" placeholder="Ramesh Kumar" value={regName} onChange={e => setRegName(e.target.value)} icon="user" error={errors.regName} />
                <Field label="Mobile Number" placeholder="9876543210" value={regPhone} onChange={e => setRegPhone(e.target.value)} icon="send" error={errors.regPhone} />
              </div>
              <Field label="Email address" type="email" placeholder="yourname@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} icon="send" error={errors.regEmail} />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: 'rgba(200,230,201,0.45)', textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif" }}>State</label>
                <select value={regState} onChange={e => setRegState(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 11, color: regState ? '#f0fdf4' : 'rgba(200,230,201,0.3)', fontFamily: "'Poppins', sans-serif", fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  <option value="" disabled style={{ background: '#202c21' }}>Select your state</option>
                  {indianStates.map(s => <option key={s} value={s} style={{ background: '#202c21', color: '#f0fdf4' }}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: 'rgba(200,230,201,0.45)', textTransform: 'uppercase', fontFamily: "'Poppins', sans-serif" }}>
                  Primary Crop <span style={{ color: 'rgba(200,230,201,0.3)', fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {crops.map(c => (
                    <button key={c} type="button" onClick={() => setRegCrop(c === regCrop ? '' : c)} style={{ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${regCrop === c ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.09)'}`, background: regCrop === c ? 'rgba(74,222,128,0.11)' : 'transparent', color: regCrop === c ? '#86efac' : 'rgba(200,230,201,0.45)', fontFamily: "'Poppins', sans-serif", fontSize: 12, transition: 'all 0.18s' }}>{c}</button>
                  ))}
                </div>
              </div>
              <SubmitBtn loading={loading}>Send OTP to Email</SubmitBtn>
              <p style={{ textAlign: 'center', color: 'rgba(200,230,201,0.3)', fontSize: 11, marginTop: 14, lineHeight: 1.7 }}>
                By registering you agree to our <span style={{ color: '#4ade80', cursor: 'pointer' }}>Terms</span> & <span style={{ color: '#4ade80', cursor: 'pointer' }}>Privacy Policy</span>
              </p>
              <p style={{ textAlign: 'center', color: 'rgba(200,230,201,0.35)', fontSize: 12, marginTop: 10 }}>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', fontSize: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>Sign in</button>
              </p>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes floatDot { from { transform: translateY(0); opacity: 0.35; } to { transform: translateY(-10px); opacity: 0.7; } }
        input::placeholder  { color: rgba(200,230,201,0.22) !important; }
        select option       { background: #202c21 !important; }
      `}</style>
    </div>
  );
};

export default AuthPage;