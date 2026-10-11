import type { QueryClient } from '@tanstack/react-query';
import { AuthError, type Employee, type Role } from '@/lib/auth';
import type { MsgKey } from '@/lib/i18n';

export const ME_KEY = ['auth', 'me'] as const;
export const ROLES: Role[] = ['cutting_operator', 'production_supervisor', 'manager'];

/** Drop every cached query and mark the visitor as signed out. */
export function endSession(qc: QueryClient) {
  qc.cancelQueries();
  qc.removeQueries({ predicate: (q) => !(q.queryKey[0] === 'auth' && q.queryKey[1] === 'me') });
  qc.setQueryData(ME_KEY, null);
}

/** Replace all cached data with a fresh session for a newly signed-in user. */
export async function startSession(qc: QueryClient, user: Employee) {
  // Finish cancellation before publishing the server-confirmed identity. An older
  // anonymous /me response must never replace the identity returned by login.
  await qc.cancelQueries();
  // Keep the observed identity query; deleting it strands mounted observers.
  qc.removeQueries({ predicate: (q) => !(q.queryKey[0] === 'auth' && q.queryKey[1] === 'me') });
  qc.setQueryData(ME_KEY, user);
}

export function isSessionLoss(err: unknown) {
  return err instanceof AuthError && (err.status === 401 || err.code === 'not_authenticated');
}

const KNOWN = new Set([
  'invalid_credentials', 'csrf_failed', 'permission_denied', 'password_change_required',
  'temporary_password_expired', 'self_change_forbidden', 'last_manager', 'validation_error',
  'throttled', 'service_unavailable', 'not_authenticated',
]);
const KNOWN_FIELDS = new Set([
  'username', 'password', 'first_name', 'last_name', 'role', 'temporary_password',
  'current_password', 'new_password', 'is_active', 'non_field_errors',
]);

type T = (k: MsgKey, v?: Record<string, string | number>) => string;

export function errorMessage(err: unknown, t: T): string {
  if (err instanceof AuthError) {
    if (KNOWN.has(err.code)) return t(`err_${err.code}` as MsgKey);
    if (err.status === 401) return t('err_not_authenticated');
    if (err.status === 403) return t('err_permission_denied');
    if (err.status === 429) return t('err_throttled');
    if (err.status >= 500) return t('err_service_unavailable');
    if (err.status === 400 && err.fields) return t('err_validation_error');
    return t('err_unknown');
  }
  if (err instanceof TypeError) return t('err_network');
  return t('err_unknown');
}

/** Translated per-field messages. Server text is never shown verbatim. */
export function fieldErrors(err: unknown, t: T): Record<string, string> {
  const out: Record<string, string> = {};
  if (!(err instanceof AuthError) || !err.fields) return out;
  for (const [name, msgs] of Object.entries(err.fields)) {
    if (!msgs || msgs.length === 0) continue;
    const label = KNOWN_FIELDS.has(name) ? t(`field_${name}` as MsgKey) : name;
    out[name] = t('fieldInvalid', { field: label });
  }
  return out;
}

export function displayName(e: Pick<Employee, 'first_name' | 'last_name' | 'username'>) {
  const n = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();
  return n || e.username;
}

export function initials(e: Pick<Employee, 'first_name' | 'last_name' | 'username'>) {
  const a = (e.first_name || e.username || '?').charAt(0);
  const b = (e.last_name || '').charAt(0);
  return (a + b).toUpperCase();
}
