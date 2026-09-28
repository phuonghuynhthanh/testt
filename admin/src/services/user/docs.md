# QuantVN User Tracking APIs

This document describes the API shape needed to build the admin user-tracking feature for the main frontend source at `frontend/`.

## Goal

# Auth
- Just admin user can call api

The admin page needs to:

1. List users from QuantVN frontend accounts.
2. Open a user detail page from each row.
3. Show strategy count, strategy list, strategy status, and paper trading time.
4. Export the loaded data as CSV.

## API conventions used in this project

- Use `getAxiosClient()` for all requests.
- Use `API_SERVICES` as the base URL.
- Send auth context through the existing client setup.
- Use query strings for `GET` filters.
- Use JSON bodies for `POST`, `PUT`, and `DELETE`.

## 1. List users

### `GET /users`

Returns the user list used by the admin table.

### Query params

- `keyword?: string` - search by name, email, or user id
- `page?: number`
- `limit?: number`
- `sort_by?: string`
- `sort_order?: "asc" | "desc"`

### Response

```ts
interface UserListResponse {
  data: UserListItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface UserListItem {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_first_login: boolean;
  subscription_plan: string;
  registration_plan_date: string;
  plan_expire_date: string;
  paper_trading_bot_limit: number;
  strategy_count?: number;
}
```

### Notes

- `strategy_count` can be returned directly if available.
- If not available, the admin page can compute it from the strategy list endpoint below.

## 2. User detail

### `GET /user/profile?user_id={userId}`

Existing frontend endpoint. Use it to open the detail page for one user.

### Query params

- `user_id: string`

### Response

```ts
interface UserProfileResponse {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_first_login: boolean;
  subscription_package: string;
  subscription_plan: string;
  registration_plan_date: string;
  plan_expire_date: string;
  paper_trading_bot_limit: number;
  user_profile: {
    display_name: string;
    avatar: string;
    sdt: string;
    hoTen: string;
    quocGia: string;
    is_public: boolean;
  };
}
```

### Notes

- This endpoint is enough for the user header and identity data on the detail page.
- Keep the response shape compatible with the existing `IUser` type in `frontend/src/types/user.ts`.

## 3. User strategies list

### `GET /bots?user_id={userId}`

This is the key endpoint for the new user detail view.
It should return the strategies created by the selected user.

The frontend already uses `GET /bots` for bot lists, so the safest extension is to support an optional `user_id` filter on the same route.

### Query params

- `user_id: string`
- `market?: "VN_STOCK" | "CRYPTO" | "POLYMARKET"`
- `is_public?: boolean`
- `outstanding?: boolean`

### Response

```ts
interface UserStrategyListResponse {
  data: UserStrategyItem[];
}

interface UserStrategyItem {
  bot_id: string;
  bot_name: string;
  user_id: string;
  creator_name: string;
  asset: string;
  asset_type: string;
  market: string;
  is_public: boolean;
  is_paper_trading: boolean;
  created_at: string;
  run_at: string;
  paper_trading_run_at: string;
  paper_trade_first_order: string;
  filename?: string;
}
```

### Required fields for the detail page

- `bot_id`
- `bot_name`
- `is_paper_trading`
- `paper_trading_run_at`
- `paper_trade_first_order`
- `created_at`
- `market`
- `asset`

### Notes

- `paper_trading_run_at` is the main field for showing paper trading time.
- `paper_trade_first_order` is useful for status display.
- `is_paper_trading` is enough to distinguish active paper trading strategies from non-paper-trading ones.

## 4. Optional strategy detail

### `GET /bot?bot_id={botId}&market={market}`

Use this only if the user detail page needs to open a specific strategy in a deeper view.
It is already used in the frontend bot detail flow.

### Query params

- `bot_id: string`
- `market: string`

### Response

Reuse the existing `IBotPerformance` / `IBotInfoDetail` style response already used in `frontend/src/services/bot/handleLeaderBoard.ts` and `frontend/src/services/bot/handleBot.ts`.

## 5. Optional paper trading log

### `GET /bot/paper-trading?bot_id={botId}`

Use this only if the user detail page wants to show the full paper-trading history for one strategy.

### Query params

- `bot_id: string`

### Response

```ts
interface PaperTradingHistoryItem {
  time: string;
  price_close: number;
  position: number;
  position_diff: number;
}
```

## 6. CSV export

No separate API is required for CSV export.

The admin page should:

- load the user list from `/users`
- load the user strategy list from `/bots?user_id=...`
- build CSV data on the client

### Suggested CSV columns for user list

- `user_id`
- `name`
- `email`
- `subscription_plan`
- `registration_plan_date`
- `plan_expire_date`
- `paper_trading_bot_limit`
- `strategy_count`

### Suggested CSV columns for strategy list

- `bot_id`
- `bot_name`
- `market`
- `asset`
- `is_paper_trading`
- `paper_trading_run_at`
- `paper_trade_first_order`
- `created_at`

## Minimal implementation set

If the backend only adds one new thing, add `GET /bots?user_id=...` first.
That endpoint is enough to support:

- user detail navigation
- strategy count
- strategy list
- paper trading time display
- CSV export from loaded data
