# 比赛 & 赔率 API 文档

> Base URL: `http://localhost:3000/api`
> 认证：`Authorization: Bearer <token>`（管理员接口必须携带）

---

## 认证说明

| 接口类型 | 是否需要 Token | 说明 |
|---------|--------------|------|
| 公开查询接口 | ❌ 不需要 | GET 查询类接口均为公开 |
| 管理员写入接口 | ✅ 需要 Admin Token | POST/PATCH 需要 role=admin |

---

## 比赛管理

### GET /api/matches
查询比赛列表（支持状态/阶段/时间过滤）

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | scheduled \| live \| finished \| cancelled \| postponed |
| stage | string | group_a ~ group_h \| round_of_16 \| ... \| final |
| from | ISO8601 | 开赛时间起始 |
| to | ISO8601 | 开赛时间截止 |
| page | number | 页码，默认 1 |
| pageSize | number | 每页数量，默认 20，最大 100 |

**成功响应 200**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "matches": [...],
    "grouped": {
      "live": [...],
      "scheduled": [...],
      "finished": [...]
    },
    "pagination": { "page": 1, "pageSize": 20, "total": 5 }
  }
}
```

---

### POST /api/matches 🔒 Admin
创建比赛

**Request Body**
```json
{
  "teamHome": "巴西",
  "teamAway": "塞尔维亚",
  "teamHomeCode": "BRA",
  "teamAwayCode": "SRB",
  "stage": "group_a",
  "venue": "阿兹特克球场",
  "city": "墨西哥城",
  "country": "墨西哥",
  "scheduledAt": "2026-06-11T20:00:00-06:00",
  "bettingClosesAt": "2026-06-11T19:00:00-06:00"
}
```

**成功响应 201**
```json
{
  "code": 0,
  "message": "比赛创建成功",
  "data": { "id": 1, "teamHome": "巴西", ... }
}
```

---

### GET /api/matches/:id
查询单场比赛详情（含按类型分组的赔率）

**成功响应 200**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "match": { "id": 1, "teamHome": "巴西", "scoreHome": null, ... },
    "odds": {
      "1": [
        { "id": 1, "option": "home", "optionLabel": "主胜", "value": "1.8500" },
        { "id": 2, "option": "draw", "optionLabel": "平局", "value": "3.4000" },
        { "id": 3, "option": "away", "optionLabel": "客胜", "value": "4.2000" }
      ]
    }
  }
}
```

---

### PATCH /api/matches/:id/score 🔒 Admin
更新比赛比分（仅进行中比赛可更新）

**Request Body**
```json
{
  "scoreHome": 2,
  "scoreAway": 1,
  "halfScoreHome": 1,
  "halfScoreAway": 0,
  "matchMinute": 67
}
```

**业务校验**
- 比赛状态必须为 `live`，否则返回 400

---

### PATCH /api/matches/:id/status 🔒 Admin
更新比赛状态

**Request Body**
```json
{
  "status": "live",
  "notes": "比赛准时开始"
}
```

**允许的状态流转**

```
scheduled → live         ★ 副作用：锁定赔率（关闭投注）
scheduled → cancelled    ★ 副作用：退还所有待结算投注（TODO）
scheduled → postponed
postponed → scheduled
postponed → cancelled
live      → finished     ★ 副作用：触发自动结算（TODO）
live      → cancelled
```

---

## 赔率管理

### GET /api/odds?matchId=:id
查询某场比赛的所有赔率（按投注类型分组）

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| matchId | number | ✅ | 比赛 ID |

**成功响应 200**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "matchId": 1,
    "match": { ... },
    "oddsByType": {
      "1": [
        { "id": 1, "option": "home", "optionLabel": "主胜", "value": "1.8500", "status": "active" },
        { "id": 2, "option": "draw", "optionLabel": "平局", "value": "3.4000", "status": "active" },
        { "id": 3, "option": "away", "optionLabel": "客胜", "value": "4.2000", "status": "active" }
      ],
      "2": [...]
    },
    "total": 6
  }
}
```

---

### POST /api/odds 🔒 Admin
批量创建赔率

**Request Body**
```json
{
  "matchId": 1,
  "items": [
    { "betTypeId": 1, "option": "home", "optionLabel": "主胜", "value": "1.8500" },
    { "betTypeId": 1, "option": "draw", "optionLabel": "平局", "value": "3.4000" },
    { "betTypeId": 1, "option": "away", "optionLabel": "客胜", "value": "4.2000" },
    { "betTypeId": 3, "option": "over", "optionLabel": "大球", "value": "1.9500", "line": "2.5" },
    { "betTypeId": 3, "option": "under", "optionLabel": "小球", "value": "1.9000", "line": "2.5" }
  ]
}
```

**业务校验**
- 赔率值 >= 1.01，<= 1000
- 比赛状态不能为 finished 或 cancelled

---

### GET /api/odds/:id
查询单条赔率详情

---

### PATCH /api/odds/:id 🔒 Admin
更新赔率值（自动记录变更历史）

**Request Body**
```json
{
  "value": "2.1000",
  "reason": "主力前锋伤退，调整主胜赔率"
}
```

**业务校验**
- 赔率已锁定（`isLocked=true`，比赛开始后）则拒绝修改
- 赔率状态为 closed 则拒绝修改

---

### PATCH /api/odds/:id/suspend 🔒 Admin
暂停/恢复单条赔率

**Request Body**
```json
{ "suspend": true }
```

---

## 错误码说明

| HTTP Status | code | 说明 |
|-------------|------|------|
| 200 | 0 | 成功 |
| 201 | 0 | 创建成功 |
| 400 | 400 | 请求参数错误 / 业务校验失败 |
| 401 | 401 | 未登录或 Token 过期 |
| 403 | 403 | 权限不足（需要管理员） |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 数据冲突（如重复创建） |
| 422 | 422 | 数据格式正确但无法处理 |
| 429 | 429 | 请求频率过高 |
| 500 | 500 | 服务器内部错误 |

---

## 统一响应格式

```typescript
type ApiResponse<T> = {
  code: number    // 0 = 成功，非 0 = 错误
  message: string // 提示信息
  data: T | null  // 响应数据
}
```
