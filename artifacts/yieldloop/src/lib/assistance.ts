import { useQuery } from '@tanstack/react-query';
import type {
  AssistanceAnswer, AssistanceEvidence, AssistanceInput, AssistanceLead, AssistanceStatus, EvidenceCuttingPlan, EvidenceFact,
  PackagingCatalogue, PackagingPrompt, PackagingProposal, PackagingValidation,
} from '@workspace/api-client-react';
import { authRequest } from './auth';
import type { PackagingDesign } from './packaging-templates';

export type { AssistanceAnswer, AssistanceStatus, AssistanceLead as Lead, EvidenceFact as RecordedFact, EvidenceCuttingPlan as CuttingEvidence };
export type Evidence = AssistanceEvidence;

export const AI_ERROR_CODES = ['ai_unavailable', 'ai_provider_error', 'ai_invalid_output'] as const;

/** Revision signature: two evidence snapshots describe the same records iff signatures match. */
export function evidenceSignature(ev: Evidence): string {
  return JSON.stringify([ev.job.id, ev.job.revision, ev.material_revision, ev.cutting.map((p) => [p.plan_id, p.revision])]);
}

export function useAssistanceStatus() {
  return useQuery({ queryKey: ['assistance', 'status'], queryFn: () => authRequest<AssistanceStatus>('assistance/status'), retry: false, staleTime: 30_000 });
}
export function useEvidence(jobId: number | null) {
  return useQuery({
    queryKey: ['assistance', 'evidence', jobId],
    queryFn: () => authRequest<Evidence>(`jobs/${jobId}/assistance/evidence`),
    enabled: jobId !== null, retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export const askAssistant = (jobId: number, data: AssistanceInput) =>
  authRequest<AssistanceAnswer>(`jobs/${jobId}/assistance`, 'POST', data);

export function usePackagingTemplates() {
  return useQuery({ queryKey: ['packaging', 'templates'], queryFn: () => authRequest<PackagingCatalogue>('packaging/templates'), retry: false, staleTime: 300_000 });
}
export const validatePackaging = (design: PackagingDesign) =>
  authRequest<PackagingValidation>('packaging/validate', 'POST',design);
export const proposePackaging = (data: PackagingPrompt) =>
  authRequest<PackagingProposal>('packaging/propose', 'POST', data);
