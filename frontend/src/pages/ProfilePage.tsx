import { FormEvent, useState } from 'react';
import { KeyRound, Mail, Save, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { getPasswordPolicyError } from '../auth/passwordPolicy';
import { UserRoleBadge, UserStatusBadge } from '../components/badges';

export function ProfilePage() {
  const { changePassword, updateProfile, user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setProfileMessage('');
    setIsSavingProfile(true);

    try {
      await updateProfile({ name, email });
      setProfileMessage('Profile saved.');
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPasswordMessage('');

    const policyError = getPasswordPolicyError(newPassword);

    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password changed.');
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Unable to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-blue-700 dark:text-blue-300">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">Profile</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role ? <UserRoleBadge role={user.role} /> : null}
          <UserStatusBadge status={user?.status} />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          onSubmit={handleProfileSubmit}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Personal data</h2>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Name
              <input
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Email
              <span className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus-within:ring-zinc-800">
                <Mail className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
          </div>

          {profileMessage ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {profileMessage}
            </p>
          ) : null}

          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={isSavingProfile}
            type="submit"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSavingProfile ? 'Saving' : 'Save'}
          </button>
        </form>

        <form
          className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          onSubmit={handlePasswordSubmit}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Password</h2>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Current password
              <input
                autoComplete="current-password"
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
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
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
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
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>

          {passwordMessage ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {passwordMessage}
            </p>
          ) : null}

          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            disabled={isSavingPassword}
            type="submit"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {isSavingPassword ? 'Saving' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}
