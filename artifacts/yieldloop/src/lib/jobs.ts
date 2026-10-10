import { useQuery } from "@tanstack/react-query";
import type { JobInput, JobUpdate, JobPage, ProductionJob, JobStatus } from "@workspace/api-client-react";
import { authRequest } from "./auth";

export type { JobInput, JobUpdate, JobPage, ProductionJob, JobStatus };
export const JOBS_KEY = ["jobs"] as const;
export interface JobFilters { page: number; search?: string; status?: JobStatus; }
export function useJobs(filters: JobFilters) {
  const params = new URLSearchParams({ page: String(filters.page), page_size: "20" });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  return useQuery({
    queryKey: [...JOBS_KEY, "list", filters],
    queryFn: () => authRequest<JobPage>(`jobs?${params}`),
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export function useJob(id: number) {
  return useQuery({
    queryKey: [...JOBS_KEY, "detail", id],
    queryFn: () => authRequest<ProductionJob>(`jobs/${id}`),
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export const createJob = (data: JobInput) => authRequest<ProductionJob>("jobs", "POST", data);
export const updateJob = (id: number, data: JobUpdate) =>
  authRequest<ProductionJob>(`jobs/${id}`, "PATCH", data);
