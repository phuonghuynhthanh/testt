# Scopes Admin APIs (BE Blog)

Tài liệu này mô tả 2 endpoint mới trên BE blog để FE quản lý `scopes`.

## Base URL

- Dùng domain/service của BE blog.

## 1) GET `/admin/accounts`

- Mục đích: lấy danh sách account không phải `user` (`role != "user"`).
- Auth: `Bearer token` của `admin`.

### Sample response `200`

```json
{
  "users": [
    {
      "user_id": "uid_staff_1",
      "email": "staff1@quantvn.com",
      "role": "staff",
      "scopes": {
        "blog": { "enabled": true },
        "event": { "enabled": true },
        "certificate": {
          "enabled": true,
          "courses": {
            "course_1": { "content": true, "class": false },
            "course_2": { "content": false, "class": true }
          }
        }
      }
    }
  ]
}
```

### Error

- `403`: không phải admin.

---

## 2) PUT `/admin/account/scopes`

- Mục đích: cập nhật `scopes` cho một account.
- Auth: `Bearer token` của `admin`.
- Lưu ý: không cho cập nhật scopes cho account có `role = "user"`.

### Request body

```json
{
  "user_id": "uid_staff_1",
  "scopes": {
    "blog": { "enabled": true },
    "event": { "enabled": true },
    "certificate": {
      "enabled": true,
      "courses": {
        "course_1": { "content": true, "class": false },
        "course_2": { "content": false, "class": true }
      }
    }
  }
}
```

### Sample response `200`

```json
{
  "user_id": "uid_staff_1",
  "role": "staff",
  "scopes": {
    "blog": { "enabled": true },
    "event": { "enabled": true },
    "certificate": {
      "enabled": true,
      "courses": {
        "course_1": { "content": true, "class": false },
        "course_2": { "content": false, "class": true }
      }
    }
  }
}
```

### Error thường gặp

- `400`: payload không đúng format `scopes`.
- `400`: `Cannot assign scopes to role user`.
- `404`: `User not found`.
- `403`: không phải admin.

---

## Scopes contract chuẩn

```json
{
  "blog": { "enabled": true },
  "event": { "enabled": true },
  "certificate": {
    "enabled": true,
    "courses": {
      "course_1": { "content": true, "class": false },
      "course_2": { "content": false, "class": true }
    }
  }
}
```

- `admin` luôn bypass check scopes.
- Account có `scopes = {}` sẽ không có quyền module nào.

### `certificate.courses` — quyền theo từng khóa

- `enabled`: master switch. `false` → vô hiệu toàn bộ quyền khóa, bất kể `courses`.
- `courses[course_id]`: map theo `course_id`, mỗi khóa mang 2 cờ độc lập:
  - `content`: Quản trị **nội dung** (biên soạn khóa, cấu trúc/bài học, quiz).
  - `class`: Quản trị **lớp học** (học viên, bài nộp, chứng chỉ).
- Khóa `{ "content": false, "class": false }` = không có quyền → nên bỏ khỏi map.
- **Tương thích ngược:** account cũ còn `course_ids: [...]` được BE hiểu như
  `{ <id>: { "content": false, "class": true } }` (chỉ lớp học) cho tới khi được migrate.
