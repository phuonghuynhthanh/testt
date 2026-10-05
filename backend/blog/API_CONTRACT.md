# API CONTRACT - QUANT-VN BLOG & CMS BACKEND

Tài liệu đặc tả toàn bộ API endpoints của hệ thống Blog & CMS Quant-VN dành cho đội ngũ phát triển Frontend (Admin CMS & Client Website).

> **Contract version:** 2.0.0<br>
> **Backend baseline:** commit bàn giao chứa tài liệu này<br>
> **Nguồn kiểm chứng:** FastAPI OpenAPI tại `GET /openapi.json` (Swagger UI: `GET /docs`)<br>
> **Quy tắc thay đổi:** Mọi thay đổi request, response, status code hoặc enum phải cập nhật tài liệu này và OpenAPI trong cùng pull request.

---

## 1. TỔNG QUAN VÀ QUY ƯỚC CHUNG (GENERAL CONVENTIONS)

### 1.1. Base URLs & Environments
- **Local Development**: `http://localhost:8001`
- **Staging / Production**: Base URL được release owner cung cấp theo môi trường; không hard-code domain trong frontend. Ghép endpoint tương đối trong tài liệu này với base URL đã được bàn giao.
- **API discovery**: `<base-url>/openapi.json`; Swagger UI: `<base-url>/docs`.
- **CORS**: Cho phép origins được cấu hình trong `ALLOWED_ORIGINS` (hỗ trợ credentials, all headers, all methods).

### 1.2. Authentication & Authorization
- **Cơ chế**: JWT Bearer Token (`Authorization: Bearer <access_token>`).
- **Phân loại endpoint**:
  - `Public`: Không cần header Authorization. Dành cho trang đọc tin công khai (Client).
  - `Admin`: Bắt buộc header `Authorization: Bearer <access_token>`. Trả về `401 Unauthorized` nếu thiếu token hoặc token hết hạn/không hợp lệ.

### 1.3. Định dạng dữ liệu (Data Formats)
- Mặc định: `application/json; charset=utf-8` cho cả Request và Response.
- Upload file / form: `multipart/form-data` (sử dụng ở các API upload ảnh hoặc tạo/cập nhật blog kèm banner).
- Thời gian Blog / Category: chuỗi ISO 8601 **không có timezone** (`YYYY-MM-DDTHH:mm:ss[.ffffff]`), được backend tạo theo giờ `Asia/Ho_Chi_Minh` (UTC+07:00). Frontend phải hiển thị như giờ Việt Nam và **không** tự thêm hậu tố `Z`.
- Thời gian do LinkedIn/provider trả về có thể có hậu tố `Z`; đó là UTC và phải được parse theo offset trong chuỗi.

### 1.4. Quy chuẩn Phân trang (Pagination Standard)
Các API danh sách quản trị sử dụng cấu trúc phân trang chuẩn:
```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}
```

