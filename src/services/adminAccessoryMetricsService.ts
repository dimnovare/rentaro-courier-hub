import type {
  AdminAccessoryMetrics,
  AdminAccessoryMetricsQuery,
} from "@/types/accessoryInventory";

export class AccessoryMetricsApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly unauthorized: boolean;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AccessoryMetricsApiError";
    this.status = status;
    this.code = code;
    this.unauthorized = status === 401;
  }
}

export async function getAccessoryMetrics(
  query: AdminAccessoryMetricsQuery = {},
): Promise<AdminAccessoryMetrics> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cityId) params.set("cityId", query.cityId);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  let response: Response;
  try {
    response = await fetch(`/api/admin/accessory-metrics${suffix}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccessoryMetricsApiError(
      "Could not reach the accessory metrics API.",
      0,
      "network_error",
    );
  }

  if (!response.ok) {
    let code = `http_${response.status}`;
    let message = response.status === 401
      ? "Your session has expired. Sign in again."
      : `Accessory metrics request failed (${response.status}).`;
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
    throw new AccessoryMetricsApiError(message, response.status, code);
  }

  return (await response.json()) as AdminAccessoryMetrics;
}
