import type { AssistanceAnswer, AssistanceEvidence, AssistanceStatus } from '@workspace/api-client-react';

/** The floating entry exists only when the server reports a configured, available provider. */
export function assistantEntryAvailable(status: AssistanceStatus | undefined | null): boolean {
  return status?.available === true;
}

export type PeerJob = { id: number; reference: string; job_number: string; machine: string };

export type Suggestion =
  | { kind: 'scrap'; job: string }
  | { kind: 'material'; job: string }
  | { kind: 'compare'; a: string; b: string; href: string };

const label = (j: { reference: string; job_number: string }) => (j.reference.trim() ? j.reference : j.job_number);

/**
 * Suggestions derived only from records the user can already read.
 * Per-job questions need recorded scrap / issued material; comparisons link to
 * the existing comparison view for an accessible job on the same machine.
 */
export function buildSuggestions(ev: AssistanceEvidence | undefined, current: PeerJob | undefined, peers: PeerJob[], allowCompare = true): Suggestion[] {
  if (!ev) return [];
  const out: Suggestion[] = [];
  const name = label(ev.job);
  if (ev.largest_scrap_category && Number(ev.largest_scrap_category.quantity) > 0) out.push({ kind: 'scrap', job: name });
  const issued = ev.calculated_findings?.issued;
  if (issued != null && Number(issued) > 0) out.push({ kind: 'material', job: name });
  const machine = current?.machine.trim();
  if (machine && allowCompare) {
    const peer = peers.find((p) => p.id !== ev.job.id && p.machine.trim() === machine);
    if (peer) out.push({ kind: 'compare', a: name, b: label(peer), href: `/comparison?left=${ev.job.id}&right=${peer.id}` });
  }
  return out;
}

/** An answer may be shown only for the job it was requested for. */
export function answerMatchesJob(answer: AssistanceAnswer, jobId: number | null): boolean {
  return jobId !== null && answer.evidence.job.id === jobId;
}