### 1.5. Cấu trúc Lỗi chuẩn (Error Response Formats)
- **Lỗi nghiệp vụ / Thông báo thông thường (400, 404, 409, 500)**:
```json
{
  "detail": "Thông báo tiếng Việt phù hợp với thao tác của người dùng"
}
```
- **Lỗi Validation FastAPI / Pydantic (422 Unprocessable Entity)**:
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "title"],
      "msg": "Vui lòng nhập tiêu đề."
    }
  ]
}
```
- **Lỗi Provider LinkedIn đặc thù (422, 429, 503)**:
```json
{
  "detail": {
    "code": "rate_limited | linkedin_unavailable | token_expired | ...",
    "message": "Thông báo tiếng Việt; chi tiết nội bộ chỉ được ghi ở server",
    "duplicateRisk": false,
    "retryable": false
  }
}
```

Validation responses retain `loc` and `type` but omit submitted `input` and exception `ctx`. Invalid multipart `blog_data` JSON also returns 422. Clients should use stable error codes and retain `retryable`, `duplicateRisk`, and retry metadata rather than matching provider messages.

### Rate limiting (429 Too Many Requests)

Rate limiting is enabled by default (`RATE_LIMIT_ENABLED=true`). Limits apply per client IP and endpoint: `RATE_LIMIT_DEFAULT=120/minute` on routes without a stricter limit, `RATE_LIMIT_LOGIN=5/minute` on `POST /auth/login`, and `RATE_LIMIT_WRITE=30/minute` on uploads and Blog/LinkedIn saves, and `RATE_LIMIT_AI=10/minute` on AI generation and publication commands. Public image redirects (`GET /{object_key}`) are not throttled. Changing a Blog/post ID does not create a new bucket for the same endpoint.

The 10/minute AI limit covers `/media/ai/generate`, `/media/pexels/import`, `/openai/*`, `/linkedin/ai/*`, `POST /linkedin/posts` (which can publish immediately), `/linkedin/posts/{post_id}/publish|retry`, and `/publications/blogs/{blog_id}/publish` plus its `/linkedin*` commands. The 30/minute write limit covers `/media/image`, `/linkedin/media/upload`, Blog create/update, and LinkedIn preview/save. AI draft generation and its legacy alias, title generation, reference search, and classification also use this limit.

When exhausted, the backend returns HTTP **429** with `Retry-After` (integer seconds until retry), and the following JSON:

```json
{"detail": "Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại."}
```

Clients should wait for `Retry-After` before retrying. Successful limited responses expose `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; these headers and `Retry-After` are readable through CORS. CORS preflight OPTIONS requests do not consume limits.

`RATE_LIMIT_STORAGE_URI=memory://` resets counters on restart and does not share them between workers or replicas. Before scaling, use `RATE_LIMIT_STORAGE_URI=redis://...` and install the optional Redis client (`limits[redis]`). Behind a controlled reverse proxy, enable `RATE_LIMIT_TRUST_PROXY=true` only when the proxy overwrites client-supplied `X-Forwarded-For`: its first address becomes the rate-limit key. Otherwise the connection's client address is used and forwarded headers are ignored. Set `RATE_LIMIT_ENABLED=false` to disable throttling.

### 1.6 CMS 2.0 authoritative fields and migrations
- `link_post` and `seo.url` are response-only Blog fields. `POST /blog` and `PUT /blog/{id}` accept only `tag`, `title`, `banner_url`, `category`, `content`, `state` (update), and editable SEO fields `title`, `description`, `keywords`, `author`. Legacy `link_post` and `seo.url` are silently ignored; other unknown fields return 422.
- The API creates a slug from the title (`blog`, `blog-2`, …), reserves soft-deleted slugs, retries a uniqueness race, and always returns `seo.url = DOMAIN_URL + /blog/{slug}`. `/blog/is-duplicate-link-post` remains deprecated compatibility-only.
- `LinkedInLinkPlacement` is `NONE | IN_POST`. Legacy `includeWebLink` / `linkedinIncludeWebLink` map to `IN_POST` only when no placement is supplied; conflicting values return 422. New responses omit legacy booleans.
- Comment creation and comment retries are retired. Migration converts editable unpublished `FIRST_COMMENT` drafts to `IN_POST`; historical fields remain in storage but are omitted from responses.

### LinkedIn preview and AI language

- Admin-only `POST /linkedin/preview` and `POST /publications/blogs/{blog_id}/linkedin/preview` accept `{ "content": "...", "linkPlacement": "NONE | IN_POST", "language": "vietnamese | english" }` and return `{ "content": "...", "targetUrl": "..." }` (`targetUrl` is null for `NONE`).
- Preview and publish share the same composer: reviewed text, localized link block, then trailing hashtag-only lines. URLs are resolved by the backend; preview does not save records or call external providers.
- Blog draft generation (including its legacy alias), independent LinkedIn generation, LinkedIn topic proposals, and Blog-to-LinkedIn SUMMARY generation accept `language`, defaulting to `vietnamese`. Other language values return 422.
- The selected language controls generated copy, CTA and Blog SEO metadata. Administrator-entered Blog titles remain unchanged. SAME mode preserves source wording and ignores the generation-language selection.
- Generated LinkedIn metadata includes `generation.language` (or `generated.language` in draft responses) for restoring authoring settings and localizing attached links.
- Separately generated SEO keyword/description requests accept optional `language`; omitted values keep legacy language inference.
- The language selector appears beside AI generation actions only. Changing it preserves the current draft; preview uses the language recorded in that draft's generation metadata.

### 1.7 AI image generation
`POST /media/ai/generate` is Admin-only and stores a reviewable Cloudflare-generated object without attaching it to a Blog or LinkedIn post.

```json
{
  "purpose": "BLOG_BANNER | LINKEDIN",
  "prompt": "optional, max 2000",
  "context": "required when prompt is blank, max 20000; current unsaved title and article",
  "negativePrompt": "optional, max 1000",
  "size": "1K",
  "altText": "optional"
}
```

Gemini first prepares one realistic photographic scene from the article and optional visual direction. The final prompt is at most 2,048 characters. The default model is `@cf/black-forest-labs/flux-1-schnell`; its Cloudflare payload contains only `prompt` and `steps: 8`. The server decodes `result.image` Base64, validates the actual image dimensions, and stores the original bytes without cropping or resizing.

Legacy `aspectRatio` (`16:9 | 1:1 | 4:5 | 4:3`) and `quality` (`FAST | BALANCED | HIGH`) remain accepted but are deprecated and do not affect generation. The response is `{ media, width, height, aspectRatio, size, quality }`, with actual dimensions, the reduced actual ratio (for example `1:1`), and `quality: "BALANCED"`. `media` follows `UploadedMedia` with `origin: "cloudflare-ai"`; omitted `altText` defaults to the first title/topic line, limited to 300 characters.

Provider failures use safe domain codes such as `ai_image_quota_exceeded`, `ai_image_rate_limited`, `ai_image_capacity`, `ai_image_model_unavailable`, `ai_image_timeout`, `ai_image_invalid_response`, and `ai_image_provider_error`. `ai_image_brief_unavailable` or `ai_image_invalid_brief` stops the request before Cloudflare is called. No automatic provider retry or object deletion occurs.

### 1.8 Pexels Blog banners

Admin-only `POST /linkedin/media/search` remains the shared search endpoint: submit an array of keywords and receive `{ "items": PexelsCandidate[] }`. Searching does not attach an image.

Admin-only `POST /media/pexels/import` accepts one complete `PexelsCandidate` (`provider`, `providerId`, `sourceUrl`, `imageUrl`, `photographer`, `attribution`, `altText`, `order`). It downloads only an allowed HTTPS Pexels image URL, enforces byte and image validation, and stores the selected banner before returning 201:

```json
{
  "provider": "upload",
  "origin": "pexels",
  "objectKey": "blog-pexels/selected.jpg",
  "fileName": "selected.jpg",
  "altText": "Server room",
  "order": 1
}
```

The frontend replaces its selected banner only after import succeeds and later submits this `objectKey` as Blog `banner_url`. Clearing a banner submits `banner_url: ""`. Blog banner keys remain separate from LinkedIn upload keys, which must keep their existing `linkedin/` prefix.

---

## 2. MỤC LỤC DANH SÁCH ENDPOINTS (TABLE OF CONTENTS)

| # | Phương thức | Endpoint | Quyền | Mô tả |
|---|---|---|---|---|
| **Auth** | | | | |
| 1 | `POST` | `/auth/login` | Public | Đăng nhập tài khoản quản trị viên lấy JWT token |
| **Blogs** | | | | |
| 2 | `GET` | `/blog/client/blogs` | Public | Lấy danh sách bài viết đã duyệt cho Client (load-more) |
| 3 | `GET` | `/blog/link/{link_post}` | Public | Đọc chi tiết bài viết và bài viết liên quan theo slug |
| 4 | `GET` | `/blog/admin/blogs` | Admin | Lấy danh sách bài viết quản trị (phân trang, filter) |
| 5 | `GET` | `/blog/admin/{blog_id}` | Admin | Lấy chi tiết bài viết theo ID để chỉnh sửa |
| 6 | `POST` | `/blog` | Admin | Tạo bài viết mới (kèm banner qua form-data) |
| 7 | `PUT` | `/blog/{id}` | Admin | Cập nhật bài viết hiện có |
| 8 | `DELETE` | `/blog/{blog_id}` | Admin | Xóa mềm (soft-delete) bài viết |
| 9 | `POST` | `/blog/{blog_id}/restore` | Admin | Khôi phục bài viết đã xóa mềm |
| 10 | `GET` | `/blog/is-duplicate-link-post` | Admin | Kiểm tra slug link_post đã tồn tại hay chưa |
| 11 | `POST` | `/blog/ai/generate-draft` | Admin | AI tạo bản nháp nội dung Markdown theo title & category |
| 12 | `POST` | `/blog/ai-generate-markdown` | Admin | Alias tương thích ngược của `/ai/generate-draft` |
| 13 | `GET` | `/blog/openai/ai-generate-list-title` | Admin | AI gợi ý danh sách tiêu đề theo từ khóa |
| 14 | `POST` | `/blog/search-references` | Admin | Tìm kiếm SERP và phân loại link tham khảo |
| 15 | `POST` | `/blog/classify-links` | Admin | Phân loại danh sách link (organic/ad/spam/duplicate) |
| 16 | `POST` | `/blog/fetch-content` | Admin | Fetch và trích xuất nội dung văn bản từ URL ngoài |
| **Categories** | | | | |
| 17 | `GET` | `/categories` | Admin | Lấy danh sách chuyên mục (phân trang) |
| 18 | `POST` | `/categories` | Admin | Tạo mới hoặc khôi phục chuyên mục |
| 19 | `PUT` | `/categories/{category_id}` | Admin | Đổi tên chuyên mục và đồng bộ bài viết |
| 20 | `DELETE` | `/categories/{category_id}` | Admin | Xóa mềm chuyên mục |
| 21 | `POST` | `/categories/{category_id}/restore` | Admin | Khôi phục chuyên mục đã xóa mềm |
| **Media** | | | | |
| 22 | `POST` | `/media/image` | Admin | Upload file ảnh lên MinIO S3 storage |
| 23 | `GET` | `/{object_key}` | Public | Redirect 307 đến presigned URL để xem ảnh |
| **OpenAI / Gemini SEO** | | | | |
| 24 | `POST` | `/openai/seo-keywords` | Admin | Tạo danh sách từ khóa SEO bằng AI |
| 25 | `POST` | `/openai/seo-description` | Admin | Tạo mô tả tóm tắt SEO bằng AI |
| **Publications** | | | | |
| 26 | `GET` | `/publications/blogs/{blog_id}` | Admin | Lấy trạng thái kênh xuất bản Web & LinkedIn của Blog |
| 27 | `PUT` | `/publications/blogs/{blog_id}` | Admin | Cấu hình kênh xuất bản (Web, LinkedIn) |
| 28 | `POST` | `/publications/blogs/{blog_id}/linkedin/draft` | Admin | AI tạo bản nháp LinkedIn (chế độ SAME hoặc SUMMARY) |
| 29 | `POST` | `/publications/blogs/{blog_id}/linkedin` | Admin | Lưu hoặc xuất bản ngay bài LinkedIn chuyển thể từ Blog |
| 30 | `PUT` | `/publications/blogs/{blog_id}/linkedin` | Admin | Cập nhật text hoặc media đã chọn cho bài LinkedIn của Blog |
| 31 | `POST` | `/publications/blogs/{blog_id}/linkedin/media/suggest` | Admin | Gợi ý hình ảnh Pexels cho bài LinkedIn của Blog |
| 32 | `POST` | `/publications/blogs/{blog_id}/publish` | Admin | Kích hoạt xuất bản các kênh đã cấu hình (Web -> LinkedIn) |
| 33 | `POST` | `/publications/blogs/{blog_id}/linkedin/retry` | Admin | Thử xuất bản lại kênh LinkedIn nếu bị lỗi |
| **LinkedIn Posts** | | | | |
| 34 | `POST` | `/linkedin/ai/generate-draft` | Admin | AI tạo bản nháp bài đăng LinkedIn độc lập (không cần Blog) |
| 35 | `GET` | `/linkedin/posts` | Admin | Lấy danh sách các bài đăng LinkedIn độc lập |
| 36 | `GET` | `/linkedin/posts/{post_id}` | Admin | Lấy chi tiết một bài đăng LinkedIn độc lập |
| 37 | `POST` | `/linkedin/posts` | Admin | Lưu nháp hoặc xuất bản ngay một bài LinkedIn độc lập |
| 38 | `PUT` | `/linkedin/posts/{post_id}` | Admin | Chỉnh sửa nội dung / media bài đăng LinkedIn độc lập |
| 39 | `DELETE` | `/linkedin/posts/{post_id}` | Admin | Xóa mềm bài đăng LinkedIn |
| 40 | `POST` | `/linkedin/posts/{post_id}/restore` | Admin | Khôi phục bài đăng LinkedIn đã xóa mềm |
| 41 | `GET` | `/linkedin/history/recent` | Admin | Lấy lịch sử các bài đăng gần nhất từ Company Page |
| 42 | `POST` | `/linkedin/history/sync` | Admin | Đồng bộ danh sách bài viết từ LinkedIn Company Page |
| 43 | `POST` | `/linkedin/ai/propose-topics` | Admin | AI đề xuất các chủ đề bài viết mới mẻ |
| 44 | `POST` | `/linkedin/posts/{post_id}/publish` | Admin | Xuất bản bài đăng LinkedIn độc lập lên Company Page |
| 45 | `POST` | `/linkedin/posts/{post_id}/retry` | Admin | Thử xuất bản lại bài đăng bị thất bại |
| 46 | `POST` | `/linkedin/posts/{post_id}/media/suggest` | Admin | Gợi ý ảnh Pexels cho bài đăng LinkedIn độc lập |
| 47 | `GET` | `/linkedin/organization/verify` | Admin | Kiểm tra quyền truy cập và phân quyền LinkedIn Company Page |
| 48 | `POST` | `/linkedin/media/search` | Admin | Tìm kiếm hình ảnh trực tiếp từ Pexels qua keywords |
| 49 | `POST` | `/linkedin/media/upload` | Admin | Upload ảnh quản trị viên chọn cho bài LinkedIn |

---

## 3. CHI TIẾT CÁC MODULE API

---

### MODULE 1: AUTHENTICATION (`/auth`)

#### 1. Đăng nhập quản trị viên (Admin Login)
- **Method & Path**: `POST /auth/login`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "username": "admin",
  "password": "your_secure_password"
}
```
- **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```
- **Errors**:
  - `401 Unauthorized`: `{"detail": "Sai tên đăng nhập hoặc mật khẩu"}`

---

### MODULE 2: BLOG MANAGEMENT (`/blog`)

#### 2. Lấy danh sách bài viết cho Client (Public Blog List)
- **Method & Path**: `GET /blog/client/blogs`
- **Auth**: Public
- **Query Parameters**:
  - `num_of_blogs` *(integer, optional, default: 0)*: Số lượng bài viết đã nạp trên client (hỗ trợ infinite scroll / load more).
  - `category` *(string, optional, default: "ALL")*: Lọc theo tên danh mục, hoặc `"ALL"` để lấy tất cả.
- **Response (200 OK)**:
```json
{
  "blogs": [
    {
      "id": "e4c7c8b2-3211-4f93-b8ef-1a4f0d319e7a",
      "tag": "Quant Trading",
      "title": "Ứng dụng Machine Learning trong Dự báo Giá",
      "banner_url": "quant-trading-ml/banner.png",
      "link_post": "ung-dung-machine-learning-trong-du-bao-gia",
      "category": "Quant Trading",
      "created_at": "2026-03-30T10:00:00.000000",
      "modified_at": "2026-03-30T10:00:00.000000",
      "seo": {
        "title": "Ứng dụng Machine Learning trong Dự báo Giá",
        "description": "Tìm hiểu mô hình LSTM và Transformer ứng dụng vào giao dịch định lượng.",
        "url": "https://quantvn.com/blog/ung-dung-machine-learning-trong-du-bao-gia",
        "keywords": ["quant", "machine learning", "trading"],
        "author": "Quant-VN Team"
      }
    }
  ],
  "next_req": "blog/client/blogs?num_of_blogs=10"
}
```
> *Ghi chú*: Nếu không còn trang kế tiếp, `next_req` sẽ trả về `null`.

#### 3. Lấy chi tiết bài viết công khai theo URL slug (Public Blog Detail)
- **Method & Path**: `GET /blog/link/{link_post}`
- **Auth**: Public
- **Path Parameters**:
  - `link_post` *(string, required)*: Slug định danh của bài viết (ví dụ: `bai-viet-so-1`).
- **Query Parameters**:
  - `limit` *(integer, optional, default: 4)*: Số lượng bài viết liên quan cần lấy kèm.
- **Response (200 OK)**:
```json
{
  "id": "e4c7c8b2-3211-4f93-b8ef-1a4f0d319e7a",
  "tag": "Quant Trading",
  "title": "Ứng dụng Machine Learning trong Dự báo Giá",
  "banner_url": "quant-trading-ml/banner.png",
  "link_post": "ung-dung-machine-learning-trong-du-bao-gia",
  "content": "# Nội dung bài viết định dạng Markdown...",
  "category": "Quant Trading",
  "seo": {
    "title": "Ứng dụng Machine Learning trong Dự báo Giá",
    "description": "Mô tả SEO bài viết...",
    "url": "https://quantvn.com/blog/ung-dung-machine-learning-trong-du-bao-gia",
    "keywords": ["quant", "ml"],
    "author": "Quant-VN Team",
    "published_time": "2026-03-30 10:00:00",
    "modified_time": "2026-03-30 10:00:00"
  },
  "state": "APPROVED",
  "created_at": "2026-03-30T10:00:00.000000",
  "modified_at": "2026-03-30T10:00:00.000000",
  "related_blogs": [
    {
      "id": "99c8d1a1-1234-4b56-789a-0123456789ab",
      "tag": "Quant Trading",
      "title": "Bài viết cùng chủ đề liên quan",
      "banner_url": "path/to/banner.jpg",
      "link_post": "bai-viet-cung-chu-de",
      "category": "Quant Trading",
      "created_at": "2026-03-30T10:05:00.000000",
      "modified_at": "2026-03-30T10:05:00.000000",
      "seo": { "..." : "..." }
    }
  ]
}
```
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài viết"}`

#### 4. Danh sách bài viết Quản trị CMS (Admin Blog List)
- **Method & Path**: `GET /blog/admin/blogs`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `state` *(string, optional)*: Lọc theo trạng thái: `"PENDING"`, `"APPROVED"`, `"REJECTED"`.
  - `category` *(string, optional)*: Lọc theo tên chuyên mục.
  - `page` *(integer, optional, default: 1, min: 1)*: Số trang.
  - `pageSize` *(integer, optional, default: 20, min: 1, max: 100)*: Kích thước trang.
- **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "e4c7c8b2-3211-4f93-b8ef-1a4f0d319e7a",
      "tag": "Quant Trading",
      "title": "Ứng dụng Machine Learning trong Dự báo Giá",
      "banner_url": "quant-trading-ml/banner.png",
      "link_post": "ung-dung-machine-learning-trong-du-bao-gia",
      "created_at": "2026-03-30T10:00:00.000000",
      "modified_at": "2026-03-30T10:00:00.000000",
      "state": "APPROVED",
      "seo": {
        "title": "Tiêu đề SEO",
        "description": "Mô tả SEO",
        "url": "https://quantvn.com/blog/ung-dung-machine-learning-trong-du-bao-gia",
        "keywords": ["quant"],
        "author": "Admin"
      },
      "category": "Quant Trading"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

#### 5. Chi tiết bài viết cho Quản trị CMS (Admin Blog Detail)
- **Method & Path**: `GET /blog/admin/{blog_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*: UUID của bài viết.
- **Response (200 OK)**:
```json
{
  "id": "e4c7c8b2-3211-4f93-b8ef-1a4f0d319e7a",
  "tag": "Quant Trading",
  "title": "Ứng dụng Machine Learning trong Dự báo Giá",
  "banner_url": "quant-trading-ml/banner.png",
  "link_post": "ung-dung-machine-learning-trong-du-bao-gia",
  "content": "# Toàn bộ nội dung Markdown...",
  "seo": {
    "title": "Tiêu đề SEO",
    "description": "Mô tả SEO",
    "url": "https://quantvn.com/blog/ung-dung-machine-learning-trong-du-bao-gia",
    "keywords": ["quant"],
    "author": "Admin",
    "published_time": "2026-03-30 10:00:00",
    "modified_time": "2026-03-30 10:00:00"
  },
  "category": "Quant Trading",
  "state": "APPROVED",
  "created_at": "2026-03-30T10:00:00.000000",
  "modified_at": "2026-03-30T10:00:00.000000",
  "related_blogs": []
}
```
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài viết"}`

#### 6. Tạo mới bài viết (Create Blog)
- **Method & Path**: `POST /blog`
- **Auth**: Admin (`Bearer <token>`)
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `blog_data` *(string, required)*: Chuỗi JSON đại diện cho model `BlogCreate`.
  - `image` *(binary file, optional)*: File ảnh banner (JPG, PNG, WebP, GIF). Giới hạn lấy từ `MEDIA_MAX_UPLOAD_MB`; cấu hình mặc định hiện tại là **10 MB**.
  - `action` *(string, optional, enum: `SAVE_PENDING`, `PUBLISH_NOW`, default: `SAVE_PENDING`)*.
- **Cấu trúc JSON trong `blog_data`**:
```json
{
  "tag": "Machine Learning",
  "title": "Chiến lược Pair Trading với Reinforcement Learning",
  "banner_url": "",
  "link_post": "chien-luoc-pair-trading-voi-reinforcement-learning",
  "category": "Algorithmic Trading",
  "content": "# Nội dung bài viết...",
  "seo": {
    "title": "Chiến lược Pair Trading với RL",
    "description": "Khám phá cách áp dụng RL vào giao dịch theo cặp",
    "url": "https://quantvn.com/blog/chien-luoc-pair-trading-voi-reinforcement-learning",
    "keywords": ["pair trading", "reinforcement learning", "quant"],
    "author": "VietQuant"
  }
}
```
- **Response (201 Created)**: Trả về đối tượng Blog hoàn chỉnh sau khi lưu vào database.
- **Errors**:
  - `400 Bad Request`: `{"detail": "Bài viết với liên kết '...' đã tồn tại"}`
  - `415 Unsupported Media Type`: `{"detail": "Chỉ hỗ trợ định dạng ảnh JPEG, PNG, WebP và GIF"}`
  - `413 Request Entity Too Large`: `{"detail": "Kích thước hình ảnh vượt quá giới hạn cho phép"}`

#### 7. Cập nhật bài viết (Update Blog)
- **Method & Path**: `PUT /blog/{id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `id` *(string, required)*: UUID của bài viết cần sửa.
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `blog_data` *(string, required)*: Chuỗi JSON đại diện cho model `BlogUpdate` (các trường đều là tùy chọn).
  - `image` *(binary file, optional)*: File ảnh banner mới (nếu muốn thay thế ảnh cũ).
- **Cấu trúc JSON trong `blog_data`**:
```json
{
  "title": "Tiêu đề mới cập nhật",
  "content": "# Nội dung cập nhật...",
  "state": "APPROVED",
  "category": "Quant Trading",
  "seo": {
    "title": "SEO Title mới",
    "description": "SEO Description mới",
    "url": "https://quantvn.com/blog/url-moi",
    "keywords": ["tag1", "tag2"],
    "author": "Admin"
  }
}
```
- **Response (200 OK)**: Trả về đối tượng Blog đã cập nhật.
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài viết"}`
  - `400 Bad Request`: `{"detail": "Bài viết với liên kết '...' đã tồn tại"}`

#### 8. Xóa bài viết (Delete Blog)
- **Method & Path**: `DELETE /blog/{blog_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*: UUID bài viết cần xóa.
- **Response (200 OK)**:
```json
{
  "message": "Xóa bài viết thành công"
}
```
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài viết"}`

#### 9. Khôi phục bài viết đã xóa (Restore Blog)
- **Method & Path**: `POST /blog/{blog_id}/restore`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*: UUID bài viết cần khôi phục.
- **Response (200 OK)**: Đối tượng Blog sau khi khôi phục (`deleted_at` được set về `null`).
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài viết"}`

#### 10. Kiểm tra trùng lặp đường dẫn (Check Duplicate Slug)
- **Method & Path**: `GET /blog/is-duplicate-link-post`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `link_post` *(string, required)*: Slug cần kiểm tra (ví dụ: `my-awesome-post`).
- **Response (200 OK)**:
```json
true
```
> *Ghi chú*: Trả về `true` nếu slug đã bị bài khác sử dụng; trả về `false` nếu slug hoàn toàn khả dụng.

#### 11. AI tạo bản nháp bài viết (AI Generate Draft)
- **Method & Path**: `POST /blog/ai/generate-draft`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "title": "Giới thiệu về Backtesting trong Giao dịch Định lượng",
  "category": "Quant Trading"
}
```
- **Response (200 OK)**:
```json
{
  "tag": "Backtesting",
  "title": "Giới thiệu về Backtesting trong Giao dịch Định lượng",
  "link_post": "gioi-thieu-ve-backtesting-trong-giao-dich-dinh-luong",
  "category": "Quant Trading",
  "content": "# Giới thiệu về Backtesting...\n\nNội dung chi tiết...",
  "seo": {
    "title": "Giới thiệu về Backtesting trong Giao dịch Định lượng",
    "description": "Hướng dẫn toàn diện về quy trình kiểm thử chiến lược backtesting...",
    "url": "https://quantvn.com/blog/gioi-thieu-ve-backtesting-trong-giao-dich-dinh-luong",
    "keywords": ["backtesting", "quant trading", "python"],
    "author": "VietQuant"
  }
}
```

#### 12. AI tạo Markdown bài viết - Legacy Endpoint
- **Method & Path**: `POST /blog/ai-generate-markdown`
- **Auth**: Admin (`Bearer <token>`)
- **Request & Response**: Tương đương hoàn toàn endpoint `/blog/ai/generate-draft` (dành cho client cũ chưa kịp cập nhật route).

#### 13. AI gợi ý danh sách tiêu đề (AI Generate Title List)
- **Method & Path**: `GET /blog/openai/ai-generate-list-title`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `keyword` *(string, required)*: Từ khóa chủ đề chính (ví dụ: `Risk Parity`).
  - `quantity` *(integer, optional)*: Khi không gửi, backend dùng `1`. Khi gửi giá trị, chỉ chấp nhận từ `5` đến `10`; frontend nên luôn gửi giá trị trong khoảng `5`–`10` để tránh mơ hồ giữa default legacy và validation.
  - `language` *(string, optional, enum: `vietnamese`, `english`, default: `vietnamese`)*: Ngôn ngữ tiêu đề.
- **Response (200 OK)**:
```json
[
  "Risk Parity là gì? Phương pháp phân bổ danh mục theo rủi ro tối ưu",
  "Xây dựng chiến lược All-Weather Portfolio bằng thuật toán Risk Parity",
  "So sánh Risk Parity và Mean-Variance Portfolio: Đâu là lựa chọn tốt hơn?",
  "Ứng dụng Python trong tối ưu hóa danh mục đầu tư theo Risk Parity",
  "Những cạm bẫy thường gặp khi triển khai mô hình Risk Parity thực tế"
]
```

#### 14. Tìm kiếm SERP và phân loại link tham khảo (Search & Classify References)
- **Method & Path**: `POST /blog/search-references`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "keyword": "tối ưu hóa danh mục Black-Litterman",
  "keywords": ["black-litterman python", "portfolio optimization"],
  "language": "vietnamese",
  "max_results": 10,
  "exclude_ads": true,
  "exclude_spam": true
}
```
- **Response (200 OK)**:
```json
[
  {
    "title": "Mô hình Black-Litterman trong quản lý danh mục đầu tư",
    "url": "https://example.com/tai-chinh/black-litterman",
    "tag": "NORMAL"
  },
  {
    "title": "Dịch vụ đầu tư chứng khoán cam kết lãi suất cao",
    "url": "https://spam-site.com/promo",
    "tag": "SPAM"
  }
]
```

#### 15. Phân loại danh sách link (Classify Supplied Links)
- **Method & Path**: `POST /blog/classify-links`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "links": [
    {
      "url": "https://en.wikipedia.org/wiki/Modern_portfolio_theory",
      "title": "Modern portfolio theory - Wikipedia",
      "snippet": "Modern portfolio theory is a mathematical framework for assembling a portfolio of assets..."
    }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "classified_links": [
    {
      "url": "https://en.wikipedia.org/wiki/Modern_portfolio_theory",
      "category": "organic",
      "confidence": 0.98,
      "reason": "Educational and reputable academic domain",
      "metadata": {}
    }
  ],
  "summary": {
    "total": 1,
    "organic": 1,
    "ad": 0,
    "spam": 0,
    "duplicate": 0
  }
}
```

#### 16. Trích xuất nội dung văn bản từ URL (Fetch Content from URL)
- **Method & Path**: `POST /blog/fetch-content`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "url": "https://example.com/article-to-extract",
  "include_metadata": true
}
```
- **Response (200 OK)**:
```json
{
  "url": "https://example.com/article-to-extract",
  "title": "Tiêu đề bài viết trích xuất",
  "content": "<p>Nội dung dạng HTML có cấu trúc...</p>",
  "text_content": "Nội dung plain text được làm sạch không còn HTML tags...",
  "author": "Tác giả bài báo",
  "published_date": "2026-01-15",
  "language": "vi",
  "metadata": {
    "site_name": "Example Tech Blog",
    "description": "Tóm tắt meta..."
  },
  "success": true,
  "error_message": null
}
```

---

### MODULE 3: CATEGORY MANAGEMENT (`/categories`)

#### 17. Lấy danh sách chuyên mục (List Categories)
- **Method & Path**: `GET /categories`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `page` *(integer, optional, default: 1, min: 1)*
  - `pageSize` *(integer, optional, default: 20, min: 1, max: 100)*
- **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "c1f7a0e5-79a4-4a52-b13c-0e86b4d32a9e",
      "name": "Quant Trading",
      "slug": "quant-trading",
      "createdAt": "2026-01-01T00:00:00",
      "modifiedAt": "2026-01-01T00:00:00"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

#### 18. Tạo chuyên mục mới (Create Category)
- **Method & Path**: `POST /categories`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "name": "Risk Management"
}
```
- **Response (200 OK)**:
```json
{
  "id": "76d8e2a3-9876-4321-bca9-0123456789de",
  "name": "Risk Management",
  "slug": "risk-management"
}
```

#### 19. Đổi tên chuyên mục (Update Category)
- **Method & Path**: `PUT /categories/{category_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `category_id` *(string, required)*: UUID chuyên mục.
- **Request Body**:
```json
{
  "name": "Advanced Risk Management"
}
```
- **Response (200 OK)**:
```json
{
  "id": "76d8e2a3-9876-4321-bca9-0123456789de",
  "name": "Advanced Risk Management",
  "slug": "advanced-risk-management",
  "created_at": "2026-01-01T00:00:00",
  "modified_at": "2026-03-30T10:00:00",
  "deleted_at": null
}
```
- **Errors**:
  - `404 Not Found`: `{"detail": "Category not found"}`
  - `409 Conflict`: `{"detail": "Category slug already exists"}`

#### 20. Xóa mềm chuyên mục (Delete Category)
- **Method & Path**: `DELETE /categories/{category_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `category_id` *(string, required)*: UUID chuyên mục cần xóa.
- **Response (200 OK)**:
```json
{
  "message": "Category deleted"
}
```
- **Errors**:
  - `404 Not Found`: `{"detail": "Category not found"}`

#### 21. Khôi phục chuyên mục đã xóa mềm (Restore Category)
- **Method & Path**: `POST /categories/{category_id}/restore`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `category_id` *(string, required)*: UUID chuyên mục cần khôi phục.
- **Response (200 OK)**: Trả về đối tượng Category sau khi xóa `deleted_at`.
- **Errors**:
  - `404 Not Found`: `{"detail": "Category not found"}`

---

### MODULE 4: MEDIA & IMAGE STORAGE (`/media`)

#### 22. Tải ảnh lên máy chủ lưu trữ (Upload Media Image)
- **Method & Path**: `POST /media/image`
- **Auth**: Admin (`Bearer <token>`)
- **Headers**: `Content-Type: multipart/form-data`
- **Query Parameters**:
  - `link_blog` *(string, optional, default: "")*: Thư mục lưu trữ theo slug bài viết (ví dụ: `bai-viet-so-1`).
- **Form Fields**:
  - `image` *(binary file, required)*: Định dạng hỗ trợ: JPEG, PNG, WebP, GIF. Giới hạn lấy từ `MEDIA_MAX_UPLOAD_MB`; cấu hình mặc định hiện tại là **10 MB**.
- **Response (201 Created)**: Trả về chuỗi `object_key` lưu trữ trong MinIO S3:
```json
"bai-viet-so-1/4a2b918c-391a-4938-bdf2-f8314e1a0210.png"
```
- **Errors**:
  - `415 Unsupported Media Type`: `{"detail": "Chỉ hỗ trợ định dạng ảnh JPEG, PNG, WebP và GIF"}`
  - `413 Request Entity Too Large`: `{"detail": "Kích thước hình ảnh vượt quá giới hạn cho phép"}`

#### 23. Truy xuất / Xem hình ảnh (Redirect to Presigned Image URL)
- **Method & Path**: `GET /{object_key}`
- **Auth**: Public
- **Path Parameters**:
  - `object_key` *(string, required)*: Key file ảnh trả về từ endpoint upload (ví dụ: `bai-viet-so-1/4a2b918c-391a-4938-bdf2-f8314e1a0210.png`).
- **Response (307 Temporary Redirect)**:
  - Header `Location: <presigned_s3_url_with_expiration>`
  - Trình duyệt và frontend sẽ tự động chuyển hướng và tải ảnh hiển thị.

---

### MODULE 5: OPENAI / GEMINI SEO HELPER (`/openai`)

#### 24. Tạo từ khóa SEO bằng AI (Generate SEO Keywords)
- **Method & Path**: `POST /openai/seo-keywords`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "blog_title": "Chiến lược Pairs Trading cho Thị trường Phái sinh Việt Nam",
  "blog_content": "Chi tiết toàn bộ bài phân tích và công thức hiệp phương sai..."
}
```
- **Response (200 OK)**:
```json
[
  "pairs trading vn30",
  "giao dịch định lượng phái sinh",
  "statistical arbitrage vietnam",
  "chiến lược hiệp phương sai",
  "quant trading vn"
]
```

#### 25. Tạo mô tả SEO tóm tắt bằng AI (Generate SEO Description)
- **Method & Path**: `POST /openai/seo-description`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "blog_title": "Chiến lược Pairs Trading cho Thị trường Phái sinh Việt Nam",
  "blog_content": "Chi tiết toàn bộ bài phân tích và công thức..."
}
```
- **Response (200 OK)**:
```json
"Khám phá chiến lược Pairs Trading trên rổ VN30 F1M: Hướng dẫn chi tiết cách phát hiện cặp cổ phiếu phân kỳ và cơ hội kinh doanh chênh lệch giá an toàn."
```

---

### MODULE 6: PUBLICATIONS & CHANNEL ORCHESTRATION (`/publications/blogs`)

#### 26. Lấy cấu hình và trạng thái xuất bản của Blog (Get Publication State)
- **Method & Path**: `GET /publications/blogs/{blog_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*: UUID của bài viết Blog.
- **Response (200 OK)**:
```json
{
  "id": "pub-01234567-89ab-cdef-0123-456789abcdef",
  "blogId": "e4c7c8b2-3211-4f93-b8ef-1a4f0d319e7a",
  "publishWeb": true,
  "publishLinkedin": true,
  "linkedinMode": "SUMMARY",
  "linkedinContent": "Bài viết tóm tắt chuyên sâu cho LinkedIn... #VietQuant",
  "linkedinLinkPlacement": "IN_POST",
  "linkedinRecordId": "post-789a-0123-bcde-456789abcdef",
  "linkedinStatus": "READY",
  "linkedinPostId": null,
  "linkedinPublishedAt": null,
  "linkedinError": null,
  "linkedinMediaMode": "single-image",
  "linkedinMedia": [
    {
      "provider": "pexels",
      "providerId": "1234567",
      "sourceUrl": "https://www.pexels.com/photo/1234567/",
      "imageUrl": "https://images.pexels.com/photos/1234567/pexels-photo-1234567.jpeg",
      "photographer": "Jane Doe",
      "attribution": "Photo by Jane Doe on Pexels",
      "altText": "Biểu đồ định lượng và số liệu tài chính",
      "order": 1
    }
  ],
  "linkedinFactCheck": {
    "requiresHumanFactCheck": false,
    "factCheckNotes": []
  },
  "linkedinGenerated": {
    "style": "technical-analogy",
    "openingType": "statement"
  }
}
```
- `linkedinPublishedLinkUrl` records the backend-owned URL used when publishing. Responses omit retired comment fields.
- **Enum `linkedinStatus`**: `NOT_SELECTED` | `DRAFT` | `READY` | `PUBLISHING` | `PUBLISHED` | `FAILED` | `REVIEW_REQUIRED`
- **Enum `linkedinMode`**: `SAME` | `SUMMARY` | `CUSTOM`
- **Enum `linkedinMediaMode`**: `none` | `single-image` | `multi-image`

#### 27. Cập nhật cấu hình kênh xuất bản (Update Publication Channels)
- **Method & Path**: `PUT /publications/blogs/{blog_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Request Body**:
```json
{
  "publishWeb": true,
  "publishLinkedin": true,
  "linkedinMode": "SUMMARY",
  "linkedinLinkPlacement": "IN_POST"
}
```
> *Quy tắc ràng buộc*:
> - Phải chọn ít nhất một kênh (`publishWeb: true` hoặc `publishLinkedin: true`).
> - `linkedinLinkPlacement` accepts `NONE` or `IN_POST`; any non-`NONE` value requires both Web and LinkedIn.
- **Response (200 OK)**: Trả về đối tượng publication đã serialize.

#### 28. AI tạo bản nháp bài LinkedIn từ Blog (Draft LinkedIn Post from Blog)
- **Method & Path**: `POST /publications/blogs/{blog_id}/linkedin/draft`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Request Body**:
```json
{
  "mode": "SUMMARY",
  "linkPlacement": "IN_POST",
  "regenerate": true,
  "language": "vietnamese"
}
```
- **Response (200 OK)**:
```json
{
  "content": "Tại sao hầu hết các mô hình backtest đều thất bại ngoài thực tế?..",
  "media": {
    "mode": "single-image",
    "images": [
      {
        "slotId": "slot-1",
        "order": 1,
        "role": "hero",
        "preferredSource": "pexels",
        "concept": "Financial charts and coding screen",
        "searchKeywords": ["algorithm trading", "code"],
        "altTextDraft": "Màn hình code thuật toán giao dịch"
      }
    ]
  },
  "factualReview": {
    "requiresHumanFactCheck": false,
    "factCheckNotes": []
  },
  "generated": {
    "style": "question-first",
    "openingType": "question",
    "audience": "quantitative-finance",
    "hookSource": "Backtest overfitting issue",
    "connection": {
      "from": "Statistics",
      "to": "Market Execution"
    },
    "insight": "Sự khác biệt giữa giả định và thanh khoản thực tế",
    "hashtags": ["#VietQuant", "#Trading"]
  }
}
```
- **Errors**:
  - `422 Unprocessable Entity`: `{"detail": "Nội dung TÙY CHỈNH phải do quản trị viên cung cấp"}` (khi gửi mode CUSTOM).
  - `503 Service Unavailable`: `{"detail": {"code": "provider_history_unavailable", ...}}`

#### 29. Lưu hoặc xuất bản bài LinkedIn chuyển thể từ Blog (Command LinkedIn)
- **Method & Path**: `POST /publications/blogs/{blog_id}/linkedin`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Request Body**:
```json
{
  "mode": "SUMMARY",
  "content": "Nội dung bài viết đã duyệt bởi người dùng...",
  "media": [
    {
      "provider": "pexels",
      "providerId": "987654",
      "sourceUrl": "https://www.pexels.com/photo/987654/",
      "imageUrl": "https://images.pexels.com/photos/987654/pexels-photo-987654.jpeg",
      "photographer": "John Smith",
      "attribution": "Photo by John Smith on Pexels",
      "altText": "Hình ảnh minh họa cho bài viết",
      "order": 1
    }
  ],
  "linkPlacement": "IN_POST",
  "factCheck": {
    "requiresHumanFactCheck": false,
    "factCheckNotes": []
  },
  "generation": {},
  "action": "SAVE_DRAFT"
}
```
- **Enum `action`**: `SAVE_DRAFT` (chỉ lưu, status chuyển READY) | `PUBLISH_NOW` (lưu và đăng ngay lên LinkedIn).
- `media` chấp nhận cả ảnh Pexels và ảnh upload theo schema tại endpoint 49; thứ tự xuất bản lấy từ trường `order`.
- **Response (200 OK)**: Trả về trạng thái publication đầy đủ.

#### 30. Chỉnh sửa nội dung / media LinkedIn đã lưu (Update LinkedIn Content)
- **Method & Path**: `PUT /publications/blogs/{blog_id}/linkedin`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Request Body**:
```json
{
  "content": "Nội dung chỉnh sửa thủ công mới...",
  "media": [
    {
      "provider": "pexels",
      "providerId": "987654",
      "sourceUrl": "https://www.pexels.com/photo/987654/",
      "imageUrl": "https://images.pexels.com/photos/987654/pexels-photo-987654.jpeg",
      "photographer": "John Smith",
      "attribution": "Photo by John Smith on Pexels",
      "altText": "Hình ảnh minh họa",
      "order": 1
    }
  ]
}
```
- `media` chấp nhận cùng union Pexels/upload như endpoint 29.
- **Response (200 OK)**: Trả về đối tượng publication đã cập nhật.

#### 31. Gợi ý hình ảnh Pexels cho bài LinkedIn của Blog (Suggest Media for Blog)
- **Method & Path**: `POST /publications/blogs/{blog_id}/linkedin/media/suggest`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Request Body**:
```json
{
  "keywords": ["algorithmic trading", "stock market data"]
}
```
- **Response (200 OK)**:
```json
{
  "items": [
    {
      "provider": "pexels",
      "providerId": "187041",
      "sourceUrl": "https://www.pexels.com/photo/187041/",
      "imageUrl": "https://images.pexels.com/photos/187041/pexels-photo-187041.jpeg",
      "photographer": "Negative Space",
      "attribution": "Photo by Negative Space on Pexels",
      "altText": "Stock exchange financial board",
      "order": 1
    }
  ]
}
```

#### 32. Kích hoạt xuất bản tổng hợp (Publish Configured Channels)
- **Method & Path**: `POST /publications/blogs/{blog_id}/publish`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Logic**:
  - Nếu `publishWeb: true`: chuyển `state` của Blog sang `APPROVED`.
  - Nếu `publishLinkedin: true`: xuất bản bài đăng LinkedIn liên kết lên Company Page.
- **Response (200 OK)**: Đối tượng publication với trạng thái cập nhật mới nhất.
- **Errors**:
  - `422 Unprocessable Entity`: `{"detail": "Cần lưu nội dung LinkedIn đã duyệt trước khi xuất bản"}`
  - `409 Conflict`: Khi bài viết đang ở trạng thái `PUBLISHING` hoặc cần duyệt tay.

#### 33. Xuất bản lại kênh LinkedIn bị lỗi (Retry Failed LinkedIn Publication)
- **Method & Path**: `POST /publications/blogs/{blog_id}/linkedin/retry`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `blog_id` *(string, required)*
- **Logic**: Chỉ áp dụng khi `linkedinStatus == "FAILED"`. Kênh Web đã xuất bản thành công sẽ không bị đăng lại.
- **Response (200 OK)**: Đối tượng publication sau khi thực thi retry.

---

### MODULE 7: STANDALONE LINKEDIN POSTS & TOOLS (`/linkedin`)

#### 34. AI tạo bản nháp bài LinkedIn độc lập (Generate Independent Draft)
- **Method & Path**: `POST /linkedin/ai/generate-draft`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "topic": "Tại sao Sharpe Ratio có thể đánh lừa nhà đầu tư?",
  "context": "Phân tích điểm yếu của Sharpe Ratio khi phân phối lợi nhuận không chuẩn (fat tails)",
  "targetAudience": "mixed",
  "requestedMediaMode": "single-image"
}
```
- **Enum `targetAudience`**: `"math" | "competitive-programming" | "software-engineering" | "machine-learning" | "systems" | "mixed"`
- **Enum `requestedMediaMode`**: `"none" | "single-image" | "multi-image"`
- **Response (200 OK)**:
```json
{
  "content": "Sharpe Ratio là chỉ số kinh điển... nhưng nó có thể khiến bạn trả giá đắt. #VietQuant #RiskManagement",
  "media": {
    "mode": "single-image",
    "images": [
      {
        "slotId": "slot-1",
        "order": 1,
        "role": "hero",
        "preferredSource": "pexels",
        "concept": "A deceptive statistical graph",
        "searchKeywords": ["statistics", "data science"],
        "altTextDraft": "Biểu đồ phân phối rủi ro thống kê"
      }
    ]
  },
  "factualReview": {
    "requiresHumanFactCheck": false,
    "factCheckNotes": []
  },
  "generated": {
    "style": "contrarian",
    "openingType": "contrast",
    "audience": "math",
    "hookSource": "Sharpe Ratio illusion",
    "connection": {
      "from": "Normal Distribution",
      "to": "Fat Tail Events"
    },
    "insight": "Cần kết hợp thêm Sortino hoặc Omega ratio",
    "hashtags": ["#VietQuant", "#RiskManagement"]
  }
}
```

#### 35. Danh sách bài đăng LinkedIn độc lập (List Standalone Posts)
- **Method & Path**: `GET /linkedin/posts`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `page` *(integer, optional, default: 1, min: 1)*
  - `pageSize` *(integer, optional, default: 20, min: 1, max: 100)*
  - `status` *(string, optional, enum: `DRAFT`, `READY`, `PUBLISHING`, `PUBLISHED`, `FAILED`, `REVIEW_REQUIRED`)*
  - `sourceType` *(string, optional, enum: `INDEPENDENT_AI`, `BLOG_ADAPTATION`, `CUSTOM`)*
- **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "post-12345678-abcd-ef01-2345-6789abcdef01",
      "content": "Nội dung bài viết...",
      "topic": "Tại sao Sharpe Ratio có thể đánh lừa nhà đầu tư?",
      "mediaMode": "single-image",
      "media": [],
      "factCheck": {},
      "generation": {},
      "sourceType": "INDEPENDENT_AI",
      "status": "READY",
      "providerPostId": null,
      "publishedAt": null,
      "lastError": null,
      "manuallyEdited": false,
      "deletedAt": null,
      "createdAt": "2026-03-30T10:00:00.000000Z",
      "modifiedAt": "2026-03-30T10:00:00.000000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

#### 36. Lấy chi tiết bài đăng LinkedIn độc lập (Get Single Post)
- **Method & Path**: `GET /linkedin/posts/{post_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*: UUID bài đăng.
- **Response (200 OK)**: Chi tiết đối tượng bài đăng (schema tương tự item trong danh sách).
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài đăng LinkedIn"}`

#### 37. Tạo bài đăng LinkedIn độc lập (Create LinkedIn Post)
- **Method & Path**: `POST /linkedin/posts`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "content": "Nội dung bài đăng đã duyệt...",
  "topic": "Chủ đề bài đăng",
  "mediaMode": "single-image",
  "media": [
    {
      "provider": "pexels",
      "providerId": "12345",
      "sourceUrl": "https://www.pexels.com/photo/12345/",
      "imageUrl": "https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg",
      "photographer": "Jane Doe",
      "attribution": "Photo by Jane Doe on Pexels",
      "altText": "Hình minh họa",
      "order": 1
    }
  ],
  "factCheck": {
    "requiresHumanFactCheck": false,
    "factCheckNotes": []
  },
  "generation": {},
  "sourceType": "INDEPENDENT_AI",
  "action": "SAVE_DRAFT"
}
```
- `media` chấp nhận cả ảnh Pexels như trên và ảnh upload theo schema:
```json
{
  "provider": "upload",
  "objectKey": "linkedin/4a2b918c-391a-4938-bdf2-f8314e1a0210.png",
  "fileName": "market-chart.png",
  "altText": "Biểu đồ thị trường",
  "order": 1
}
```
- **Enum `action`**:
  - `SAVE_DRAFT`: Lưu bài vào database ở trạng thái `READY` hoặc `DRAFT`.
  - `PUBLISH_NOW`: Lưu bài và thực hiện lệnh đăng ngay lên LinkedIn.
- **Response (200 OK)**: Trả về bài đăng đã lưu hoặc kết quả đăng.

#### 38. Chỉnh sửa bài đăng LinkedIn độc lập (Update LinkedIn Post)
- **Method & Path**: `PUT /linkedin/posts/{post_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Request Body**:
```json
{
  "topic": "Chủ đề đã cập nhật",
  "content": "Nội dung bài viết mới...",
  "mediaMode": "none",
  "media": [],
  "factCheck": {"requiresHumanFactCheck": false, "factCheckNotes": []},
  "generation": {},
  "sourceType": "INDEPENDENT_AI"
}
```
> *Lưu ý*: Chỉ được sửa khi bài ở trạng thái `DRAFT`, `READY` hoặc `FAILED`. Nếu bài đã `PUBLISHED` hoặc đang `PUBLISHING`, server sẽ trả lỗi `409 Conflict`.
- **Response (200 OK)**: Đối tượng bài đăng sau khi chỉnh sửa.
- **Errors**:
  - `409 Conflict`: `{"detail": "Published or uncertain LinkedIn posts cannot be edited"}`

#### 39. Xóa mềm bài đăng LinkedIn (Delete Post)
- **Method & Path**: `DELETE /linkedin/posts/{post_id}`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Response (204 No Content)**: Xóa mềm thành công (không có body trả về).
- **Errors**:
  - `404 Not Found`: `{"detail": "Không tìm thấy bài đăng LinkedIn"}`

#### 40. Khôi phục bài đăng LinkedIn (Restore Post)
- **Method & Path**: `POST /linkedin/posts/{post_id}/restore`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Response (200 OK)**: Đối tượng bài đăng sau khi khôi phục (`deletedAt` trở về `null`).

#### 41. Xem lịch sử bài đăng thực tế trên LinkedIn Company Page (Recent History)
- **Method & Path**: `GET /linkedin/history/recent`
- **Auth**: Admin (`Bearer <token>`)
- **Query Parameters**:
  - `limit` *(integer, optional, default: 5, min: 1, max: 50)*: Số lượng bài viết cần lấy từ Company Page.
- **Response (200 OK)**:
```json
{
  "source": "linkedin",
  "items": [
    {
      "topic": "Machine Learning in Quantitative Finance",
      "providerPostId": "urn:li:share:7123456789012345678",
      "content": "Trích đoạn bài viết thực tế đã đăng...",
      "style": "technical-analogy",
      "openingType": "statement",
      "hookSource": "",
      "connection": "",
      "opening": "",
      "cta": "",
      "publishedAt": "2026-03-29T14:30:00Z"
    }
  ]
}
```
- **Errors**:
  - `503 Service Unavailable`: Khi LinkedIn API gặp sự cố hoặc token hết hạn.

#### 42. Đồng bộ lịch sử bài đăng từ Company Page (Sync History)
- **Method & Path**: `POST /linkedin/history/sync`
- **Auth**: Admin (`Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "source": "linkedin",
  "items": [
    "/* Danh sách tối đa 50 bài đăng mới nhất từ Company Page */"
  ]
}
```

#### 43. AI đề xuất chủ đề mới (Propose Fresh Topics)
- **Method & Path**: `POST /linkedin/ai/propose-topics`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
{
  "count": 3,
  "recentLimit": 20,
  "targetAudience": "mixed",
  "guideline": "Tập trung vào phân tích kỹ thuật và định lượng thực chiến"
}
```
- **Response (200 OK)**:
```json
{
  "topics": [
    "Khác biệt cốt lõi giữa Sharpe Ratio và Sortino Ratio trong thị trường tiền số",
    "Cách lọc nhiễu dữ liệu giá tick-by-tick trước khi đưa vào mô hình hồi quy",
    "Tối ưu lệnh bằng TWAP và VWAP: Khi nào nên áp dụng?"
  ],
  "historySource": "linkedin"
}
```
- **Errors**:
  - `422 Unprocessable Entity`: `{"detail": "AI did not return enough distinct fresh topics"}`

