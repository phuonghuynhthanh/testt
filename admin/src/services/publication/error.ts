import axios from "axios";

// Extract a useful FastAPI detail message from string or structured responses.
export const publicationErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return "Không thể hoàn thành thao tác xuất bản.";
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String(detail.message);
  }
  return `Yêu cầu thất bại${error.response?.status ? ` (${error.response.status})` : ""}.`;
};

// Detect the backend conflict that requires explicit approval before regeneration.
export const isManualDraftConflict = (error: unknown): boolean => {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return false;
  const detail = error.response.data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "message" in detail
        ? String(detail.message)
        : "";
  return (
    message.includes("manually edited") ||
    message.includes("chỉnh sửa thủ công")
  );
};
