/**
 * 轻量 API 客户端（前端专用）
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  authenticated?: boolean
}

// API 统一响应格式
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: number = 0
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    authenticated = false,
  } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (authenticated) {
    const token = sessionStorage.getItem('accessToken')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  console.log('[API]', method, endpoint, body ? `body: ${JSON.stringify(body)}` : '')

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()
  console.log('[API Response]', endpoint, json)

  if (json.code !== 0) {
    throw new ApiError(json.message || '请求失败', json.code)
  }

  return json.data as T
}

// ─── 认证 API ─────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiClient('/api/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiClient<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/auth/login', { method: 'POST', body: data }
    ),

  refresh: (refreshToken: string) =>
    apiClient<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/auth/refresh', { method: 'POST', body: { refreshToken } }
    ),

  logout: () =>
    apiClient('/api/auth/logout', { method: 'POST', authenticated: true }),

  me: () =>
    apiClient<User>('/api/auth/me', { authenticated: true }),
}

// ─── 比赛 API ─────────────────────────────────────────────────────────
export const matchesApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.page)  sp.set('page', String(params.page))
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize))
    const qs = sp.toString()
    return apiClient<{ matches: Match[]; pagination?: any }>(`/api/matches${qs ? `?${qs}` : ''}`)
  },

  get: (id: number) =>
    apiClient<Match>(`/api/matches/${id}`),
}

// ─── 投注 API ─────────────────────────────────────────────────────────
export const betsApi = {
  place: (data: { matchId: number; oddsId: number; amountCents: number; selection: string }) =>
    apiClient<BetResult>('/api/bets', { method: 'POST', body: data, authenticated: true }),

  list: (params?: { page?: number; pageSize?: number; status?: string }) => {
    const sp = new URLSearchParams()
    if (params?.page)     sp.set('page', String(params.page))
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize))
    if (params?.status)   sp.set('status', params.status)
    const qs = sp.toString()
    return apiClient<{ bets: Bet[]; total: number }>(`/api/bets${qs ? `?${qs}` : ''}`, { authenticated: true })
  },
}

// ─── 账户 API ─────────────────────────────────────────────────────────
export const accountApi = {
  stats: () => apiClient<AccountStats>('/api/account', { authenticated: true }),
  deposit: (amountCents: number) =>
    apiClient<{ amountCents: number; newBalance: number }>(
      '/api/account/deposit', { method: 'POST', body: { amountCents }, authenticated: true }
    ),
  withdraw: (amountCents: number) =>
    apiClient('/api/account/withdraw', { method: 'POST', body: { amountCents }, authenticated: true }),
}

// ─── 类型 ─────────────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
  status: string
  balanceCents: number
  totalBets: number
  totalWonCents: number
  totalLostCents: number
  createdAt: string
  lastLoginAt: string | null
}

export interface Match {
  id: number
  homeTeamName: string
  awayTeamName: string
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number | null
  awayScore: number | null
  halfHomeScore?: number | null
  halfAwayScore?: number | null
  startAt: string
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed'
  stage?: string
  homeOdds?: Record<string, number>
  awayOdds?: Record<string, number>
  drawOdds?: Record<string, number>
}

export interface Bet {
  id: number
  matchId: number
  amountCents: number
  oddsSnapshot: number
  potentialPayoutCents: number
  actualPayoutCents?: number
  status: string
  selection: string
  placedAt: string
  settledAt?: string
  match?: Match
}

export interface BetResult {
  id: number
  amountCents: number
  oddsSnapshot: number
  potentialPayoutCents: number
  balanceCents: number
}

export interface AccountStats {
  balanceCents: number
  totalDeposited: number
  totalBets: number
  totalWonCents: number
  totalLostCents: number
}

// ─── 管理员 API ─────────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () =>
    apiClient<DashboardData>('/api/admin/dashboard', { authenticated: true }),

  users: {
    list: (params?: { page?: number; page_size?: number; status?: string; role?: string; search?: string }) => {
      const sp = new URLSearchParams()
      if (params?.page) sp.set('page', String(params.page))
      if (params?.page_size) sp.set('page_size', String(params.page_size))
      if (params?.status) sp.set('status', params.status)
      if (params?.role) sp.set('role', params.role)
      if (params?.search) sp.set('search', params.search)
      const qs = sp.toString()
      return apiClient<AdminUserList>('/api/admin/users' + (qs ? `?${qs}` : ''), { authenticated: true })
    },
    get: (id: number) => apiClient<AdminUserDetail>(`/api/admin/users/${id}`, { authenticated: true }),
    update: (id: number, data: { status?: string; role?: string }) =>
      apiClient(`/api/admin/users/${id}`, { method: 'PATCH', body: data, authenticated: true }),
  },

  bets: {
    list: (params?: { page?: number; page_size?: number; status?: string; user_id?: number; match_id?: number }) => {
      const sp = new URLSearchParams()
      if (params?.page) sp.set('page', String(params.page))
      if (params?.page_size) sp.set('page_size', String(params.page_size))
      if (params?.status) sp.set('status', params.status)
      if (params?.user_id) sp.set('user_id', String(params.user_id))
      if (params?.match_id) sp.set('match_id', String(params.match_id))
      const qs = sp.toString()
      return apiClient<AdminBetList>('/api/admin/bets' + (qs ? `?${qs}` : ''), { authenticated: true })
    },
    settle: (matchId: number, resultsMap?: Record<string, string>) =>
      apiClient<{ message: string; settled_count: number }>('/api/bets/settle', {
        method: 'POST',
        body: { match_id: matchId, resultsMap },
        authenticated: true,
      }),
    settleSingle: (id: number, result: string, actualPayoutCents?: number) =>
      apiClient(`/api/bets/${id}/settle`, {
        method: 'PATCH',
        body: { result, actualPayoutCents },
        authenticated: true,
      }),
  },

  withdrawals: {
    list: (params?: { page?: number; page_size?: number }) => {
      const sp = new URLSearchParams()
      if (params?.page) sp.set('page', String(params.page))
      if (params?.page_size) sp.set('page_size', String(params.page_size))
      const qs = sp.toString()
      return apiClient(`/api/admin/withdrawals` + (qs ? `?${qs}` : ''), { authenticated: true })
    },
    approve: (id: number) =>
      apiClient(`/api/admin/withdrawals/${id}?action=approve`, { method: 'PATCH', authenticated: true }),
    reject: (id: number) =>
      apiClient(`/api/admin/withdrawals/${id}?action=reject`, { method: 'PATCH', authenticated: true }),
  },

  payments: {
    list: (params?: {
      page?: number; page_size?: number; direction?: string; status?: string; from?: string; to?: string
    }) => {
      const sp = new URLSearchParams()
      if (params?.page) sp.set('page', String(params.page))
      if (params?.page_size) sp.set('page_size', String(params.page_size))
      if (params?.direction) sp.set('direction', params.direction)
      if (params?.status) sp.set('status', params.status)
      if (params?.from) sp.set('from', params.from)
      if (params?.to) sp.set('to', params.to)
      const qs = sp.toString()
      return apiClient<AdminPaymentList>('/api/admin/payments' + (qs ? `?${qs}` : ''), { authenticated: true })
    },
  },

  oddsHistory: (params?: { page?: number; page_size?: number; match_id?: number }) => {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    if (params?.match_id) sp.set('match_id', String(params.match_id))
    const qs = sp.toString()
    return apiClient('/api/admin/odds/history' + (qs ? `?${qs}` : ''), { authenticated: true })
  },

  adjustBalance: (userId: number, amountCents: number, reason: string) =>
    apiClient('/api/account/admin/balance', {
      method: 'PATCH',
      body: { user_id: userId, amount_cents: amountCents, reason },
      authenticated: true,
    }),
}

// ─── 管理员类型 ──────────────────────────────────────────────────────────
export interface DashboardData {
  stats: {
    totalUsers: number
    activeUsers: number
    totalBets: number
    pendingBets: number
    pendingWithdrawals: number
    todayDepositsCents: number
    todayWithdrawalsCents: number
    platformProfitCents: number
  }
  recentBets: Array<{
    id: number; username: string; amountCents: number | string; oddsSnapshot: number | string
    potentialPayoutCents: number | string; status: string; placedAt: string
  }>
  pendingSettleMatches: Array<{
    id: number; teamHome: string; teamAway: string; scoreHome: number; scoreAway: number
    status: string; scheduledAt: string; pendingBetCount: number
  }>
  matchStats: Record<string, number>
}

export interface AdminUserList {
  users: Array<{
    id: number; username: string; email: string; role: string; status: string
    balanceCents: number; totalBets: number; totalWonCents: number; totalLostCents: number
    createdAt: string; lastLoginAt: string | null
  }>
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface AdminUserDetail {
  user: {
    id: number; username: string; email: string; role: string; status: string
    balanceCents: number; totalBets: number; totalWonCents: number; totalLostCents: number
    phone: string | null; isPhoneVerified: boolean; createdAt: string; lastLoginAt: string | null
  }
  betStats: {
    totalBetCount: number; totalBetAmount: number
    pendingBets: number; wonBets: number; lostBets: number
  }
  recentTransactions: Array<{
    id: number; type: string; status: string; amountCents: number
    balanceBeforeCents: number; balanceAfterCents: number; remark: string | null; createdAt: string
  }>
}

export interface AdminBetList {
  bets: Array<{
    id: number; username: string; email: string; teamHome: string; teamAway: string
    scoreHome: number; scoreAway: number; matchStatus: string; selection: string
    oddsSnapshot: number; amountCents: number; potentialPayoutCents: number
    actualPayoutCents: number | null; status: string; placedAt: string; settledAt: string | null
    betTypeName: string | null
  }>
  summary: { totalAmountCents: number; totalPayoutCents: number }
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface AdminPaymentList {
  payments: Array<{
    id: number; username: string; email: string; type: string; status: string
    amountCents: number; balanceBeforeCents: number; balanceAfterCents: number
    remark: string | null; externalOrderId: string | null; createdAt: string
  }>
  summary: {
    totalDepositCents: number; totalWithdrawCents: number; pendingWithdrawCents: number
  }
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}
