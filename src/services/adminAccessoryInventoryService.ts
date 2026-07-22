import type {
  AccessoryInventoryFilters,
  AccessoryUnitLifecycleAction,
  AdminAccessoryUnit,
  CreateAccessoryUnitBatchInput,
  CreateAccessoryUnitInput,
  UpdateAccessoryUnitInput,
} from "@/types/accessoryInventory";

export class AccessoryInventoryApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly unauthorized: boolean;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AccessoryInventoryApiError";
    this.status = status;
    this.code = code;
    this.unauthorized = status === 401;
  }
}

export async function getAccessoryUnits(
  filters: AccessoryInventoryFilters = {},
): Promise<AdminAccessoryUnit[]> {
  const params = new URLSearchParams();
  if (filters.cityId) params.set("cityId", filters.cityId);
  if (filters.accessoryCode) params.set("accessoryCode", filters.accessoryCode);
  if (filters.status) params.set("status", filters.status);
  if (filters.condition) params.set("condition", filters.condition);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return request<AdminAccessoryUnit[]>(`/api/admin/accessory-units${query}`);
}

export const createAccessoryUnit = (body: CreateAccessoryUnitInput) =>
  request<AdminAccessoryUnit>("/api/admin/accessory-units", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const createAccessoryUnitBatch = (body: CreateAccessoryUnitBatchInput) =>
  request<AdminAccessoryUnit[]>("/api/admin/accessory-units/batch", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateAccessoryUnit = (id: number, body: UpdateAccessoryUnitInput) =>
  request<AdminAccessoryUnit>(`/api/admin/accessory-units/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const transitionAccessoryUnit = (
  id: number,
  action: AccessoryUnitLifecycleAction,
) =>
  request<AdminAccessoryUnit>(`/api/admin/accessory-units/${id}/${action}`, {
    method: "POST",
  });

export const receiveAccessoryUnit = (id: number) =>
  transitionAccessoryUnit(id, "receive");

export const markAccessoryUnitMaintenance = (id: number) =>
  transitionAccessoryUnit(id, "maintenance");

export const markAccessoryUnitAvailable = (id: number) =>
  transitionAccessoryUnit(id, "available");

export const markAccessoryUnitLost = (id: number) =>
  transitionAccessoryUnit(id, "lost");

export const retireAccessoryUnit = (id: number) =>
  transitionAccessoryUnit(id, "retire");

export const deleteAccessoryUnit = (id: number): Promise<void> =>
  request<void>(`/api/admin/accessory-units/${id}`, { method: "DELETE" });

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccessoryInventoryApiError(
      "Could not reach the accessory inventory API.",
      0,
      "network_error",
    );
  }

  if (!response.ok) {
    throw await readError(response);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function readError(response: Response): Promise<AccessoryInventoryApiError> {
  let code = `http_${response.status}`;
  let message = response.status === 401
    ? "Your session has expired. Sign in again."
    : `Accessory inventory request failed (${response.status}).`;
  try {
    const problem = (await response.json()) as {
      error?: string;
      code?: string;
      message?: string;
      title?: string;
    };
    code = problem.code ?? code;
    message = problem.error ?? problem.message ?? problem.title ?? message;
  } catch {
    // Keep stable fallbacks for non-JSON failures.
  }
  return new AccessoryInventoryApiError(message, response.status, code);
}
