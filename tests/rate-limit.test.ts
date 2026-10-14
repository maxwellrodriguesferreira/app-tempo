import { describe, it, expect } from 'vitest';
import { rateLimiter } from '../src/server/redis/rate-limit.js';

describe('Proteção contra Brute-Force & Rate Limiting', () => {
  const testEmail = 'attacker@teste.io';
  const testIp = '192.168.1.100';

  it('deve registrar tentativas falhas e permitir até o limite de 5 tentativas', async () => {
    await rateLimiter.reset(testEmail, testIp);

    // 1ª a 4ª tentativa devem ser permitidas com decremento de slots
    for (let i = 1; i <= 4; i++) {
      const res = await rateLimiter.recordFailure(testEmail, testIp);
      expect(res.allowed).toBe(true);
      expect(res.remainingAttempts).toBe(5 - i);
    }

    // 5ª tentativa atinge o limite e ativa o lockout imediato
    const lockoutRes = await rateLimiter.recordFailure(testEmail, testIp);
    expect(lockoutRes.allowed).toBe(false);
    expect(lockoutRes.remainingAttempts).toBe(0);
    expect(lockoutRes.lockoutSecondsRemaining).toBeGreaterThan(0);

    // Tentativa subsequente é rejeitada diretamente pelo lockout
    const check = await rateLimiter.checkLockout(testEmail, testIp);
    expect(check.locked).toBe(true);
    expect(check.secondsRemaining).toBeGreaterThan(0);

    // Reseta após autenticação ou liberação administrativa
    await rateLimiter.reset(testEmail, testIp);
    const afterReset = await rateLimiter.checkLockout(testEmail, testIp);
    expect(afterReset.locked).toBe(false);
  });
});
