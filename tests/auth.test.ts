import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword } from '../src/server/auth/password.js';
import { sessionService } from '../src/server/auth/session.js';
import { User } from '../src/shared/types.js';

describe('Camada de Autenticação & Hashing', () => {
  it('deve gerar hash scrypt com salt e verificar senha correta', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt.length).toBe(32); // 16 bytes em hex
    expect(key.length).toBe(128); // 64 bytes em hex

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('deve criar, validar e revogar sessão persistida', async () => {
    const mockUser: User = {
      id: 'usr_test_123',
      name: 'Engenheiro Teste',
      email: 'teste@climastack.io',
      password_hash: 'hash:fake',
      role: 'admin',
      is_blocked: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null,
    };

    const { token, session } = await sessionService.createSession(mockUser, {
      userAgent: 'Vitest Agent',
      ipAddress: '127.0.0.1',
    });

    expect(token).toBeDefined();
    expect(session.user_id).toBe(mockUser.id);

    // Validação
    const validated = await sessionService.validateSession(token);
    expect(validated).not.toBeNull();
    expect(validated?.user.email).toBe(mockUser.email);
    expect(validated?.user.role).toBe('admin');

    // Revogação
    await sessionService.revokeSession(token);
    const afterRevoke = await sessionService.validateSession(token);
    expect(afterRevoke).toBeNull();
  });
});
