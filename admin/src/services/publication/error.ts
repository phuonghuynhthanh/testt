import axios from "axios";

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
