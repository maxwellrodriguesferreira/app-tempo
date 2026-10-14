import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/server/index.js';
import { db } from '../src/server/db/adapter.js';
import { sessionService } from '../src/server/auth/session.js';
import { hashPassword } from '../src/server/auth/password.js';
import { User } from '../src/shared/types.js';

describe('CRUD de Usuários & Controle de Aprovação (IAM)', () => {
  let adminToken: string;
  let adminUser: User;

  beforeAll(async () => {
    // Cria um administrador para os testes de gerenciamento
    const now = new Date().toISOString();
    const hash = await hashPassword('AdminPass2026!');
    adminUser = {
      id: 'usr_admin_test_iam',
      name: 'Super Administrador',
      email: 'admin.iam@climastack.io',
      password_hash: hash,
      role: 'admin',
      is_blocked: 0,
      is_approved: 1,
      created_at: now,
      updated_at: now,
      last_login_at: now,
    };

    await db.execute(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, role, is_blocked, is_approved, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminUser.id,
        adminUser.name,
        adminUser.email,
        adminUser.password_hash,
        adminUser.role,
        adminUser.is_blocked,
        adminUser.is_approved,
        adminUser.created_at,
        adminUser.updated_at,
        adminUser.last_login_at,
      ]
    );

    const { token } = await sessionService.createSession(adminUser, {
      userAgent: 'IAM Test Agent',
      ipAddress: '127.0.0.1',
    });
    adminToken = token;
  });

  it('deve obter estatísticas do sistema com pendingApproval', async () => {
    const res = await app.request('/api/v1/users/stats', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalUsers: number;
      adminUsers: number;
      blockedUsers: number;
      pendingApproval: number;
      activeToday: number;
    };

    expect(body.totalUsers).toBeGreaterThanOrEqual(1);
    expect(body.adminUsers).toBeGreaterThanOrEqual(1);
    expect(typeof body.pendingApproval).toBe('number');
  });

  it('deve cadastrar um novo usuário pelo admin (POST /api/v1/users)', async () => {
    const res = await app.request('/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Carlos Meteorologista',
        email: 'carlos.meteo@climastack.io',
        password: 'ValidPassword2026!',
        role: 'user',
        is_approved: false,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string; user: { id: string; email: string; is_approved: boolean } };
    expect(body.user.email).toBe('carlos.meteo@climastack.io');
    expect(body.user.is_approved).toBe(false);
  });

  it('deve impedir login de usuário não aprovado (403 pending_approval)', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'carlos.meteo@climastack.io',
        password: 'ValidPassword2026!',
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { pending_approval?: boolean; error: string };
    expect(body.pending_approval).toBe(true);
  });

  it('deve aprovar o usuário via admin (PATCH /api/v1/users/:id/approve)', async () => {
    const userInDb = await db.queryFirst<User>(`SELECT id FROM users WHERE email = ?`, [
      'carlos.meteo@climastack.io',
    ]);
    expect(userInDb).not.toBeNull();

    const res = await app.request(`/api/v1/users/${userInDb!.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        is_approved: true,
        reason: 'Aprovado para equipe de pesquisa',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string; is_approved: boolean };
    expect(body.is_approved).toBe(true);

    // Agora o login deve ter sucesso
    const loginRes = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'carlos.meteo@climastack.io',
        password: 'ValidPassword2026!',
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as { token: string; user: { email: string } };
    expect(loginBody.token).toBeDefined();
    expect(loginBody.user.email).toBe('carlos.meteo@climastack.io');
  });

  it('deve atualizar atributos do usuário via admin (PATCH /api/v1/users/:id)', async () => {
    const userInDb = await db.queryFirst<User>(`SELECT id FROM users WHERE email = ?`, [
      'carlos.meteo@climastack.io',
    ]);

    const res = await app.request(`/api/v1/users/${userInDb!.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Carlos E. Meteorologista Chefe',
        role: 'user',
        is_blocked: false,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { name: string } };
    expect(body.user.name).toBe('Carlos E. Meteorologista Chefe');
  });

  it('deve filtrar usuários por status de aprovação (GET /api/v1/users?status=approved)', async () => {
    const res = await app.request('/api/v1/users?status=approved', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: Array<{ is_approved: boolean }> };
    expect(body.users.every((u) => u.is_approved)).toBe(true);
  });

  it('deve excluir o usuário via admin (DELETE /api/v1/users/:id)', async () => {
    const userInDb = await db.queryFirst<User>(`SELECT id FROM users WHERE email = ?`, [
      'carlos.meteo@climastack.io',
    ]);

    const res = await app.request(`/api/v1/users/${userInDb!.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);

    const check = await db.queryFirst<User>(`SELECT id FROM users WHERE id = ?`, [userInDb!.id]);
    expect(check).toBeNull();
  });

  it('deve impedir que o administrador exclua a si mesmo', async () => {
    const res = await app.request(`/api/v1/users/${adminUser.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('sua própria conta');
  });
});
