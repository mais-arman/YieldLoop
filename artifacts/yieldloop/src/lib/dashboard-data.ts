import type { ReportMeasures, ReportOverviewJobCounts, EmployeeRole, JobStatus } from '@workspace/api-client-react';

/** Display order for job statuses; open work first. */
export const STATUS_ORDER: JobStatus[] = ['open', 'draft', 'completed', 'cancelled'];

export type StatusSlice = { status: JobStatus; count: number };

/** Real job-status composition from report counts. Zero-count statuses are dropped. */
export function jobStatusSlices(counts: ReportOverviewJobCounts): { slices: StatusSlice[]; total: number } {
  const slices = STATUS_ORDER.map((status) => ({ status, count: counts[status] ?? 0 })).filter((s) => s.count > 0);
  return { slices, total: slices.reduce((a, s) => a + s.count, 0) };
}

export type OutputKey = 'good' | 'scrap' | 'offcut' | 'pending_rework' | 'variance';
export type OutputSlice = { key: OutputKey; value: number; raw: string };

/**
 * Single-material output composition. Returns null when the server withheld
 * quantities (mixed materials) and an empty list when nothing was issued.
 * Negative variance (accounted exceeds issued) is not drawn as a bar segment.
 */
export function outputSlices(production: ReportMeasures | null): OutputSlice[] | null {
  if (!production) return null;
  if (!(Number(production.issued) > 0)) return [];
  const rows: OutputSlice[] = (['good', 'scrap', 'offcut'] as const).map((key) => ({ key, value: Number(production[key]) || 0, raw: production[key] }));
  // Pending rework is accounted but neither good nor scrap; only drawn when present.
  const pr = production.pending_rework ?? '0';
  if (Number(pr) > 0) rows.push({ key: 'pending_rework', value: Number(pr), raw: pr });
  const v = Number(production.variance);
  if (v > 0) rows.push({ key: 'variance', value: v, raw: production.variance });
  return rows;
}

export type DashboardFocus = {
  /** Show reconciliation exceptions panel. */
  exceptions: boolean;
  /** Show comparison shortcut. */
  comparison: boolean;
  /** Show employee management shortcut. */
  employees: boolean;
  /** Table lists open jobs first and is titled as open work. */
  openFirst: boolean;
  /** Exceptions lead the page, above KPIs (production overview). */
  exceptionsFirst: boolean;
  /** Show management composition charts. */
  charts: boolean;
};

/** Manager: oversight dashboard. Supervisor: exceptions-first production overview. Data scope is enforced by the server. */
export function dashboardFocus(role: EmployeeRole): DashboardFocus {
  if (role === 'manager') return { exceptions: true, comparison: true, employees: true, openFirst: false, exceptionsFirst: false, charts: true };
  if (role === 'production_supervisor') return { exceptions: true, comparison: true, employees: false, openFirst: true, exceptionsFirst: true, charts: false };
  return { exceptions: false, comparison: false, employees: false, openFirst: true, exceptionsFirst: false, charts: false };
}

/** Stable ordering for the jobs table: open jobs first when requested, otherwise server order. */
export function orderJobs<T extends { status: JobStatus }>(jobs: T[], openFirst: boolean): T[] {
  if (!openFirst) return jobs;
  return [...jobs].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
}
