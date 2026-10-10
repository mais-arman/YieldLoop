import { useQuery } from "@tanstack/react-query";
import type { GetReportOverviewParams, ReportOverview } from "@workspace/api-client-react";
import { authRequest } from "./auth";

export type { GetReportOverviewParams, ReportOverview, ReportMeasures, ReportJob } from "@workspace/api-client-react";
export const REPORTS_KEY = ["reports"] as const;
export function useReportOverview(filters: GetReportOverviewParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return useQuery({
    queryKey: [...REPORTS_KEY, filters],
    queryFn: () => authRequest<ReportOverview>(`reports/overview?${params}`),
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
