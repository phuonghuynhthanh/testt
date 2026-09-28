# FE Migration — Course user-admin APIs chuyển từ Platform sang Blog

3 endpoint quản trị học viên/khóa học đã **chuyển từ BE Platform (Lambda) sang BE Blog (FastAPI)**.
Bản trên Platform đã bị **gỡ bỏ** — FE phải đổi base URL sang Blog và (với endpoint cấp quyền) đổi payload.

## Tổng quan thay đổi

| Endpoint | Trạng thái | Thay đổi FE cần làm |
|---|---|---|
| `GET /admin/user` | Chuyển sang Blog, **giữ nguyên contract** | Đổi base URL → Blog |
| `GET /course/admin/users` | Chuyển sang Blog, **giữ nguyên response** | Đổi base URL → Blog |
| `POST /course/admin/user` | Chuyển sang Blog, **BREAKING payload** | Đổi base URL + đổi `courses_id[]` → `class_id` |

- **Base URL:** dùng domain/service của **BE Blog** (không còn gọi Platform cho 3 API này).
- **Auth:** `Authorization: Bearer <Firebase ID Token>` (như cũ).
- **Content-Type:** `application/json`.
- Response trả JSON ở **top-level** (không bọc `{data:...}`), giống Platform trước đây.

---

## 1) `GET /admin/user` — Chi tiết user + strategies

- **Quyền:** chỉ `admin`. Staff gọi → `403 { "detail": "Forbidden: admin only" }`.
- **Query:** `user_id` (bắt buộc).
- Contract **không đổi** so với Platform.

### Response `200`

```json
{
  "user_id": "user_001",
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "created_at": "2026-05-01T08:00:00",
  "updated_at": null,
  "is_first_login": false,
  "subscription_package": "GOLD",
  "subscription_plan": "LEARNER",
  "registration_plan_date": "2026-05-21T08:31:41",
  "plan_expire_date": "2026-06-20T08:31:41",
  "paper_trading_bot_limit": 1,
  "strategies": [
    {
      "bot_id": "bot_001",
      "bot_name": "Mean Reversion",
      "user_id": "user_001",
      "creator_name": "Nguyen Van A",
      "asset": "VN30F1M",
      "asset_type": "derivative",
      "market": "VN_STOCK",
      "is_paper_trading": true,
      "created_at": "2026-05-20T10:00:00",
      "run_at": "2026-05-20 10:00:00",
      "paper_trading_run_at": "2026-05-21 10:00:00",
      "paper_trade_first_order": "2026-05-21 10:05:00"
    }
  ]
}
```

### Lỗi
- `400`: thiếu `user_id`.
- `401`: token thiếu/không hợp lệ.
- `403`: không phải admin.
- `404`: `User not found`.

---

## 2) `GET /course/admin/users` — Danh sách user để chọn cấp quyền

- **Quyền:** `admin` **hoặc** `staff` (bất kỳ tài khoản staff/admin).
  - Lưu ý: đây là điểm **nới lỏng** so với Platform (trước kia staff bị chặn theo scope của khóa mặc định → hay bị 403). Nay mọi staff đều gọi được.
- **Query:** không có.
- Response **không đổi**: mảng user kèm package cao nhất và các khóa đã enroll.

### Response `200`

```json
[
  {
    "id": "user_001",
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "display_name": "Nguyen Van A",
    "phone": "0900000001",
    "package": "GOLD",
    "courses_id": ["0da6e1a8-a8b4-43f1-8343-6a37c34a6d52"],
    "created_at": "2026-05-01T08:00:00",
    "last_login": "2026-05-18T03:20:00"
  }
]
```

### Lỗi
- `401`: token thiếu/không hợp lệ.
- `403`: role không phải staff/admin (`Forbidden: staff or admin role required`).

---

## 3) `POST /course/admin/user` — Cấp / thu hồi quyền khóa qua **class** (BREAKING)

Thay đổi lớn nhất: **không gửi `courses_id` nữa, gửi `class_id`.**
BE tự resolve `class_id → course_id`, sau đó:

- **GOLD / PLATINUM** (cấp quyền): upsert enrollment cho course của class **và** thêm học viên vào lớp (`course_class_students`).
- **SILVER** (thu hồi): xóa enrollment **và** gỡ học viên khỏi lớp đó.

- **Quyền:** `admin` (bypass) hoặc `staff` có cờ `class` trên **course của class đó** (`scopes.certificate.courses[course_id].class = true`).
  - Đây là lý do trước kia staff bị `403 "Forbidden: admin only"` — nay staff quản lớp cấp quyền được.

### Request body

```json
{
  "user_id": "user_001",
  "class_id": "class-2f1c...-uuid",
  "subscription_package": "GOLD",
  "registration_date": "2026-05-21 08:31:41"
}
```

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `user_id` | ✅ | ID học viên |
| `class_id` | ✅ | ID lớp (thay cho `courses_id[]` trước đây) |
| `subscription_package` | ✅ | `SILVER` \| `GOLD` \| `PLATINUM` |
| `registration_date` | ✅ | Định dạng `YYYY-MM-DD HH:mm:ss`, lưu vào `enrolled_at` |

### Response `200`

```json
{
  "message": "Course access granted",
  "course_id": "0da6e1a8-a8b4-43f1-8343-6a37c34a6d52",
  "added_to_class": true
}
```

- `message`: `"Course access granted"` (GOLD/PLATINUM) hoặc `"Course access revoked"` (SILVER).
- `course_id`: course được resolve từ `class_id`.
- `added_to_class`: `true` nếu học viên vừa được thêm mới vào lớp; `false` nếu đã có sẵn hoặc là thao tác thu hồi.

### Lỗi
- `400`: thiếu `user_id`; `registration_date` sai định dạng.
- `401`: token thiếu/không hợp lệ.
- `403`: staff không có cờ `class` trên course của class (`Forbidden: course class scope required`).
- `404`: `Class not found` (class_id không tồn tại) hoặc `Student not found: <user_id>`.
- `422`: `subscription_package` không thuộc SILVER/GOLD/PLATINUM (validation).

### Ví dụ FE (Axios)

```ts
import axios from "axios";

const BLOG_BASE_URL = import.meta.env.VITE_BLOG_API_URL; // domain BE Blog

export async function grantCourseAccess(
  payload: {
    user_id: string;
    class_id: string;              // đổi từ courses_id[]
    subscription_package: "SILVER" | "GOLD" | "PLATINUM";
    registration_date: string;    // "YYYY-MM-DD HH:mm:ss"
  },
  idToken: string,
) {
  const res = await axios.post(`${BLOG_BASE_URL}/course/admin/user`, payload, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });
  return res.data; // { message, course_id, added_to_class }
}
```

---

## Checklist FE

- [ ] Trỏ 3 endpoint sang **base URL của BE Blog**.
- [ ] `POST /course/admin/user`: đổi payload `courses_id: string[]` → `class_id: string` (1 lớp / lần).
- [ ] Màn cấp quyền: lấy `class_id` từ danh sách lớp (`GET /course/classes?course_id=...` → `GET /course/class?id=...`).
- [ ] Xử lý response mới của POST: `{ message, course_id, added_to_class }` (không còn `{ success: true }`).
- [ ] Kiểm thử staff quản lớp: cấp quyền OK (không còn 403), danh sách user OK.
- [ ] Xử lý `404 Class not found` khi `class_id` sai/không tồn tại.

## Ghi chú
- `GET /students`, `GET /students/summary`, `GET /student` **vẫn ở Platform** (chưa chuyển) vì cần đọc cấu trúc khóa từ S3.
