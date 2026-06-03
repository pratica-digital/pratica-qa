import { FormEvent, useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from './useAuth';
import praticaLogo from '../assets/pratica-logo.png';
import fundologin from '../assets/fundo-login.png';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <main style={{ backgroundImage: `url(${fundologin})` }} className="flex min-h-screen items-center justify-center bg-cover bg-center">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <img
          src={praticaLogo}
          alt="Login illustration"
          className="mx-auto mb-6 h-22 w-64 object-cover "
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#E0F7FA] dark:border-zinc-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ADFF2F] text-[white]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          {/* Texto principal */}
          <div className="leading-tight">
            <p className="text-lg font-semibold text-blue-900 dark:text-white">
              QA
            </p>
            <p className="text-xs tracking-widest text-zinc-400">
              WORKSPACE
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Email
            <input
              autoComplete="email"
              autoFocus
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Password
            <input
              autoComplete="current-password"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1c4484] px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={isSubmitting}
            type="submit"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
