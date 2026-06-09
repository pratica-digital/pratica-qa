import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { usersApi } from '../lib/api';
import type { AuthUser, CreateUserPayload, UpdateUserPayload, UserRole, UserStatus } from '../types/testRun';
import { UserRoleBadge, UserStatusBadge } from '../components/badges';

const roleOptions: UserRole[] = ['ADMIN', 'QA', 'VIEWER'];
const statusOptions: UserStatus[] = ['ACTIVE', 'INACTIVE'];

type TemporaryPasswordNotice = {
  email: string;
  password: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function UsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UpdateUserPayload>>({});
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    name: '',
    email: '',
    role: 'QA',
    status: 'ACTIVE',
  });
  const [search, setSearch] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPasswordNotice | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token || currentUser?.role !== 'ADMIN') {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setUsers(await usersApi.list(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.role, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUsers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((item) =>
      [item.name, item.email, item.role, item.status ?? 'ACTIVE']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [search, users]);

  const updateUserInState = (updatedUser: AuthUser) => {
    setUsers((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
  };

  const getDraft = (item: AuthUser): Required<Pick<CreateUserPayload, 'name' | 'email' | 'role' | 'status'>> => ({
    name: drafts[item.id]?.name ?? item.name,
    email: drafts[item.id]?.email ?? item.email,
    role: drafts[item.id]?.role ?? item.role,
    status: drafts[item.id]?.status ?? item.status ?? 'ACTIVE',
  });

  const setDraftField = (userId: string, field: keyof CreateUserPayload, value: string) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSaving(true);
    setError('');
    setTemporaryPassword(null);

    try {
      const response = await usersApi.create(token, createForm);
      setUsers((current) => [response.user, ...current]);
      setTemporaryPassword({
        email: response.user.email,
        password: response.temporaryPassword,
      });
      setCreateForm({
        name: '',
        email: '',
        role: 'QA',
        status: 'ACTIVE',
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (item: AuthUser) => {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedUser = await usersApi.update(token, item.id, getDraft(item));
      updateUserInState(updatedUser);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusAction = async (item: AuthUser, action: 'activate' | 'deactivate') => {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedUser =
        action === 'activate' ? await usersApi.activate(token, item.id) : await usersApi.deactivate(token, item.id);
      updateUserInState(updatedUser);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update user status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (item: AuthUser) => {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError('');
    setTemporaryPassword(null);

    try {
      const response = await usersApi.resetPassword(token, item.id);
      updateUserInState(response.user);
      setTemporaryPassword({
        email: response.user.email,
        password: response.temporaryPassword,
      });
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">Restricted area</h1>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-blue-700 dark:text-blue-300">Access control</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-white">Users</h1>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 sm:max-w-xs">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            type="search"
            value={search}
          />
        </label>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[1fr_1fr_140px_140px_auto]"
        onSubmit={handleCreate}
      >
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Name
          <input
            className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={createForm.name}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Email
          <input
            className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
            onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
            required
            type="email"
            value={createForm.email}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Role
          <select
            className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
            onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as UserRole }))}
            value={createForm.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Status
          <select
            className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, status: event.target.value as UserStatus }))
            }
            value={createForm.status}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 md:self-end"
          disabled={isSaving}
          type="submit"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Create
        </button>
      </form>

      {temporaryPassword ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <p className="font-medium">{temporaryPassword.email}</p>
          <p className="mt-1 font-mono text-base">{temporaryPassword.password}</p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Access</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Password</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                    Loading users
                  </td>
                </tr>
              ) : null}

              {!isLoading && filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                    No users found
                  </td>
                </tr>
              ) : null}

              {filteredUsers.map((item) => {
                const draft = getDraft(item);
                const isCurrentUser = item.id === currentUser.id;

                return (
                  <tr className="align-top" key={item.id}>
                    <td className="min-w-72 px-4 py-4">
                      <div className="grid gap-2">
                        <input
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
                          onChange={(event) => setDraftField(item.id, 'name', event.target.value)}
                          value={draft.name}
                        />
                        <input
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:ring-zinc-800"
                          onChange={(event) => setDraftField(item.id, 'email', event.target.value)}
                          type="email"
                          value={draft.email}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <select
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
                          onChange={(event) => setDraftField(item.id, 'role', event.target.value)}
                          value={draft.role}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <UserRoleBadge role={item.role} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <select
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-800"
                          onChange={(event) => setDraftField(item.id, 'status', event.target.value)}
                          value={draft.status}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <UserStatusBadge status={item.status} />
                      </div>
                    </td>
                    <td className="min-w-48 px-4 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                      <div className="flex flex-col gap-2">
                        <span>{item.firstAccess ? 'First access' : `Changed ${formatDate(item.passwordChangedAt)}`}</span>
                        <button
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
                          disabled={isSaving}
                          onClick={() => handleResetPassword(item)}
                          type="button"
                        >
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                          Reset
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-44 flex-wrap gap-2">
                        <button
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                          disabled={isSaving}
                          onClick={() => handleSave(item)}
                          type="button"
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          Save
                        </button>
                        {item.status === 'INACTIVE' ? (
                          <button
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                            disabled={isSaving}
                            onClick={() => handleStatusAction(item, 'activate')}
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            Activate
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                            disabled={isSaving || isCurrentUser}
                            onClick={() => handleStatusAction(item, 'deactivate')}
                            type="button"
                          >
                            <UserX className="h-4 w-4" aria-hidden="true" />
                            Deactivate
                          </button>
                        )}
                        <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          {item.firstAccess ? (
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          )}
                          {item.firstAccess ? 'Pending' : 'Ready'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
