// src/components/auth/LoginView.tsx
import { useState, useEffect } from 'react';
import { Loader2, LogIn, UserPlus, AlertCircle, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props { onAuthed: () => void; }

type Mode = 'login' | 'signup' | 'forgot' | 'forgot_sent' | 'reset';

export default function LoginView({ onAuthed }: Props) {
  const { signup, login, forgotPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Detect ?reset_token=... in URL and switch to reset mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setMode('reset');
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(email.trim(), password);
        onAuthed();
      } else if (mode === 'login') {
        await login(email.trim(), password);
        onAuthed();
      } else if (mode === 'forgot') {
        await forgotPassword(email.trim());
        setMode('forgot_sent');
      } else if (mode === 'reset') {
        await resetPassword(resetToken, password);
        // Clear the token from the URL and go back to login
        window.history.replaceState({}, '', window.location.pathname);
        setMode('login');
        setPassword('');
        setErr(null);
      }
    } catch (ex: any) {
      setErr(ex?.message || 'failed');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'forgot_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <Mail className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Check your inbox</h1>
          <p className="text-slate-500 text-sm mb-6">If an account exists for <strong>{email}</strong>, we've sent a password reset link. It expires in 1 hour.</p>
          <button type="button" onClick={() => { setMode('login'); setErr(null); }} className="text-blue-600 hover:underline font-semibold text-sm">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">LeadScrubber</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Choose a new password'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="you@example.com" />
            </div>
          )}
          {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="at least 8 characters" />
            </div>
          )}
          {err && (<div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}</div>)}
          <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : mode === 'signup' ? <UserPlus className="w-4 h-4" /> : mode === 'forgot' ? <Mail className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            {mode === 'login' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'forgot' && 'Send reset link'}
            {mode === 'reset' && 'Set new password'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-500 space-y-2">
          {mode === 'login' && (
            <>
              <div>
                <button type="button" onClick={() => { setMode('forgot'); setErr(null); }} className="text-blue-600 hover:underline font-semibold">
                  Forgot password?
                </button>
              </div>
              <div>
                New here?{' '}
                <button type="button" onClick={() => { setMode('signup'); setErr(null); }} className="text-blue-600 hover:underline font-semibold">
                  Create an account
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setErr(null); }} className="text-blue-600 hover:underline font-semibold">
                Sign in
              </button>
            </div>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <div>
              <button type="button" onClick={() => { setMode('login'); setErr(null); }} className="text-blue-600 hover:underline font-semibold">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
