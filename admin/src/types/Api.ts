export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProviderError { code?: string; message?: string; duplicateRisk?: boolean; retryable?: boolean; }

const DEFAULT_ERROR = "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau.";
const STATUS_MESSAGES: Record<number, string> = {
  400: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra và thử lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  403: "Bạn chưa có quyền thực hiện thao tác này.",
  404: "Không tìm thấy nội dung. Nội dung có thể đã được xóa.",
  409: "Trạng thái nội dung đã thay đổi. Vui lòng tải lại trước khi tiếp tục.",
  413: "Ảnh quá lớn. Vui lòng chọn ảnh có dung lượng nhỏ hơn.",
  415: "Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPEG, PNG, WebP hoặc GIF.",
  422: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.",
  429: "Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.",
  502: "Dịch vụ đang gặp sự cố. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm thời chưa khả dụng. Vui lòng thử lại sau.",
  504: "Thao tác mất quá nhiều thời gian. Vui lòng thử lại sau.",
};
const CODE_MESSAGES: Record<string, string> = {
  ambiguous_publish: "Chưa xác định được kết quả đăng bài. Vui lòng kiểm tra Trang Doanh nghiệp LinkedIn để tránh đăng trùng.",
  configuration_error: "Dịch vụ chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.",
  invalid_input: STATUS_MESSAGES[422],
  invalid_image: "Ảnh không hợp lệ hoặc vượt giới hạn cho phép. Vui lòng chọn ảnh khác.",
  invalid_response: "Dịch vụ chưa trả về kết quả phù hợp. Vui lòng thử lại.",
  request_failed: "Chưa thể hoàn tất yêu cầu tới dịch vụ. Vui lòng thử lại sau.",
  network_error: "Chưa thể kết nối LinkedIn. Vui lòng thử lại sau.",
  linkedin_unavailable: "LinkedIn tạm thời chưa khả dụng. Vui lòng thử lại sau.",
  provider_history_unavailable: "Chưa thể đọc lịch sử LinkedIn để tạo nội dung. Vui lòng thử lại sau.",
  invalid_or_expired_token: "Kết nối LinkedIn đã hết hạn. Vui lòng liên hệ quản trị viên để kết nối lại.",
  inactive_token: "Kết nối LinkedIn không còn hiệu lực. Vui lòng liên hệ quản trị viên.",
  insufficient_permission: "Kết nối LinkedIn chưa có đủ quyền đăng bài. Vui lòng liên hệ quản trị viên.",
  insufficient_scope: "Kết nối LinkedIn chưa có đủ quyền truy cập Trang Doanh nghiệp.",
  no_organization_role: "Tài khoản LinkedIn chưa có quyền với Trang Doanh nghiệp này.",
  organization_not_found: "Không tìm thấy Trang Doanh nghiệp LinkedIn đã cấu hình.",
  organization_not_ready: "Trang Doanh nghiệp LinkedIn chưa sẵn sàng để đăng bài.",
  rate_limited: STATUS_MESSAGES[429],
};

// Accept intentional Vietnamese copy while filtering technical and provider diagnostics.
const friendlyMessage = (message: unknown): string | undefined => {
  if (typeof message !== "string" || message.length > 500 || !/[\u00c0-\u1ef9]/.test(message)) return undefined;
  if (/traceback|sqlalchemy|SELECT |INSERT |UPDATE |https?:\/\/|api[_ -]?key|password|object of type|not JSON serializable|\n/i.test(message)) return undefined;
  return message;
};

// Normalize HTTP failures and persisted provider errors into text without rendering objects.
export const apiErrorMessage = (error: unknown): string => {
  const record = typeof error === "object" && error !== null ? error as { response?: { status?: number; data?: { detail?: unknown } }; code?: string } : undefined;
  const response = record?.response;
  const detail = response ? response.data?.detail : error;
  if (!response && record?.code && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(record.code)) {
    return "Chưa thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
  }
  const fallback = STATUS_MESSAGES[response?.status ?? 500] ?? DEFAULT_ERROR;
  if (Array.isArray(detail)) {
    return [...new Set(detail.map((item: { msg?: unknown }) => friendlyMessage(item?.msg) ?? STATUS_MESSAGES[422]))].join(" ");
  }
  if (detail && typeof detail === "object" && !(detail instanceof Error)) {
    const provider = detail as ProviderError;
    if (provider.duplicateRisk || provider.code === "ambiguous_publish") return CODE_MESSAGES.ambiguous_publish;
    if (provider.code && CODE_MESSAGES[provider.code]) return CODE_MESSAGES[provider.code];
    return friendlyMessage(provider.message) ?? fallback;
  }
  if ((response?.status ?? 0) >= 500) return fallback;
  return friendlyMessage(detail) ?? fallback;
};
