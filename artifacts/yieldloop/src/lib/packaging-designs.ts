import { useQuery } from "@tanstack/react-query";
import type { PackagingDesignRecord, PackagingDesignRecordPage, PackagingDesignHistoryPage, PackagingDesignSaveInput, PackagingDesignUpdateInput } from "@workspace/api-client-react";
import { authRequest } from "./auth";
export type { PackagingDesignRecord };
export const PK_DESIGNS_KEY = ["packaging-designs"] as const;
export function usePackagingDesigns(page: number) {
  return useQuery({ queryKey: [...PK_DESIGNS_KEY, "list", page], queryFn: () => authRequest<PackagingDesignRecordPage>(`packaging/designs?page=${page}&page_size=10`), retry: false, staleTime: 0 });
}
export function usePackagingDesignHistory(id: number | null, page: number) {
  return useQuery({ queryKey: [...PK_DESIGNS_KEY, "history", id, page], queryFn: () => authRequest<PackagingDesignHistoryPage>(`packaging/designs/${id}/history?page=${page}&page_size=10`), enabled: id !== null, retry: false, staleTime: 0 });
}
export const getPackagingDesign = (id: number, revision?: number) => authRequest<PackagingDesignRecord>(`packaging/designs/${id}${revision ? `?revision=${revision}` : ''}`);
export const createPackagingDesign = (data: PackagingDesignSaveInput) => authRequest<PackagingDesignRecord>("packaging/designs", "POST", data);
export const updatePackagingDesign = (id: number, data: PackagingDesignUpdateInput) => authRequest<PackagingDesignRecord>(`packaging/designs/${id}`, "PUT", data);
