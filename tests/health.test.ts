import { describe, it, expect } from 'vitest';
import app from '../src/server/index.js';

describe('Rotas de Infraestrutura, Roteamento Unificado e Healthcheck', () => {
  it('GET /api/v1/health deve responder 200 OK com status e uptime', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);

    const data = (await res.json()) as { status: string; uptime_seconds: number };
    expect(data.status).toBe('ok');
    expect(typeof data.uptime_seconds).toBe('number');
  });

  it('GET /api/v1/telemetry deve confirmar container único e porta 8080', async () => {
    const res = await app.request('/api/v1/telemetry');
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      status: string;
      app: { single_container: boolean; port: number };
      cloudflare_d1: { mode: string };
      redis: { status: string };
    };

    expect(data.app.single_container).toBe(true);
    expect(data.app.port).toBe(8080);
    expect(data.cloudflare_d1).toBeDefined();
    expect(data.redis).toBeDefined();
  });

  it('rotas inexistentes da API /api/* DEVEM retornar 404 JSON e NUNCA HTML', async () => {
    const res = await app.request('/api/v1/endpoint-inexistente');
    expect(res.status).toBe(404);

    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('application/json');

    const data = (await res.json()) as { error: string };
    expect(data.error).toBeDefined();
    expect(data.error).toContain('não encontrado');
  });

  it('rotas válidas do frontend SPA devem servir index.html com mesma origem', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('ClimaStack');
  });
});
