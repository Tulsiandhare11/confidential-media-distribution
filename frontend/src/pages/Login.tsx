import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, LoaderCircleIcon, MailCheckIcon } from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { BrandMark } from '../components/BrandMark';
import { CloudinaryMark } from '../components/CloudinaryMark';

type Mode = 'login' | 'signup' | 'verify';

export function Login() {
  const { token, status, login, establishSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {from?: string;} | null)?.from ?? '/';

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token && status === 'authenticated') return <Navigate to={from} replace />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(api.errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      try {
        await login(email, password);
        navigate(from, { replace: true });
      } catch (err) {
        if (err instanceof api.ApiError && /verif/i.test(`${err.code} ${err.message}`)) {
          setMode('verify');
          throw new Error('Please verify your email first — enter the code we sent you.');
        }
        throw err;
      }
    });
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.signup({ name, email, password });
      setMode('verify');
    });
  };
  const handleResend = () => {
  run(async () => {
    await api.resendVerification(email);
  });
};

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const session = await api.verifyEmail({ email, code: code.trim() });
      if (session) await establishSession(session);else
      await login(email, password);
      navigate(from, { replace: true });
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <p className="mt-4 text-lg font-extrabold text-espresso-800">Confidential Media Distribution</p>
        </div>

        <div className="surface-card hero-surface p-8">
          {mode === 'verify' ?
          <>
              <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-taupe-700 hover:text-espresso">
              
                <ArrowLeftIcon className="h-4 w-4" aria-hidden /> Back
              </button>
              <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 ring-1 ring-inset ring-sage-600/20">
                <MailCheckIcon className="h-5 w-5" aria-hidden />
              </span>
              <h1 className="mt-4 text-2xl font-extrabold text-ink">Check your inbox</h1>
              <p className="mt-1.5 text-sm text-taupe-700">
                Enter the code we sent to <span className="font-bold text-ink">{email || 'your email'}</span> to activate
                your account.
              </p>
              <form onSubmit={handleVerify} className="mt-6 space-y-4">
                {!email &&
              <Field label="Email" id="verify-email">
                    <input id="verify-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
                  </Field>
              }
                <Field label="Verification code" id="verify-code">
                  <input
                  id="verify-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, '').toUpperCase())}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="••••••"
                  className="field mono !h-14 text-center !text-2xl tracking-[0.45em]" />
                
                </Field>
                {!password &&
              <Field label="Password" id="verify-password">
                    <input id="verify-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
                  </Field>
              }
                <ErrorLine error={error} />
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy && <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />}
                  Verify and continue
                </button>
                <button
                 type="button" onClick={handleResend}disabled={busy} className="mt-3 w-full font-bold   text-terracotta-700"
>              {busy ? 'Sending…' : 'Resend OTP'}
               </button>
              </form>
            </> :

          <>
              <h1 className="text-[22px] font-extrabold leading-snug text-ink">
                Control how sensitive media is distributed, viewed, and traced
              </h1>

              <div className="relative mt-6 grid grid-cols-2 rounded-xl bg-cream-200 p-1" role="tablist" aria-label="Account">
                {(['login', 'signup'] as const).map((m) =>
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`relative z-[1] h-9 rounded-lg text-sm font-extrabold transition-colors duration-150 ${mode === m ? 'text-espresso' : 'text-taupe-700'}`}>
                
                    {mode === m &&
                <motion.span
                  layoutId="auth-toggle"
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute inset-0 -z-[1] rounded-lg bg-cream-50 shadow-[0_1px_2px_rgba(74,48,36,0.12),inset_0_1px_0_white]" />

                }
                    {m === 'login' ? 'Log in' : 'Sign up'}
                  </button>
              )}
              </div>

              <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="mt-6 space-y-4">
                {mode === 'signup' &&
              <Field label="Full name" id="name">
                    <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
                  </Field>
              }
                <Field label="Email" id="email">
                  <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
                </Field>
                <Field label="Password" id="password">
                  <input
                  id="password"
                  type="password"
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field" />
                
                </Field>
                <ErrorLine error={error} />
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy && <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />}
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </button>
              </form>
            </>
          }
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-taupe-700">
          <CloudinaryMark className="h-3.5 w-4" /> Powered by Cloudinary AI
        </p>
      </div>
    </div>);

}

function Field({ label, id, children }: {label: string;id: string;children: React.ReactNode;}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
      </label>
      {children}
    </div>);

}

function ErrorLine({ error }: {error: string | null;}) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-brick-50 px-3 py-2 text-sm font-semibold text-brick-700">
      {error}
    </p>);

}