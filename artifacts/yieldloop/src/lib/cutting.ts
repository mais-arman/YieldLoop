import { useQuery } from "@tanstack/react-query";
import { authRequest } from "./auth";

export interface CuttingBoard { width: string; height: string; quantity: number; left: string; right: string; top: string; bottom: string }
export interface CuttingPiece { key: string; label: string; width: string; height: string; quantity: number; rotation_allowed: boolean }
export interface CuttingInput {
  unit: "mm"; material_id: number; stock_label: string; cutting_mode: "rectangular_spacing_only";
  board: CuttingBoard; kerf: string; pieces: CuttingPiece[];
}
export interface Placement { piece_key: string; copy: number; board: number; x: string; y: string; rotated: boolean }
export interface CuttingResult {
  board_count: number; available_boards: number; placed_count: number; unplaced_count: number;
  required_area: string; placed_area: string; board_area: string; used_board_area: string;
  unused_area: string; available_area: string; utilization: string | null; valid: boolean;
  unplaced: { piece_key: string; quantity: number; reason: "not_placed" | "cannot_fit" }[];
}
export interface CuttingScenario {
  key: string; name: string; input: CuttingInput; placements: Placement[];
  origin: "manual" | "shelf_v1"; result?: CuttingResult;
}
export interface CuttingPlan {
  id: number; job_id: number; name: string; revision: number; scenarios: CuttingScenario[];
  created_at: string; updated_at: string; can_edit: boolean;
}
export interface PlanHistory { revision: number; name: string; scenarios: CuttingScenario[]; reason: string; actor: string; created_at: string }
export interface CuttingPage<T> { count: number; page: number; page_size: number; total_pages: number; results: T[] }
export const CUTTING_KEY = ["cutting"] as const;
export function useCuttingPlans(jobId: number, page = 1) {
  return useQuery({ queryKey: [...CUTTING_KEY, jobId, "list", page],
    queryFn: () => authRequest<CuttingPage<Pick<CuttingPlan, "id" | "name" | "revision" | "updated_at">>>(`jobs/${jobId}/cutting?page=${page}`),
    retry: false, staleTime: 0 });
}
export function useCuttingPlan(jobId: number, id: number | null) {
  return useQuery({ queryKey: [...CUTTING_KEY, jobId, id], enabled: id !== null,
    queryFn: () => authRequest<CuttingPlan>(`jobs/${jobId}/cutting/${id}`), retry: false, staleTime: 0 });
}
export function useCuttingHistory(jobId: number, id: number | null, page = 1) {
  return useQuery({ queryKey: [...CUTTING_KEY, jobId, id, "history", page], enabled: id !== null,
    queryFn: () => authRequest<CuttingPage<PlanHistory>>(`jobs/${jobId}/cutting/${id}/history?page=${page}`),
    retry: false, staleTime: 0 });
}
const inputOnly = (scenario: CuttingScenario) => ({
  key: scenario.key, name: scenario.name, input: scenario.input, placements: scenario.placements, origin: scenario.origin,
});
export const evaluateCutting = (jobId: number, scenario: CuttingScenario, generate: boolean) =>
  authRequest<CuttingScenario>(`jobs/${jobId}/cutting/evaluate`, "POST", { scenario: inputOnly(scenario), generate });
export const saveCutting = (jobId: number, id: number | null, values: {
  name: string; revision: number; request_id: string; reason: string; scenarios: CuttingScenario[];
}) => authRequest<CuttingPlan>(`jobs/${jobId}/cutting${id === null ? "" : `/${id}`}`, id === null ? "POST" : "PUT",
  { ...values, scenarios: values.scenarios.map(inputOnly) });

/** Same integer 0.001 mm geometry as the server; no canvas size determines part size. */
const grid = (v: string) => Math.round(Number(v) * 1000);
export function placementError(input: CuttingInput, placements: Placement[]): string | null {
  const b = input.board;
  const dimensions = [b.width, b.height, b.left, b.right, b.top, b.bottom, input.kerf,
    ...input.pieces.flatMap(p => [p.width, p.height]), ...placements.flatMap(p => [p.x, p.y])];
  if (dimensions.some(v => !/^(0|[1-9]\d{0,5})(\.\d{1,3})?$/.test(v) || Number(v) > 100000)) return "dimension_format";
  if (grid(b.width) <= 0 || grid(b.height) <= 0 || input.pieces.some(p => grid(p.width) <= 0 || grid(p.height) <= 0)) return "dimension_range";
  const left = grid(b.left), top = grid(b.top), right = grid(b.width) - grid(b.right), bottom = grid(b.height) - grid(b.bottom);
  if (left >= right || top >= bottom) return "unusable_board";
  const seen = new Set<string>();
  const occupied: { board: number; x: number; y: number; w: number; h: number }[] = [];
  for (const p of placements) {
    const part = input.pieces.find(t => t.key === p.piece_key);
    if (!part || !Number.isInteger(p.copy) || p.copy < 0 || p.copy >= part.quantity) return "unknown_piece";
    const key = `${p.piece_key}:${p.copy}`;
    if (seen.has(key)) return "duplicate_placement";
    seen.add(key);
    if (!Number.isInteger(p.board) || p.board < 0 || p.board >= b.quantity) return "unknown_board";
    if (p.rotated && !part.rotation_allowed) return "rotation_forbidden";
    const x = grid(p.x), y = grid(p.y), w = grid(p.rotated ? part.height : part.width), h = grid(p.rotated ? part.width : part.height);
    if (x < left || y < top || x + w > right || y + h > bottom) return "out_of_bounds";
    const k = grid(input.kerf);
    if (occupied.some(o => o.board === p.board && !(x + w + k <= o.x || o.x + o.w + k <= x || y + h + k <= o.y || o.y + o.h + k <= y))) return "overlap_or_kerf";
    occupied.push({ board: p.board, x, y, w, h });
  }
  return null;
}
