import { useQuery } from "@tanstack/react-query";
import type { InventoryLot, InventoryPage, InventoryInput, InventoryVoidInput } from "@workspace/api-client-react";
import { authRequest } from "./auth";
export type { InventoryLot, InventoryInput, InventoryVoidInput };
export const INVENTORY_KEY = ["inventory"] as const;
export function useInventory(filters: { page: number; search?: string; state?: "available" | "voided"; job_id?: number }) {
  const p = new URLSearchParams({ page: String(filters.page), page_size: "20" });
  if (filters.search) p.set("search", filters.search);
  if (filters.state) p.set("state", filters.state);
  if (filters.job_id) p.set("job_id", String(filters.job_id));
  return useQuery({ queryKey: [...INVENTORY_KEY, "list", filters], queryFn: () => authRequest<InventoryPage>(`inventory?${p}`), retry: false, staleTime: 0 });
}
export function useInventoryLot(id: number) {
  return useQuery({ queryKey: [...INVENTORY_KEY, "detail", id], queryFn: () => authRequest<InventoryLot>(`inventory/${id}`), retry: false, staleTime: 0 });
}
export const registerOffcut = (data: InventoryInput) => authRequest<InventoryLot>("inventory", "POST", data);
export const voidInventoryLot = (id: number, data: InventoryVoidInput) => authRequest<InventoryLot>(`inventory/${id}/void`, "POST", data);
