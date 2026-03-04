import type {
  Entitlement,
  EvaluateRequest,
  EvaluateResponse,
  Evaluation,
  SummaryReport,
} from "../types/api";

const BASE = "/api/v1";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Entitlements
export const listEntitlements = (params?: {
  search?: string;
  risk_tier?: string;
  quality_grade?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.risk_tier) qs.set("risk_tier", params.risk_tier);
  if (params?.quality_grade) qs.set("quality_grade", params.quality_grade);
  const query = qs.toString();
  return request<Entitlement[]>(`/entitlements${query ? `?${query}` : ""}`);
};

export const getEntitlement = (id: string) =>
  request<Entitlement>(`/entitlements/${id}`);

export const deleteEntitlement = (id: string) =>
  request<void>(`/entitlements/${id}`, { method: "DELETE" });

// Evaluation
export const evaluateInline = (data: EvaluateRequest) =>
  request<EvaluateResponse>("/evaluate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const reEvaluate = (entitlementId: string) =>
  request<EvaluateResponse>(`/evaluate/${entitlementId}`, { method: "POST" });

export const getEvaluationHistory = (entitlementId: string) =>
  request<Evaluation[]>(`/entitlements/${entitlementId}/evaluations`);

// Reports
export const getSummary = () => request<SummaryReport>("/reports/summary");
