# FE Handoff - Create Staff Account Endpoint

## Overview

- Endpoint dùng để tạo tài khoản staff mới cho Blog.
- Chỉ tài khoản `admin` mới được gọi endpoint này.
- Flow backend:
  1. Check email đã tồn tại trong DB `users` hay chưa.
  2. Check email đã tồn tại trong Firebase Auth hay chưa.
  3. Tạo account Firebase bằng `email + password`.
  4. Tạo row staff trong DB `users` với scope mặc định **disabled**.

## Endpoint

- **Method:** `POST`
- **Path:** `/admin/account/staff-create`
- **Auth:** `Bearer <Firebase ID Token>` (token của user admin)
- **Content-Type:** `application/json`

## Request Body

```json
{
  "email": "staff@example.com",
  "password": "securepass123"
}
```

### Validation

- `email`: đúng format email.
- `password`: độ dài từ `8` đến `128` ký tự.

## Success Response

- **Status:** `201 Created`

```json
{
  "user_id": "firebase_uid_here",
  "email": "staff@example.com",
  "role": "staff",
  "scopes": {
    "blog": { "enabled": false },
    "event": { "enabled": false },
    "certificate": {
      "enabled": false,
      "courses": {}
    }
  }
}
```

## Error Responses

### 401 Unauthorized

- Thiếu token hoặc token Firebase không hợp lệ/hết hạn.

### 403 Forbidden

- User không phải `admin`.

```json
{
  "detail": "Forbidden: admin only"
}
```

### 409 Conflict

- Email đã tồn tại trong DB `users`.

```json
{
  "detail": "Email already exists in users table"
}
```

- Email đã tồn tại trong Firebase.

```json
{
  "detail": "Email already exists in Firebase"
}
```

### 400 Bad Request

- Lỗi khi check/create user trên Firebase hoặc tạo DB record thất bại.
- Ví dụ:

```json
{
  "detail": "Failed to create Firebase user"
}
```

## FE Integration Notes

- Sau khi tạo thành công, account có `role=staff` nhưng mọi scope đều `disabled`.
- FE cần có màn hình admin để bật scope bằng endpoint update scope hiện có:
  - `PUT /admin/account/scopes`
- Nên handle `409` riêng để hiển thị message "Email đã tồn tại".

## FE Example (Axios)

```ts
import axios from "axios";

type CreateStaffPayload = {
  email: string;
  password: string;
};

export async function createStaffAccount(payload: CreateStaffPayload, idToken: string) {
  const res = await axios.post(
    "/admin/account/staff-create",
    payload,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}
```

## Quick QA Checklist

- Admin token gọi endpoint tạo thành công trả `201`.
- Staff token gọi endpoint trả `403`.
- Email đã tồn tại trả `409`.
- Password ngắn hơn 8 ký tự trả lỗi validation `422`.
