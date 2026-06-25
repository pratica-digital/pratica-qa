import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from './useAuth';
import { getPasswordPolicyError } from './passwordPolicy';
import { authApi } from '../lib/api';
import praticaLogo from '../assets/pratica-logo.png';
import fundologin from '../assets/fundo-login.png';

type AuthMode = 'login' | 'recover' | 'reset';

type PasswordVisibilityButtonProps = {
  label: string;
  onToggle: () => void;
  visible: boolean;
};

function PasswordVisibilityButton({ label, onToggle, visible }: PasswordVisibilityButtonProps) {
  const Icon = visible ? EyeOff : Eye;
  const title = visible ? `Hide ${label}` : `Show ${label}`;

  return (
    <button
      aria-label={title}
      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
      onClick={onToggle}
      title={title}
      type="button"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function readResetLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');

  if (params.get('mode') !== 'reset' || !token || !email) {
    return null;
  }

  return { email, token };
}

export function LoginPage() {
  const { login } = useAuth();
  const [resetLinkParams] = useState(readResetLinkParams);
  const [mode, setMode] = useState<AuthMode>(resetLinkParams ? 'reset' : 'login');
  const [email, setEmail] = useState(resetLinkParams?.email ?? '');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState(resetLinkParams?.email ?? '');
  const [resetToken, setResetToken] = useState(resetLinkParams?.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(resetLinkParams ? 'Create a new password to finish access setup.' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resetLinkParams) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [resetLinkParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const response = await authApi.requestPasswordRecovery(recoveryEmail);
      setNotice(response.message);
    } catch (recoveryError) {
      setError(recoveryError instanceof Error ? recoveryError.message : 'Unable to request recovery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const policyError = getPasswordPolicyError(newPassword);

    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword(email, resetToken, newPassword);
      setNotice('Password updated. Sign in with your new password.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setMode('login');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ backgroundImage: `url(${fundologin})` }} className="flex min-h-screen items-center justify-center bg-cover bg-center">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-10 shadow-sm">
        <img
          src={praticaLogo}
          alt="Login illustration"
          className="mx-auto mb-6 h-22 w-64 object-cover "
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#E0F7FA]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ADFF2F] text-[white]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {/* Texto principal */}
          <div className="leading-tight">
            <p className="text-lg font-semibold text-blue-900">
              QA
            </p>
            <p className="text-xs tracking-widest text-zinc-400">
              WORKSPACE
            </p>
          </div>
        </div>

        {mode === 'login' ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input
                autoComplete="email"
                autoFocus
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Password
              <span className="relative mt-1 block">
                <input
                  autoComplete="current-password"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <PasswordVisibilityButton
                  label="password"
                  onToggle={() => setShowPassword((value) => !value)}
                  visible={showPassword}
                />
              </span>
            </label>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            ) : null}

            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1c4484] px-3 text-sm font-medium text-white hover:bg-[#16386d] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Signing in' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between gap-3">
              <button
                className="text-sm font-medium text-blue-800 hover:text-blue-950"
                onClick={() => {
                  setRecoveryEmail(email);
                  setError('');
                  setNotice('');
                  setMode('recover');
                }}
                type="button"
              >
                Forgot password
              </button>
              <button
                className="text-sm font-medium text-slate-600 hover:text-slate-950"
                onClick={() => {
                  setError('');
                  setNotice('');
                  setMode('reset');
                }}
                type="button"
              >
                Use reset token
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'recover' ? (
          <form className="mt-6 space-y-4" onSubmit={handleRecoverySubmit}>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input
                autoComplete="email"
                autoFocus
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                onChange={(event) => setRecoveryEmail(event.target.value)}
                required
                type="email"
                value={recoveryEmail}
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            ) : null}

            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Sending' : 'Send recovery email'}
            </button>

            <button
              className="h-10 w-full rounded-lg bg-slate-600 text-sm font-medium text-white hover:bg-slate-700"
              onClick={() => {
                setError('');
                setMode('login');
              }}
              type="button"
            >
              Back to sign in
            </button>
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form className="mt-6 space-y-4" onSubmit={handleResetSubmit}>
            <label className="block text-sm font-medium text-zinc-700">
              Email
              <input
                autoComplete="email"
                autoFocus
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            {resetLinkParams ? (
              <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Reset token loaded from the email link.
              </p>
            ) : (
              <label className="block text-sm font-medium text-zinc-700">
                Reset token
                <input
                  autoComplete="one-time-code"
                  className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  onChange={(event) => setResetToken(event.target.value)}
                  required
                  type="text"
                  value={resetToken}
                />
              </label>
            )}

            <label className="block text-sm font-medium text-zinc-700">
              New password
              <span className="relative mt-1 block">
                <input
                  autoComplete="new-password"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                />
                <PasswordVisibilityButton
                  label="new password"
                  onToggle={() => setShowNewPassword((value) => !value)}
                  visible={showNewPassword}
                />
              </span>
            </label>

            <label className="block text-sm font-medium text-zinc-700">
              Confirm password
              <span className="relative mt-1 block">
                <input
                  autoComplete="new-password"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-10 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                />
                <PasswordVisibilityButton
                  label="confirm password"
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                  visible={showConfirmPassword}
                />
              </span>
            </label>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            ) : null}

            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Saving' : 'Reset password'}
            </button>

            <button
              className="h-10 w-full rounded-lg bg-slate-600 text-sm font-medium text-white hover:bg-slate-700"
              onClick={() => {
                setError('');
                setMode('login');
              }}
              type="button"
            >
              Back to sign in
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
