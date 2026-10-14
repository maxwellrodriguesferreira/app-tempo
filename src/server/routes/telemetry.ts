import { Hono } from 'hono';
import { db } from '../db/adapter.js';
import { redis } from '../redis/client.js';
import { config } from '../config.js';
import { TelemetryStatus } from '../../shared/types.js';

const telemetryRoutes = new Hono();

/**
 * GET /api/v1/telemetry
 * Telemetria completa em tempo real para a tela "Infraestrutura & Logs"
 */
telemetryRoutes.get('/', async (c) => {
  const d1Health = await db.checkHealth();
  const redisHealth = await redis.checkHealth();
  const mem = process.memoryUsage();

  const isHealthy = d1Health.ok && (redisHealth.status === 'connected' || redisHealth.status === 'disabled');

  const telemetry: TelemetryStatus = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    app: {
      name: 'Weather Hub / ClimaStack Core',
      version: '3.4.0-enterprise',
      environment: config.NODE_ENV,
      single_container: true,
      port: config.PORT,
      memory_usage_mb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
    },
    cloudflare_d1: {
      status: d1Health.ok ? (d1Health.mode === 'sqlite-fallback' ? 'fallback' : 'connected') : 'disconnected',
      mode: d1Health.mode as 'worker-proxy' | 'cloudflare-api' | 'sqlite-fallback',
      latency_ms: d1Health.latencyMs,
      database: d1Health.details || 'D1 Telemetry Cluster',
    },
    redis: {
      status: redisHealth.status,
      latency_ms: redisHealth.latencyMs,
      tls: redisHealth.tls,
      provider: redisHealth.provider,
      rate_limiter_active: true,
    },
  };

  return c.json(telemetry);
});

export { telemetryRoutes };
