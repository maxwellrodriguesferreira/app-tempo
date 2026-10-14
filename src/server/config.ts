import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  APP_BASE_URL: z.string().url().default('http://localhost:8080'),

  // Cloudflare D1 integration
  D1_API_URL: z.string().url().optional(),
  D1_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_D1_DATABASE_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // Redis remote
  REDIS_URL: z.string().optional(),
  REDIS_TLS_ENABLED: z.coerce.boolean().default(false),
  REDIS_MAX_RETRIES_PER_REQUEST: z.coerce.number().default(2),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().default(4000),

  // Security & Sessions
  SESSION_SECRET: z.string().min(16).default('insecure-dev-session-secret-change-in-prod-32-chars'),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400), // 24 horas

  // Rate Limiting (Brute-Force Protection)
  RATE_LIMIT_LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_LOCKOUT_SECONDS: z.coerce.number().default(900), // 15 minutos

  // Weather API
  WEATHER_PROVIDER: z.enum(['open-meteo', 'openweathermap']).default('open-meteo'),
  WEATHER_API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error('❌ Falha na validação das variáveis de ambiente:\n' + errorDetails);
    // Em produção, se faltar variável obrigatória, falha imediatamente
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // Em desenvolvimento, continua com valores padrão
    return envSchema.parse({
      ...process.env,
      SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-minimum-sixteen-chars-long',
    });
  }

  return result.data;
}

export const config = loadConfig();

/**
 * Sanitiza URLs e credenciais para logs seguros (sem vazar senhas, tokens ou redis passwords)
 */
export function sanitizeForLogs(value?: string | null): string {
  if (!value) return '(não configurado)';
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    if (value.length > 8) {
      return `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
    }
    return '***';
  }
}
