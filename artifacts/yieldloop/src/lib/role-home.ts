import type { Role } from './auth';

/** Existing routes only; landing presentation is separate from server authorization. */
export function roleHome(role: Role): string {
  return role === 'cutting_operator' ? '/jobs' : '/dashboard';
}
