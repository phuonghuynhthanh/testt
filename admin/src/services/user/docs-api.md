# `GET /admin/user/performance`

API này dành cho admin để xem performance của 1 bot theo `user_id` + `bot_id`, đồng thời trả luôn source strategy lấy từ S3.

## Query params

- `user_id` - bắt buộc, user owner của bot
- `bot_id` - bắt buộc, id của bot
- `market` - không bắt buộc, mặc định `VN_STOCK`

Giá trị `market` hỗ trợ:

- `VN_STOCK`
- `CRYPTO`

## Auth

- Cần `bearerAuth`
- Chỉ user admin mới được gọi

## Response structure

Response trả về cùng envelope performance như `/bot/performance`, và thêm 1 field về strategy:

```json
{
  "historical": {},
  "outsample": {},
  "papertrading": {},
  "total_data": {},
  "asset": "VN30F1M",
  "creator_name": "Nguyen Van A",
  "bot_name": "Mean Reversion",
  "run_at": "2026-05-20 10:00:00",
  "paper_trading_run_at": "2026-05-21 10:00:00",
  "paper_trade_first_order": "2026-05-21 10:05:00",
  "bot_id": "bot_001",
  "user_id": "user_001",
  "is_paper_trading": true,
  "created_at": "2026-05-20T10:00:00",
  "market": "VN_STOCK",
  "is_public": false,
  "history_paper_trading": [],
  "strategy_code": "def gen_position(df):\n    return df"
}
```

## Field notes

- `strategy_code`: nội dung source code đọc trực tiếp từ S3
- Nếu bot chưa có strategy file hoặc S3 không đọc được, field này có thể `null`

## Response fields

- `historical`
- `outsample`
- `papertrading`
- `total_data`
- `asset`
- `creator_name`
- `bot_name`
- `run_at`
- `paper_trading_run_at`
- `paper_trade_first_order`
- `bot_id`
- `user_id`
- `is_paper_trading`
- `created_at`
- `market`
- `is_public`
- `history_paper_trading`
- `strategy_code`

## Error cases

- `400` - thiếu `user_id` hoặc `bot_id`
- `401` - token không hợp lệ / chưa đăng nhập
- `403` - user hiện tại không phải admin
- `404` - không tìm thấy bot
