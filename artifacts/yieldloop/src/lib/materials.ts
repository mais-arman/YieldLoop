import { useQuery } from "@tanstack/react-query";
import type { Material, MaterialPage, MaterialInput, MaterialState, MaterialEntryInput, MaterialVoidInput, MaterialEntry } from "@workspace/api-client-react";
import { authRequest } from "./auth";

export type { Material, MaterialPage, MaterialInput, MaterialState, MaterialEntryInput, MaterialVoidInput, MaterialEntry };
export const MATERIALS_KEY = ["materials"] as const;
export const MATERIAL_STATE_KEY = ["job-materials"] as const;
export function useMaterials(page: number, search: string, enabled = true) {
  const params = new URLSearchParams({ page: String(page), page_size: "20", search });
  return useQuery({
    queryKey: [...MATERIALS_KEY, page, search],
    queryFn: () => authRequest<MaterialPage>(`materials?${params}`),
    enabled, retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export function useJobMaterials(id: number, page: number) {
  return useQuery({
    queryKey: [...MATERIAL_STATE_KEY, id, page],
    queryFn: () => authRequest<MaterialState>(`jobs/${id}/materials?page=${page}&page_size=20`),
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export const createMaterial = (data: MaterialInput) => authRequest<Material>("materials", "POST", data);
export const recordMaterialEntry = (id: number, data: MaterialEntryInput) =>
  authRequest<MaterialState>(`jobs/${id}/materials/entries`, "POST", data);
export const voidMaterialEntry = (id: number, entryId: number, data: MaterialVoidInput) =>
  authRequest<MaterialState>(`jobs/${id}/materials/entries/${entryId}/void`, "POST", data);
