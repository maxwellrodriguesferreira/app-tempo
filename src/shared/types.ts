export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_blocked: number | boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface AppEnv {
  Variables: {
    user: UserSanitized;
    session: Session;
    sessionToken: string;
  };
}

export interface UserSanitized {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_blocked: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  user_agent?: string | null;
  ip_address?: string | null;
}

export interface FavoriteLocation {
  id: string;
  user_id: string;
  city_name: string;
  state?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  target_id?: string | null;
  target_type?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface WeatherCurrent {
  temperature: number;
  apparent_temperature: number;
  max_temp: number;
  min_temp: number;
  relative_humidity: number;
  wind_speed: number;
  wind_direction: number;
  wind_direction_cardinal: string;
  uv_index: number;
  surface_pressure: number;
  visibility_km: number;
  air_quality_aqi: number;
  dew_point: number;
  cloud_cover: number;
  precipitation_mm: number;
  condition_code: number;
  condition_text: string;
  condition_icon: string;
}

export interface WeatherHourly {
  time: string;
  hour: string;
  temperature: number;
  precipitation_probability: number;
  condition_icon: string;
}

export interface WeatherDaily {
  date: string;
  day_of_week: string;
  max_temp: number;
  min_temp: number;
  precipitation_sum_mm: number;
  condition_text: string;
  condition_icon: string;
}

export interface WeatherData {
  location: {
    name: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
    elevation_meters?: number;
    station_id?: string;
    timezone: string;
    synchronized_at: string;
  };
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}

export interface TelemetryStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  timestamp: string;
  app: {
    name: string;
    version: string;
    environment: string;
    single_container: boolean;
    port: number;
    memory_usage_mb: number;
  };
  cloudflare_d1: {
    status: 'connected' | 'fallback' | 'disconnected';
    mode: 'worker-proxy' | 'cloudflare-api' | 'sqlite-fallback';
    latency_ms: number;
    database: string;
  };
  redis: {
    status: 'connected' | 'disconnected' | 'disabled';
    latency_ms: number;
    tls: boolean;
    provider: string;
    rate_limiter_active: boolean;
  };
}
