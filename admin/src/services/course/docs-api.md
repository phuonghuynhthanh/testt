# API Docs - Student Management

Tai lieu nay mo ta API dang duoc admin UI su dung cho chuc nang quan ly hoc vien.

## Boi Canh

He thong hien chi co mot khoa hoc. Student Management dung danh sach hoc vien, thong ke tong quan, va API chi tiet khi admin mo trang detail cua mot hoc vien.

Endpoint base:

```txt
/students
```

## Danh Sach API

| Method | Endpoint | Muc dich |
| --- | --- | --- |
| `GET` | `/students` | Lay danh sach hoc vien kem tien trinh tong quan |
| `GET` | `/student?student_id=:studentId` | Lay chi tiet tien trinh, lesson, va ket qua test cua mot hoc vien |
| `GET` | `/students/summary` | Lay thong ke tong quan toan bo hoc vien |
| `GET` | `/course/admin/users` | Lay danh sach user de cap goi subscription |
| `PUT` | `/course/admin/user` | Cap nhat goi subscription cho user |

## Dang Nhap Course Admin Bang Firebase

Course Management va Student Management dung token rieng, khong dung chung cookie login admin tong. Phan dang nhap nay dung Firebase Authentication voi email/password. Sau khi Firebase login thanh cong, frontend lay Firebase ID token bang `user.getIdToken()` va luu vao cookie `admin_course_token`.

### Input

```json
{
  "email": "course-admin@example.com",
  "password": "secret"
}
```

### Token Luu Cookie

```json
{
  "token": "firebase_id_token",
  "email": "course-admin@example.com"
}
```

Cookie name: `admin_course_token`.

## Kieu Du Lieu Chung

### StudentStatus

```ts
type StudentStatus = "ACTIVE" | "COMPLETED";
```

### CourseStudent

```ts
type CourseStudent = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: StudentStatus;
  enrolled_at: string;
  last_active_at?: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  completed_tests: number;
  total_tests: number;
  average_score: number;
};
```

## 1. Lay Danh Sach Hoc Vien

```txt
GET /students
```

### Query Params

| Field | Type | Required | Mo ta |
| --- | --- | --- | --- |
| `course_id` | `string` | No | Co the bo qua vi hien chi co mot khoa hoc |
| `keyword` | `string` | No | Tim theo ten hoac email. Khong gui field nay neu rong |
| `status` | `StudentStatus` | No | Loc trang thai hoc vien. Khong gui field nay neu dang chon tat ca |
| `page` | `number` | No | Trang hien tai, mac dinh `1` |
| `limit` | `number` | No | So item moi trang, mac dinh `20` |

### Response

```json
{
  "data": [
    {
      "id": "student_001",
      "full_name": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "phone": "0900000001",
      "status": "ACTIVE",
      "enrolled_at": "2026-05-01T08:00:00.000Z",
      "last_active_at": "2026-05-18T03:20:00.000Z",
      "progress_percent": 64,
      "completed_lessons": 14,
      "total_lessons": 22,
      "completed_tests": 2,
      "total_tests": 4,
      "average_score": 82.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## 2. Lay Chi Tiet Hoc Vien

```txt
GET /student?student_id=:studentId
```

### Query Params

| Field | Type | Required | Mo ta |
| --- | --- | --- | --- |
| `student_id` | `string` | Yes | ID cua hoc vien can xem chi tiet |

### Response

```json
{
  "id": "student_001",
  "full_name": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "phone": "0900000001",
  "status": "ACTIVE",
  "enrolled_at": "2026-05-01T08:00:00.000Z",
  "last_login": "2026-05-18T03:20:00.000Z",
  "progress_percent": 64,
  "completed_lessons": 14,
  "total_lessons": 22,
  "completed_tests": 2,
  "total_tests": 4,
  "average_score": 82.5,
  "course": {
    "id": "course_001",
    "title": "QuantVN Course"
  },
  "progress_summary": {
    "progress_percent": 64,
    "completed_lessons": 14,
    "total_lessons": 22,
    "completed_chapters": 3,
    "total_chapters": 6,
    "total_time_spent_seconds": 14400
  },
  "chapters": [],
  "test_summary": {
    "completed_tests": 2,
    "total_tests": 4,
    "passed_tests": 2,
    "failed_tests": 0,
    "average_score": 82.5,
    "highest_score": 90,
    "lowest_score": 75
  },
  "test_results": []
}
```

Luu y: mot so status trong payload detail co the `null`. Frontend se hien thi `UNKNOWN`. Rieng test result neu co `submitted_at` thi frontend hien thi status la `SUBMITED`.

## 3. Lay Thong Ke Tong Quan Toan Bo Hoc Vien

```txt
GET /students/summary
```

### Query Params

| Field | Type | Required | Mo ta |
| --- | --- | --- | --- |
| `course_id` | `string` | No | Co the bo qua vi hien chi co mot khoa hoc |

### Response

```json
{
  "course_id": "0da6e1a8-a8b4-43f1-8343-6a37c34a6d52",
  "total_students": 36,
  "active_students": 30,
  "completed_students": 6,
  "average_progress_percent": 58.4,
  "average_score": 79.2,
  "total_lessons": 22,
  "total_tests": 4,
  "students_need_attention": 5,
  "top_students": [
    {
      "id": "student_001",
      "full_name": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "progress_percent": 94,
      "average_score": 91
    }
  ],
  "low_progress_students": [
    {
      "id": "student_009",
      "full_name": "Tran Thi B",
      "email": "tranthib@example.com",
      "progress_percent": 12,
      "average_score": 0,
      "last_active_at": "2026-05-03T02:00:00.000Z"
    }
  ]
}
```

## 4. Lay Danh Sach User

```txt
GET /course/admin/users
```

### Response

```json
[
  {
    "id": "user_001",
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "display_name": "Nguyen Van A",
    "phone": "0900000001",
    "registration_date": "2025-04-10 22:05:19",
    "subscription_package": "SILVER",
    "created_at": "2026-05-01T08:00:00.000Z",
    "last_login": "2026-05-18T03:20:00.000Z"
  }
]
```

### SubscriptionPackage

```ts
type SubscriptionPackage = "SILVER" | "GOLD" | "PLATINUM";
```

## 5. Cap Nhat Goi Subscription Cho User

```txt
PUT /course/admin/user
```

### Body

```json
{
  "user_id": "user_001",
  "subscription_package": "GOLD",
  "registration_date": "2025-04-10 22:05:19"
}
```
