import type { Role } from './auth';

/**
 * Frontend presentation policy. The backend remains authoritative; these rules
 * only decide which routes, navigation entries, and contextual links a role sees.
 * Reports/dashboard/comparison are Manager/Supervisor-only in both UI and API.
 * Backend ReportingAccess remains authoritative.
 */
export type Area = 'dashboard' | 'jobs' | 'jobNew' | 'cutting' | 'inventory' | 'reports' | 'comparison' | 'employees' | 'packaging' | 'assistant' | 'health';

const ACCESS: Record<Area, Role[]> = {
  dashboard: ['production_supervisor', 'manager'],
  jobs: ['cutting_operator', 'production_supervisor', 'manager'],
  jobNew: ['manager'],
  cutting: ['cutting_operator', 'production_supervisor', 'manager'],
  inventory: ['cutting_operator', 'production_supervisor', 'manager'],
  reports: ['production_supervisor', 'manager'],
  comparison: ['production_supervisor', 'manager'],
  employees: ['manager'],
  // Operators keep contextual access (no backend restriction); omitted from their primary nav only.
  packaging: ['cutting_operator', 'production_supervisor', 'manager'],
  assistant: ['production_supervisor', 'manager'],
  health: ['manager'],
};

export function canAccess(role: Role, area: Area): boolean {
  return ACCESS[area].includes(role);
}

export type NavKey = 'navOverview' | 'navDashboard' | 'navMyWork' | 'navJobs' | 'navCutting' | 'navInventory' | 'navReports' | 'navPackaging' | 'navEmployees';
export type NavEntry = { href: string; key: NavKey; area: Area; testId: string };

const NAV: Record<Role, NavEntry[]> = {
  cutting_operator: [
    { href: '/jobs', key: 'navMyWork', area: 'jobs', testId: 'jobs' },
    { href: '/cutting', key: 'navCutting', area: 'cutting', testId: 'cutting' },
    { href: '/inventory', key: 'navInventory', area: 'inventory', testId: 'inventory' },
  ],
  production_supervisor: [
    { href: '/dashboard', key: 'navOverview', area: 'dashboard', testId: 'dashboard' },
    { href: '/jobs', key: 'navJobs', area: 'jobs', testId: 'jobs' },
    { href: '/inventory', key: 'navInventory', area: 'inventory', testId: 'inventory' },
    { href: '/reports', key: 'navReports', area: 'reports', testId: 'reports' },
    { href: '/cutting', key: 'navCutting', area: 'cutting', testId: 'cutting' },
    { href: '/packaging', key: 'navPackaging', area: 'packaging', testId: 'packaging' },
  ],
  manager: [
    { href: '/dashboard', key: 'navDashboard', area: 'dashboard', testId: 'dashboard' },
    { href: '/jobs', key: 'navJobs', area: 'jobs', testId: 'jobs' },
    { href: '/inventory', key: 'navInventory', area: 'inventory', testId: 'inventory' },
    { href: '/reports', key: 'navReports', area: 'reports', testId: 'reports' },
    { href: '/cutting', key: 'navCutting', area: 'cutting', testId: 'cutting' },
    { href: '/packaging', key: 'navPackaging', area: 'packaging', testId: 'packaging' },
    { href: '/employees', key: 'navEmployees', area: 'employees', testId: 'employees' },
  ],
};

export function navFor(role: Role): NavEntry[] {
  return NAV[role].filter((e) => canAccess(role, e.area));
}

/** Pagination presentation: hide when a single page, disable at the ends. */
export function pagerState(page: number, totalPages: number) {
  const total = Math.max(1, totalPages || 1);
  return { visible: total > 1, canPrev: page > 1, canNext: page < total, total };
}

/**
 * Client-side paging for a list the server already returned in full (bounded
 * array, e.g. employees). Does not fetch more data; clamps out-of-range pages.
 */
export function pageSlice<T>(items: T[], page: number, size: number): { rows: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), totalPages);
  return { rows: items.slice((p - 1) * size, p * size), page: p, totalPages };
}
