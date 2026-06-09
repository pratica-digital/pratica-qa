import { FormEvent, useState } from 'react';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from './useAuth';
import { getPasswordPolicyError } from './passwordPolicy';
import praticaLogo from '../assets/pratica-logo.png';

export function FirstAccessPasswordPage() {
  const { changePassword, logout, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

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
      await changePassword(currentPassword, newPassword);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <img src={praticaLogo} alt="Pratica" className="h-12 w-40 object-contain object-left" />
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{user?.email}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">
            Change temporary password
          </h1>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Temporary password
            <input
              autoComplete="current-password"
              autoFocus
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            New password
            <input
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Confirm password
            <input
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={isSubmitting}
            type="submit"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Saving' : 'Save password'}
          </button>
        </form>

        <button
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
          onClick={logout}
          type="button"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </section>
    </main>
  );
}
