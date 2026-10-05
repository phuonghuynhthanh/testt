import assert from "node:assert/strict";
import { apiErrorMessage } from "../src/types/Api.ts";

// Verify response normalization and persisted provider metadata without a browser or dependency.
const cases: Array<[unknown, string]> = [
  [null, "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau."],
  [new Error("SQLAlchemy private diagnostic"), "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau."],
  [{ response: { status: 404, data: { detail: "Không tìm thấy bài viết" } } }, "Không tìm thấy bài viết"],
  [{ response: { status: 500, data: { detail: "Cập nhật bài viết thất bại: Object of type datetime is not JSON serializable" } } }, "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau."],
  [{ response: { status: 422, data: { detail: [{ msg: "Vui lòng nhập tiêu đề." }] } } }, "Vui lòng nhập tiêu đề."],
  [{ response: { status: 422, data: { detail: [{ msg: "Field required" }, null] } } }, "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập."],
  [{ response: { status: 503, data: { detail: { code: "ai_image_timeout", message: "Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại sau." } } } }, "Tạo ảnh mất quá nhiều thời gian. Vui lòng thử lại sau."],
  [{ code: "ERR_NETWORK" }, "Chưa thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại."],
  [{ code: "ambiguous_publish", duplicateRisk: true }, "Chưa xác định được kết quả đăng bài. Vui lòng kiểm tra Trang Doanh nghiệp LinkedIn để tránh đăng trùng."],
  [{ code: "request_failed", message: "private provider details", retryable: true }, "Chưa thể hoàn tất yêu cầu tới dịch vụ. Vui lòng thử lại sau."],
  ["Không tìm thấy bài viết", "Không tìm thấy bài viết"],
  [{ message: { private: "object" } }, "Chưa thể hoàn tất thao tác. Vui lòng thử lại sau."],
];

// Exercise each supported shape against the actual shared UI error helper.
for (const [error, expected] of cases) assert.equal(apiErrorMessage(error), expected);
console.log(`API error checks passed (${cases.length} cases).`);
