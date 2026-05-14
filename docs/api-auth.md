# 用户认证 API 文档

Base URL: `/api/auth`

---

## 注册账户

### `POST /api/auth/register`

注册新用户账户。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 2-50 字符，仅字母/数字/下划线 |
| email | string | ✅ | 有效邮箱地址 |
| password | string | ✅ | 8-128 字符 |
| referralCode | string | ❌ | 推荐码 |

**Response 201**

```json
{
  "code": 0,
  "message": "created",
  "data": {
    "message": "注册成功，请登录",
    "user": { "id": 1, "username": "tony", "email": "tony@example.com" }
  }
}
```

**错误码**

| code | 说明 |
|------|------|
| 409 | 邮箱或用户名已被注册 |

---

## 用户登录

### `POST /api/auth/login`

登录并获取 Access Token + Refresh Token。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 注册邮箱 |
| password | string | ✅ | 密码 |

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "tony",
      "email": "tony@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

**错误码**

| code | 说明 |
|------|------|
| 401 | 邮箱或密码错误 / 账户被冻结 / 未激活 |

---

## 刷新 Token

### `POST /api/auth/refresh`

用 Refresh Token 换取新的 Access Token + Refresh Token 对。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | ✅ | 登录时获取的 refreshToken |

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

**注意**: 旧 Refresh Token 使用后立即失效，不可重复使用。

---

## 退出登录

### `POST /api/auth/logout`

使当前 Access Token 失效（加入黑名单）。

**Headers**: `Authorization: Bearer <accessToken>`

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": { "message": "已安全退出" }
}
```

---

## 获取当前用户信息

### `GET /api/auth/me`

获取当前登录用户的完整信息。

**Headers**: `Authorization: Bearer <accessToken>`

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "tony",
    "email": "tony@example.com",
    "role": "user",
    "status": "active",
    "balanceCents": 100000,
    "totalBets": 5,
    "totalWonCents": 15000,
    "totalLostCents": 5000,
    "createdAt": "2026-05-08T00:00:00.000Z",
    "lastLoginAt": "2026-05-08T10:00:00.000Z"
  }
}
```

**错误码**

| code | 说明 |
|------|------|
| 401 | 未登录或 Token 已过期 |

---

## 修改密码

### `POST /api/auth/change-password`

已登录用户修改自己的密码。

**Headers**: `Authorization: Bearer <accessToken>`

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currentPassword | string | ✅ | 当前密码 |
| newPassword | string | ✅ | 新密码（8-128 字符） |
| confirmPassword | string | ✅ | 确认新密码 |

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": { "message": "密码修改成功" }
}
```

**错误码**

| code | 说明 |
|------|------|
| 400 | 当前密码错误 / 两次密码不一致 |
| 401 | 未登录 |

---

## 忘记密码

### `POST /api/auth/forgot-password`

请求密码重置链接（发送到邮箱）。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 注册邮箱 |

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "如果该邮箱已注册，我们已发送密码重置链接到您的邮箱"
  }
}
```

**注意**: 为防止邮箱枚举攻击，无论邮箱是否存在都返回相同响应。

**生产环境 TODO**:
- [ ] 生成带时间戳的 reset token（HMAC 签名或数据库记录）
- [ ] 发送含重置链接的邮件（通过 Nodemailer / SendGrid / SES）

---

## 重置密码

### `POST /api/auth/reset-password`

通过邮件中的重置链接设置新密码。

**Request Body**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 注册邮箱 |
| token | string | ✅ | 邮件中的重置 token |
| newPassword | string | ✅ | 新密码（8-128 字符） |
| confirmPassword | string | ✅ | 确认新密码 |

**Response 200**

```json
{
  "code": 0,
  "message": "success",
  "data": { "message": "密码重置成功，请使用新密码登录" }
}
```

**错误码**

| code | 说明 |
|------|------|
| 401 | Token 无效或已过期 |

---

## 认证流程图

```
注册 ──POST /register──→ 创建用户
  │
登录 ──POST /login──→ 返回 accessToken + refreshToken
  │                       │
  │                  本地存储
  │                       │
  ├── GET /me ──────────→ 获取用户信息（需带 Authorization header）
  ├── POST /change-password ──→ 修改密码（需带 Authorization header）
  ├── POST /logout ─────────→ 使 accessToken 失效
  │
  └── Token 过期 ──POST /refresh──→ 获取新 Token 对
```

---

## JWT Token 说明

| Token 类型 | 有效期 | 存储位置 |
|-----------|--------|---------|
| Access Token | 15 分钟 | 前端内存（memory） |
| Refresh Token | 7 天 | 前端安全存储（HttpOnly Cookie / secureStorage） |

**建议的前端存储策略**:
```javascript
// 登录后
localStorage.setItem('refreshToken', data.refreshToken)
sessionStorage.setItem('accessToken', data.accessToken)  // 内存存储

// 请求时
headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken')}` }

// Token 过期时自动刷新
if (response.status === 401) {
  const { accessToken, refreshToken } = await refresh(refreshToken)
  sessionStorage.setItem('accessToken', accessToken)
  // 重试原请求...
}
```

---

## 安全建议

1. **密码强度**: 强制 8+ 字符，支持特殊字符
2. **Rate Limiting**: 建议在 `/login`、`/forgot-password` 端点加限流（5次/分钟）
3. **密码重置 Token**: 生产环境使用 HMAC 签名 token（防篡改）+ 过期时间（1小时）
4. **登录日志**: 建议记录 IP、UA、地理位置用于风控
5. **账户锁定**: 连续 5 次密码错误后锁定 15 分钟
6. **Refresh Token 轮转**: 当前实现使用后立即失效（符合 OAuth 2.0 最佳实践）
