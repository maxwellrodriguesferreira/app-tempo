import {
  UserSanitized,
  WeatherData,
  FavoriteLocation,
  AuditLog,
  TelemetryStatus,
} from '../../shared/types.js';

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('climastack_token');
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // envia cookies de sessão
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (typeof data === 'object' && data !== null && 'error' in data ? (data as { error: string }).error : null) ||
      `Erro na requisição: ${response.statusText}`;
    throw new ApiError(response.status, errorMsg, typeof data === 'object' ? data : {});
  }

  return data as T;
}

export const api = {
  // Autenticação
  login: (credentials: { email: string; password: string }) =>
    request<{ user: UserSanitized; token: string; expires_at: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload: { name: string; email: string; password: string }) =>
    request<{ user: UserSanitized; token: string; expires_at: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<{ user: UserSanitized }>('/api/v1/auth/me'),

  // Previsão do tempo
  getWeather: (params?: { city?: string; lat?: number; lon?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.city) searchParams.set('city', params.city);
    if (params?.lat !== undefined) searchParams.set('lat', String(params.lat));
    if (params?.lon !== undefined) searchParams.set('lon', String(params.lon));
    const qs = searchParams.toString();
    return request<{ data: WeatherData; source: string }>(`/api/v1/weather/current${qs ? '?' + qs : ''}`);
  },

  searchCities: (query: string) =>
    request<{ results: Array<{ id: number; name: string; state: string; country: string; latitude: number; longitude: number }> }>(
      `/api/v1/weather/search?q=${encodeURIComponent(query)}`
    ),

  getFavorites: () => request<{ favorites: FavoriteLocation[] }>('/api/v1/weather/favorites'),

  addFavorite: (data: { city_name: string; state?: string; country: string; latitude: number; longitude: number }) =>
    request<{ message: string; favorite: FavoriteLocation }>('/api/v1/weather/favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeFavorite: (id: string) =>
    request<{ message: string }>(`/api/v1/weather/favorites/${id}`, {
      method: 'DELETE',
    }),

  // Usuários & IAM
  getUsers: (filters?: { search?: string; role?: string }) => {
    const sp = new URLSearchParams();
    if (filters?.search) sp.set('search', filters.search);
    if (filters?.role) sp.set('role', filters.role);
    const qs = sp.toString();
    return request<{ users: UserSanitized[]; total: number }>(`/api/v1/users${qs ? '?' + qs : ''}`);
  },

  getUserStats: () =>
    request<{ totalUsers: number; adminUsers: number; blockedUsers: number; activeToday: number }>(
      '/api/v1/users/stats'
    ),

  updateUserRole: (id: string, role: 'admin' | 'user') =>
    request<{ message: string; user_id: string; new_role: string }>(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  toggleBlockUser: (id: string, is_blocked: boolean, reason?: string) =>
    request<{ message: string; user_id: string; is_blocked: boolean }>(`/api/v1/users/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blocked, reason }),
    }),

  getAuditLogs: () => request<{ logs: AuditLog[] }>('/api/v1/users/audit-logs'),

  // Telemetria e Saúde
  getTelemetry: () => request<TelemetryStatus>('/api/v1/telemetry'),
  getHealth: () => request<{ status: string; uptime_seconds: number }>('/api/v1/health'),
};
