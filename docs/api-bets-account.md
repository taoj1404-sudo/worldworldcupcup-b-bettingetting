# 投注 & 账户 API 文档

## 认证
所有端点（除回调外）均需在请求头携带：
```
Authorization: Bearer <jwt_token>
```

---

## 投注 API

### POST /api/bets — 下注

**请求体：**
```json
{
  "odds_id": 1,
  "selection": "home",
  "amount_cents": 1000,
  "idempotency_key": "bet-20260601-abc123"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| odds_id | number | 赔率记录 ID |
| selection | string | 投注选项：`home` / `draw` / `away` |
| amount_cents | number | 投注金额（单位：分，最小 100） |
| idempotency_key | string | 幂等键，防止重复下注 |

**响应 201：**
```json
{
  "message": "下注成功",
  "bet": {
    "id": 1,
    "selection": "home",
    "odds_snapshot": "1.8500",
    "amount_cents": "1000",
    "potential_payout_cents": "1850",
    "status": "pending",
    "placed_at": "2026-06-01T10:00:00Z"
  },
  "new_balance_cents": 9000
}
```

**幂等处理：** 相同 `idempotency_key` 重复请求返回已有投注记录（HTTP 200）。

---

### GET /api/bets — 投注列表

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| user_id | number | （管理员）指定用户 ID |
| status | string | `pending` / `won` / `lost` / `cancelled` |
| page | number | 页码（默认 1） |
| page_size | number | 每页条数（默认 20，最大 100） |

普通用户只能查询自己的投注记录；管理员可查询所有。

---

### GET /api/bets/[id] — 投注详情

**路径参数：** `id` — 投注记录 ID

返回该注的完整信息，含比赛详情和用户信息。

---

### PATCH /api/bets/[id]/settle — 管理员单注结算

**请求体：**
```json
{ "result": "won" }
```
`result`: `won` | `lost` | `cancelled`

**逻辑：**
- `won` → 按 `potentialPayoutCents` 赔付，余额增加
- `lost` → 不赔付
- `cancelled` → 不赔付

**响应：**
```json
{
  "message": "结算成功",
  "bet_id": 1,
  "status": "won",
  "actual_payout_cents": 1850
}
```

---

### POST /api/bets/settle — 管理员批量结算

**请求体：**
```json
{ "match_id": 1 }
```

按比赛 ID 结算所有 pending 投注（需先确认比赛状态为 `finished`）。

---

## 账户 API

### GET /api/account — 账户信息

返回当前登录用户的余额、统计汇总、近30天投注数据。

---

### POST /api/account/deposit — 申请充值

**请求体：**
```json
{
  "amount_cents": 10000,
  "payment_method": "alipay"
}
```
`payment_method`: `alipay` | `wechat` | `bank`

**响应 201（模拟）：**
```json
{
  "message": "支付订单已创建，请完成支付",
  "order_no": "DEP173568900001234",
  "payment_url": "https://pay.example.com/gateway?order=...",
  "amount_cents": 10000,
  "expires_at": "2026-06-01T10:30:00Z"
}
```

> 实际接入需对接支付宝/微信原生支付接口。

---

### POST /api/account/withdraw — 申请提现

**请求体：**
```json
{
  "amount_cents": 5000,
  "bank_card": "6222021234567890123",
  "real_name": "张三"
}
```

提现申请提交后由管理员审核，审核通过才真正扣款。

---

## 管理员 API

### PATCH /api/account/admin/balance — 手动调整余额

**请求体：**
```json
{
  "user_id": 1,
  "amount_cents": -5000,
  "reason": "用户投诉补偿"
}
```

`amount_cents` 为负数表示扣款，正数表示充值。

---

### GET /api/admin/withdrawals — 提现申请列表

管理员查看所有提现申请（按时间倒序）。

### PATCH /api/admin/withdrawals/[id]?action=approve|reject — 审核提现

| action | 说明 |
|--------|------|
| approve | 批准：真正扣款，打款给用户 |
| reject | 拒绝：恢复流水状态 |

---

## 状态码约定

| HTTP Status | 含义 |
|-------------|------|
| 200 | 成功（查询类 / 幂等重复） |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 / 业务逻辑错误（如余额不足） |
| 401 | 未登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
