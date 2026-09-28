# User Package API

Authentication: Firebase ID token trong header.

```http
Authorization: Bearer <firebase_id_token>
```

## 1. Get Users

```http
GET /course/admin/users
```

Muc dich: lay danh sach user de admin xem va cap goi subscription.

Response thuc te hien tai la array truc tiep.

### Response

```json
[
  {
    "id": "user_001",
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "display_name": "Nguyen Van A",
    "phone": null,
    "registration_date": "2025-04-10 22:05:19",
    "subscription_package": "SILVER",
    "created_at": "2026-05-01T08:00:00",
    "last_login": "2026-05-18T03:20:00"
  }
]
```

`subscription_package`: `SILVER`, `GOLD`, `PLATINUM`.

`registration_date`: response co the la string dang `YYYY-MM-DD HH:mm:ss`, string rong, hoac legacy date string.

## 2. Update User Subscription Package

```http
PUT /course/admin/user
```

Muc dich: cap nhat goi subscription cho mot user.

### Body

```json
{
  "user_id": "user_001",
  "subscription_package": "GOLD",
  "registration_date": "2025-04-10 22:05:19"
}
```

`subscription_package`: `SILVER`, `GOLD`, `PLATINUM`.

`registration_date`: frontend gui thoi gian hien tai dang `YYYY-MM-DD HH:mm:ss`.

### Response

Backend co the tra user sau khi update hoac object status don gian.

```json
{
  "success": true
}
```
