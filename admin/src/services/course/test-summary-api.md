# `GET course/quiz/sumary`

API này dùng cho màn hình quản trị học viên của course, nhằm thống kê theo từng bài test:

- danh sách bài test trong course, không trả về nội dung bài
- số học viên đã đặt lịch `SCHEDULED` ở từng bài
- số học viên đã nộp bài ở từng bài
- danh sách học viên liên quan kèm thời gian `scheduled_at` và `submitted_at`

## Auth

- Chỉ `admin` mới được phép gọi API này.
- Nếu user không phải admin, backend nên trả `403 Forbidden`.

## Method

- `GET`

## Response đề xuất

```json
{
  "course_id": "course_001",
  "total_tests": 2,
  "tests": [
    {
      "lesson_id": "lesson_001",
      "lesson_title": "Bài 1",
      "lesson_order": 1,
      "scheduled_count": 12,
      "submitted_count": 9,
      "scheduled_students": [
        {
          "student_id": "stu_001",
          "full_name": "Nguyen Van A",
          "email": "a@example.com",
          "scheduled_at": "2026-06-01T08:30:00Z"
        }
      ],
      "submitted_students": [
        {
          "student_id": "stu_001",
          "full_name": "Nguyen Van A",
          "email": "a@example.com",
          "submitted_at": "2026-06-01T09:15:00Z"
        }
      ]
    }
  ]
}
```

## Ghi chú

- `scheduled_students` chỉ gồm các học viên có trạng thái `SCHEDULED`.
- `submitted_students` chỉ gồm các học viên đã nộp bài.
- `lesson_content` hoặc nội dung bài test không cần trả về trong endpoint này.