#### 44. Xuất bản bài đăng LinkedIn độc lập (Publish Post)
- **Method & Path**: `POST /linkedin/posts/{post_id}/publish`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Response (200 OK)**:
```json
{
  "id": "post-12345678-abcd-ef01-2345-6789abcdef01",
  "status": "PUBLISHED",
  "providerPostId": "urn:li:share:7987654321098765432",
  "publishedAt": "2026-03-30T10:15:30.123456Z",
  "lastError": null
}
```
- **Errors**:
  - `409 Conflict`: Nếu bài viết đã xuất bản rồi, đang trong quá trình xuất bản, hoặc đang ở trạng thái `FAILED` (yêu cầu dùng retry).
  - `422 Unprocessable Entity`: `{"detail": "Selected media does not match mediaMode"}`

#### 45. Thử xuất bản lại bài bị lỗi (Retry Failed Post)
- **Method & Path**: `POST /linkedin/posts/{post_id}/retry`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Logic**: Chỉ cho phép khi `status == "FAILED"`. Nếu bài ở trạng thái `REVIEW_REQUIRED` (nguy cơ trùng lặp bài đăng), API sẽ từ chối retry tự động để bảo vệ tài khoản Company Page.
- **Response (200 OK)**: Chi tiết bài đăng sau khi retry.
- **Errors**:
  - `409 Conflict`: `{"detail": "This LinkedIn post cannot be retried automatically"}` (khi status là REVIEW_REQUIRED).
  - `409 Conflict`: `{"detail": "Only failed LinkedIn posts can be retried"}` (khi status không phải FAILED).

