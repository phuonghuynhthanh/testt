"""Translate operational errors without returning internal exception details."""

import logging
import re

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)
STATUS_MESSAGES = {
    400: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra và thử lại.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn chưa có quyền thực hiện thao tác này.",
    404: "Không tìm thấy nội dung. Nội dung có thể đã được xóa.",
    409: "Trạng thái nội dung đã thay đổi. Vui lòng tải lại trước khi tiếp tục.",
    413: "Ảnh quá lớn. Vui lòng chọn ảnh có dung lượng nhỏ hơn.",
    415: "Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPEG, PNG, WebP hoặc GIF.",
    422: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.",
    429: "Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.",
    500: "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau.",
    502: "Dịch vụ đang gặp sự cố. Vui lòng thử lại sau.",
    503: "Dịch vụ tạm thời chưa khả dụng. Vui lòng thử lại sau.",
    504: "Thao tác mất quá nhiều thời gian. Vui lòng thử lại sau.",
}
CODE_MESSAGES = {
    "configuration_error": "Dịch vụ chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.",
    "invalid_input": STATUS_MESSAGES[422],
    "invalid_image": "Ảnh không hợp lệ hoặc vượt giới hạn cho phép. Vui lòng chọn ảnh khác.",
    "invalid_response": "Dịch vụ chưa trả về kết quả phù hợp. Vui lòng thử lại.",
    "request_failed": "Chưa thể hoàn tất yêu cầu tới dịch vụ. Vui lòng thử lại sau.",
    "network_error": "Chưa thể kết nối LinkedIn. Vui lòng thử lại sau.",
    "linkedin_unavailable": "LinkedIn tạm thời chưa khả dụng. Vui lòng thử lại sau.",
    "provider_history_unavailable": "Chưa thể đọc lịch sử LinkedIn để tạo nội dung. Vui lòng thử lại sau.",
    "invalid_or_expired_token": "Kết nối LinkedIn đã hết hạn. Vui lòng liên hệ quản trị viên để kết nối lại.",
    "inactive_token": "Kết nối LinkedIn không còn hiệu lực. Vui lòng liên hệ quản trị viên.",
    "insufficient_permission": "Kết nối LinkedIn chưa có đủ quyền đăng bài. Vui lòng liên hệ quản trị viên.",
    "insufficient_scope": "Kết nối LinkedIn chưa có đủ quyền truy cập Trang Doanh nghiệp.",
    "no_organization_role": "Tài khoản LinkedIn chưa có quyền với Trang Doanh nghiệp này.",
    "organization_not_found": "Không tìm thấy Trang Doanh nghiệp LinkedIn đã cấu hình.",
    "organization_not_ready": "Trang Doanh nghiệp LinkedIn chưa sẵn sàng để đăng bài.",
    "rate_limited": STATUS_MESSAGES[429],
    "ambiguous_publish": "Chưa xác định được kết quả đăng bài. Vui lòng kiểm tra Trang Doanh nghiệp LinkedIn để tránh đăng trùng.",
    "ai_image_brief_unavailable": "Chưa thể chuẩn bị mô tả ảnh từ bài viết. Vui lòng thử lại sau.",
    "ai_image_invalid_brief": "AI chưa tạo được mô tả ảnh phù hợp. Vui lòng thử lại.",
    "ai_image_model_unavailable": "Dịch vụ tạo ảnh AI chưa khả dụng. Vui lòng thử lại hoặc liên hệ quản trị viên.",
    "ai_image_invalid_response": "Dịch vụ tạo ảnh chưa trả về ảnh hợp lệ. Vui lòng thử lại.",
    "ai_image_provider_error": "Chưa thể kết nối dịch vụ tạo ảnh AI. Vui lòng thử lại sau.",
    "ai_image_timeout": "Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại sau.",
    "ai_image_quota_exceeded": "Đã dùng hết hạn mức tạo ảnh AI hôm nay. Vui lòng thử lại vào ngày mai.",
    "ai_image_capacity": "Dịch vụ tạo ảnh AI đang quá tải. Vui lòng thử lại sau.",
    "ai_image_rate_limited": "Dịch vụ tạo ảnh AI đang giới hạn yêu cầu. Vui lòng chờ rồi thử lại.",
}
LEGACY_MESSAGES = {
    "Category is required": "Vui lòng chọn danh mục bài viết.",
    "Category not found": "Không tìm thấy danh mục.",
    "Category slug already exists": "Danh mục này đã tồn tại. Vui lòng chọn danh mục có sẵn.",
    "Selected media does not match mediaMode": "Số ảnh đã chọn chưa phù hợp với chế độ ảnh.",
    "Media keywords are required": "Vui lòng nhập từ khóa để tìm ảnh.",
    "content is required before media can be saved": "Vui lòng soạn nội dung trước khi lưu ảnh.",
    "Published or uncertain LinkedIn posts cannot be edited": "Bài LinkedIn đã đăng hoặc đang chờ xác minh nên không thể chỉnh sửa.",
    "This LinkedIn post cannot be retried automatically": CODE_MESSAGES["ambiguous_publish"],
    "Only failed LinkedIn posts can be retried": "Chỉ có thể thử lại bài LinkedIn đăng thất bại.",
    "Use the retry command for a failed LinkedIn post": "Vui lòng dùng nút Thử lại cho bài đăng thất bại.",
    "A LinkedIn web link requires website publication": "Cần xuất bản bài website trước khi đính kèm liên kết vào LinkedIn.",
    "DOMAIN_URL is required for LinkedIn links": "Đường dẫn website chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
    "AI did not return enough distinct fresh topics": "AI chưa đề xuất đủ chủ đề mới. Vui lòng thử lại.",
}
FIELD_LABELS = {
    "title": "Tiêu đề", "topic": "Chủ đề", "content": "Nội dung", "category": "Danh mục",
    "context": "Ngữ cảnh", "prompt": "Mô tả ảnh", "image": "Ảnh", "altText": "Mô tả ảnh",
    "description": "Mô tả SEO", "keywords": "Từ khóa", "blog_data": "Dữ liệu bài viết",
}


