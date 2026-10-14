import { Hono } from 'hono';

const healthRoutes = new Hono();

/**
 * GET /api/v1/health
 * Healthcheck leve utilizado pelo Docker HEALTHCHECK e orquestradores
 */
healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    pid: process.pid,
  });
});

export { healthRoutes };
