import { describe, it, expect } from 'vitest';
import app from '../src/server/index.js';
import { WeatherData } from '../src/shared/types.js';

describe('Rotas de Previsão Meteorológica', () => {
  it('GET /api/v1/weather/current deve retornar telemetria meteorológica completa', async () => {
    const res = await app.request('/api/v1/weather/current?city=Curitiba');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: WeatherData; source: string };
    expect(body.data).toBeDefined();
    expect(body.data.location.name).toBe('Curitiba');
    expect(body.data.current.temperature).toBeTypeOf('number');
    expect(body.data.current.relative_humidity).toBeTypeOf('number');
    expect(body.data.hourly.length).toBeGreaterThan(0);
    expect(body.data.daily.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/weather/search deve responder lista de cidades para autocompletar', async () => {
    const res = await app.request('/api/v1/weather/search?q=Sao');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { results: unknown[] };
    expect(Array.isArray(body.results)).toBe(true);
  });
});
