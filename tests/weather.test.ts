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

    const body = (await res.json()) as { results: Array<{ name: string; country: string }> };
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results.some((c) => c.name.toLowerCase().includes('são paulo') || c.name.toLowerCase().includes('sao paulo'))).toBe(true);
  });

  it('GET /api/v1/weather/search deve encontrar cidades de outros países (ex: Paris, Tóquio)', async () => {
    const res = await app.request('/api/v1/weather/search?q=Paris');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { results: Array<{ name: string; country: string }> };
    expect(body.results.length).toBeGreaterThan(0);
    const paris = body.results.find((c) => c.name.toLowerCase().includes('paris'));
    expect(paris).toBeDefined();
    expect(paris?.country).toBe('França');
  });

  it('fluxo de favoritos: deve adicionar, listar e remover cidades favoritas do usuário', async () => {
    const { sessionService } = await import('../src/server/auth/session.js');
    const mockUser = {
      id: 'usr_fav_tester',
      name: 'Tester Favoritos',
      email: 'favs@climastack.io',
      role: 'user' as const,
      is_blocked: 0,
      password_hash: 'hash:fake',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { token } = await sessionService.createSession(mockUser, { userAgent: 'Vitest', ipAddress: '127.0.0.1' });
    const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1. Adicionar favorito
    const addRes = await app.request('/api/v1/weather/favorites', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        city_name: 'Tóquio',
        state: 'Kanto',
        country: 'Japão',
        latitude: 35.6762,
        longitude: 139.6503,
      }),
    });
    expect(addRes.status).toBe(201);
    const addBody = (await addRes.json()) as { favorite: { id: string; city_name: string } };
    expect(addBody.favorite.city_name).toBe('Tóquio');

    // 2. Listar favoritos
    const listRes = await app.request('/api/v1/weather/favorites', {
      headers: authHeader,
    });
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { favorites: Array<{ id: string; city_name: string }> };
    expect(listBody.favorites.some((f) => f.city_name === 'Tóquio')).toBe(true);

    // 3. Remover favorito
    const delRes = await app.request(`/api/v1/weather/favorites/${addBody.favorite.id}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    expect(delRes.status).toBe(200);
  });
});
