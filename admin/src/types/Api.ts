export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProviderError { code?: string; message?: string; duplicateRisk?: boolean; retryable?: boolean; }

// Convert documented FastAPI error shapes into administrator-facing text.
export const apiErrorMessage = (error: unknown): string => {
  const response = typeof error === "object" && error !== null && "response" in error ? (error as { response?: { data?: unknown } }).response : undefined;
  const detail = response?.data && typeof response.data === "object" && "detail" in response.data ? (response.data as { detail?: unknown }).detail : undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : "Dữ liệu không hợp lệ").join(". ");
  if (typeof detail === "object" && detail !== null && "message" in detail) return String((detail as ProviderError).message);
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
};