#### 46. Gợi ý ảnh Pexels cho bài đăng LinkedIn độc lập (Suggest Media for Post)
- **Method & Path**: `POST /linkedin/posts/{post_id}/media/suggest`
- **Auth**: Admin (`Bearer <token>`)
- **Path Parameters**:
  - `post_id` *(string, required)*
- **Request Body** *(Optional - có thể truyền keywords hoặc để trống để hệ thống tự lấy từ media gợi ý của bài)*:
```json
["financial technology", "neural network"]
```
- **Response (200 OK)**:
```json
{
  "items": [
    {
      "provider": "pexels",
      "providerId": "373543",
      "sourceUrl": "https://www.pexels.com/photo/373543/",
      "imageUrl": "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg",
      "photographer": "Pixabay",
      "attribution": "Photo by Pixabay on Pexels",
      "altText": "Công nghệ số và biểu đồ",
      "order": 1
    }
  ]
}
```

#### 47. Xác minh tài khoản Company Page LinkedIn (Verify Organization)
- **Method & Path**: `GET /linkedin/organization/verify`
- **Auth**: Admin (`Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "identity": {
    "sub": "urn:li:person:abcdef1234",
    "name": "Quant-VN Admin"
  },
  "organization": {
    "urn": "urn:li:organization:12345678",
    "localizedName": "VietQuant Investment"
  },
  "roles": [
    {
      "role": "ADMINISTRATOR",
      "organization": "urn:li:organization:12345678"
    }
  ],
  "scopes": [
    "r_liteprofile",
    "w_member_social",
    "w_organization_social",
    "w_organization_social_feed",
    "r_organization_social"
  ],
  "permissions": {
    "canPostOrganic": true,
    "hasSocialWrite": true
  },
  "readyForOrganicPosting": true
}
```
- **Errors**:
  - `401 Unauthorized` / `503 Service Unavailable`: Nếu LinkedIn token hết hạn hoặc kết nối bị từ chối.

#### 48. Tìm kiếm ảnh trực tiếp trên Pexels (Search Pexels Media)
- **Method & Path**: `POST /linkedin/media/search`
- **Auth**: Admin (`Bearer <token>`)
- **Request Body**:
```json
[
  "trading floor",
  "stock chart"
]
```

- **Response (200 OK)**:
```json
{
  "items": [
    {
      "provider": "pexels",
      "providerId": "210607",
      "sourceUrl": "https://www.pexels.com/photo/210607/",
      "imageUrl": "https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg",
      "photographer": "Pixabay",
      "attribution": "Photo by Pixabay on Pexels",
      "altText": "Sàn giao dịch tài chính",
      "order": 1
    }
  ]
}
```

#### 49. Upload ảnh trực tiếp cho LinkedIn (Upload LinkedIn Media)
- **Method & Path**: `POST /linkedin/media/upload`
- **Auth**: Admin (`Bearer <token>`)
- **Headers**: `Content-Type: multipart/form-data`
- **Form Fields**:
  - `image` *(binary file, required)*: JPEG, PNG hoặc GIF; giới hạn bởi `MEDIA_MAX_UPLOAD_MB`, mặc định 10 MB.
- **Response (201 Created)**:
```json
{
  "provider": "upload",
  "objectKey": "linkedin/4a2b918c-391a-4938-bdf2-f8314e1a0210.png",
  "fileName": "market-chart.png",
  "altText": "market chart",
  "order": 1
}
```
- `objectKey` luôn thuộc prefix `linkedin/`. Backend đọc trực tiếp object này khi xuất bản và không tải URL tùy ý do client cung cấp.
- **Errors**:
  - `413 Request Entity Too Large`: File vượt giới hạn cấu hình.
  - `415 Unsupported Media Type`: File không phải JPEG, PNG hoặc GIF.

---

## 4. BẢNG MÃ LỖI VÀ XỬ LÝ SỰ CỐ (ERROR HANDLING GUIDE)

| Mã lỗi HTTP | Tình huống | Khuyến nghị xử lý cho Frontend |
|---|---|---|
| **400 Bad Request** | Trùng slug bài viết, dữ liệu không hợp lệ | Hiển thị thông báo `detail` cho người dùng nhập lại slug hoặc tên khác |
| **401 Unauthorized** | Thiếu header `Authorization` hoặc token hết hạn | Chuyển hướng người dùng về trang `/login`, xóa token cũ trong localStorage/cookies |
| **404 Not Found** | Không tìm thấy ID bài viết / danh mục | Hiển thị màn hình 404 hoặc thông báo không tìm thấy bản ghi |
| **409 Conflict** | Sửa bài đăng đang xuất bản, slug trùng, hoặc retry sai trạng thái | Không cho phép bấm nút chỉnh sửa/retry khi trạng thái không hợp lệ |
| **413 Request Entity Too Large** | Ảnh upload vượt quá giới hạn `MEDIA_MAX_UPLOAD_MB` (mặc định 10 MB) | Lấy giới hạn của môi trường bàn giao và chặn file vượt giới hạn trước khi upload |
| **415 Unsupported Media Type** | File LinkedIn không phải JPEG/PNG/GIF, MIME sai hoặc chữ ký byte không hợp lệ | Kiểm tra mime-type file ở client trước khi submit |
| **422 Unprocessable Entity** | Thiếu trường bắt buộc hoặc sai format Pydantic | Đánh dấu đỏ (highlight) các trường input bị lỗi dựa theo mảng `loc` trong response |
| **429 Too Many Requests** | Vượt giới hạn API rate limit của LinkedIn / Gemini | Thông báo người dùng chờ vài phút trước khi thực hiện lại tác vụ AI / xuất bản |
| **503 Service Unavailable** | MinIO hoặc LinkedIn API tạm thời không kết nối được | Bật banner cảnh báo hệ thống dịch vụ bên thứ 3 đang gián đoạn, cho phép bấm thử lại |

---

## 5. CHECKLIST BÀN GIAO

- Release owner cung cấp base URL của đúng môi trường, tài khoản admin thử nghiệm và CORS origin của frontend; không gửi JWT secret, mật khẩu hash, MinIO, Gemini, LinkedIn hoặc Pexels credentials cho frontend.
- Frontend xác nhận đăng nhập, CRUD Blog/Category, upload ảnh, publication và một luồng LinkedIn sandbox bằng `GET /docs` hoặc collection kiểm thử của dự án.
- Nếu OpenAPI và tài liệu này mâu thuẫn, router/backend đang chạy là nguồn sự thật; ghi issue và cập nhật contract trước khi frontend phụ thuộc vào thay đổi đó.
