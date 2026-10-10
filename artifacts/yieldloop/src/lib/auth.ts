import { useQuery } from "@tanstack/react-query";

export type Role = "cutting_operator" | "production_supervisor" | "manager";
export interface Employee {
  id: number; username: string; first_name: string; last_name: string;
  role: Role; is_active: boolean; must_change_password: boolean;
  temporary_password_expired: boolean;
}
export class AuthError extends Error {
  constructor(public status: number, public code: string, public fields?: Record<string, string[]>) {
    super(code);
  }
}
let csrf: string | null = null;
async function csrfToken(): Promise<string> {
  const response = await fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new AuthError(response.status, "service_unavailable");
  csrf = (await response.json()).csrfToken;
  return csrf!;
}
export async function authRequest<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (method !== "GET") headers["X-CSRFToken"] = csrf ?? await csrfToken();
  const response = await fetch(`/api/v1/${path}`, {
    method, headers, credentials: "same-origin", cache: "no-store",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && body.code === "csrf_failed") csrf = null;
    throw new AuthError(response.status, body.code ?? "request_failed", body.fields);
  }
  if (body.csrfToken) csrf = body.csrfToken;
  return body as T;
}
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try { return await authRequest<Employee>("auth/me"); }
      catch (error) { if (error instanceof AuthError && error.status === 401) return null; throw error; }
    },
    retry: false, staleTime: 0, refetchOnWindowFocus: true,
  });
}
export function useEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "employees"],
    queryFn: () => authRequest<Employee[]>("employees"),
    enabled, retry: false,
  });
}
export const login = (username: string, password: string) =>
  authRequest<{ user: Employee; csrfToken: string }>("auth/login", "POST", { username, password });
export const logout = () => authRequest<{ status: string }>("auth/logout", "POST");
export const changePassword = (current_password: string, new_password: string) =>
  authRequest<{ status: string }>("auth/password", "POST", { current_password, new_password });
export const createEmployee = (data: {
  username: string; first_name?: string; last_name?: string; role: Role; temporary_password: string;
}) => authRequest<Employee>("employees", "POST", data);
export const updateEmployee = (id: number, data: { role?: Role; is_active?: boolean }) =>
  authRequest<Employee>(`employees/${id}`, "PATCH", data);
export const resetEmployeePassword = (id: number, temporary_password: string) =>
  authRequest<Employee>(`employees/${id}/password`, "POST", { temporary_password });