# Preserve only short, intentional Vietnamese messages without technical diagnostics.
def user_error_message(message: object, code: str | None = None, status_code: int = 422) -> str:
    if code in CODE_MESSAGES:
        return CODE_MESSAGES[code]
    if isinstance(message, str):
        if "manually edited" in message.lower():
            return "Bản nháp đã được chỉnh sửa thủ công. Vui lòng xác nhận trước khi tạo lại."
        if message in LEGACY_MESSAGES:
            return LEGACY_MESSAGES[message]
        if status_code < 500 and len(message) <= 500 and re.search(r"[\u00c0-\u1ef9]", message) and not re.search(
            r"traceback|sqlalchemy|SELECT |INSERT |UPDATE |https?://|api[_ -]?key|token|password|\n", message, re.I
        ):
            return message
    return STATUS_MESSAGES.get(status_code, STATUS_MESSAGES[500])


# Keep documented metadata while replacing only the message exposed to clients.
def public_error_detail(detail: object, status_code: int) -> object:
    if isinstance(detail, dict):
        return {**detail, "message": user_error_message(detail.get("message"), detail.get("code"), status_code)}
    return user_error_message(detail, status_code=status_code)


# Return safe HTTP errors while retaining authentication and retry headers.
async def http_error_handler(request: Request, error: HTTPException) -> JSONResponse:
    if error.status_code >= 500:
        logger.error("HTTP failure on %s: %s", request.url.path, error.detail)
    return JSONResponse(status_code=error.status_code, content={"detail": public_error_detail(error.detail, error.status_code)}, headers=error.headers)


# Translate validation errors without returning the input values or exception context.
async def validation_error_handler(_: Request, error: RequestValidationError) -> JSONResponse:
    details = []
    for item in error.errors():
        location = item.get("loc", ())
        label = FIELD_LABELS.get(location[-1] if location else "", "Dữ liệu")
        kind = item.get("type", "invalid")
        message = f"Vui lòng nhập {label.lower()}." if kind == "missing" else f"{label} chưa hợp lệ. Vui lòng kiểm tra lại."
        if kind == "string_too_long":
            message = f"{label} quá dài (tối đa {item.get('ctx', {}).get('max_length', 0)} ký tự)."
        details.append({"loc": location, "type": kind, "msg": message})
    return JSONResponse(status_code=422, content={"detail": details})


# Log unexpected failures server-side and return a stable generic message.
async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    logger.error("Unhandled failure on %s", request.url.path, exc_info=(type(error), error, error.__traceback__))
    return JSONResponse(status_code=500, content={"detail": STATUS_MESSAGES[500]})


# Handle domain exceptions consistently even when a route does not wrap them itself.
async def linkedin_error_handler(_: Request, error: Exception) -> JSONResponse:
    status_code = 429 if error.code == "rate_limited" else 503 if error.retryable else 422
    return JSONResponse(status_code=status_code, content={"detail": public_error_detail(error.as_dict(), status_code)})


# Install the shared boundary handlers on the application without altering route logic.
def register_error_handlers(app: FastAPI) -> None:
    from apps.linkedin_posts.exceptions import LinkedInError

    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(LinkedInError, linkedin_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
