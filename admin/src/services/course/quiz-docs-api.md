# Course Quiz API

Base URL: `course/quiz`

**Auth**
- API chỉ dành cho user admin.
- Request cần `Authorization: Bearer <admin_token>`.

## 1) GET `course/quiz`

Lấy toàn bộ danh sách quiz của một course.

**Query**
- `course_id`: string

**Response mong muốn**
```json
{
  "data": [
    {
      "lesson_id": "string",
      "title": "string",
      "overview": "string",
      "type": "QUIZ_ASSIGNMENT",
      "content": {
        "time_limit": 300,
        "questions": [
          {
            "id": "string",
            "question": "string",
            "options": [
              { "id": "string", "text": "string" }
            ],
            "explain": "string",
            "answer": "string"
          }
        ]
      }
    }
  ]
}
```

## 2) POST `course/quiz`

Lưu toàn bộ quiz của course. Khi cập nhật, frontend gửi nguyên JSON đầy đủ dù chỉ sửa 1 câu.

**Body**
```json
{
  "course_id": "string",
  "data": [
    {
      "lesson_id": "string",
      "title": "string",
      "overview": "string",
      "type": "QUIZ_ASSIGNMENT",
      "content": {
        "time_limit": 300,
        "questions": [
          {
            "id": "string",
            "question": "string",
            "options": [
              { "id": "string", "text": "string" }
            ],
            "explain": "string",
            "answer": "string"
          }
        ]
      }
    }
  ]
}
```

**Response mong muốn**
```json
{
  "message": "Quiz saved successfully",
  "data": [
    {
      "lesson_id": "string",
      "title": "string"
    }
  ]
}
```

**Ghi chú**
- `answer` là `id` của option đúng.
- `POST` nên overwrite toàn bộ quiz hiện có của course.
