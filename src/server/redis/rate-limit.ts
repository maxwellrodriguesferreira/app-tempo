import { redis } from './client.js';
import { config } from '../config.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  totalAttempts: number;
  lockoutSecondsRemaining?: number;
  message?: string;
}

// Script Lua atômico para registrar tentativa e aplicar lockout se limite for atingido
const RECORD_FAILED_LOGIN_LUA = `
local attempts_key = KEYS[1]
local lockout_key = KEYS[2]
local window_seconds = tonumber(ARGV[1])
local max_attempts = tonumber(ARGV[2])
local lockout_seconds = tonumber(ARGV[3])

-- 1. Verifica se já está em lockout
if redis.call("EXISTS", lockout_key) == 1 then
  local ttl = redis.call("TTL", lockout_key)
  return {0, max_attempts, ttl}
end

-- 2. Incrementa contador de tentativas
local count = redis.call("INCR", attempts_key)
if count == 1 then
  redis.call("EXPIRE", attempts_key, window_seconds)
end

-- 3. Se atingiu ou ultrapassou o limite, cria o lockout atômico
if count >= max_attempts then
  redis.call("SET", lockout_key, "locked", "EX", lockout_seconds)
  redis.call("DEL", attempts_key)
  return {0, count, lockout_seconds}
end

local ttl = redis.call("TTL", attempts_key)
return {1, count, ttl}
`;

export class RateLimiter {
  private inMemoryAttempts = new Map<string, { count: number; expiresAt: number }>();
  private inMemoryLockouts = new Map<string, number>();

  /**
   * Verifica se a chave/IP está atualmente em lockout sem incrementar contador
   */
  async checkLockout(identifier: string, ip: string): Promise<{ locked: boolean; secondsRemaining: number }> {
    const lockoutKey = `lockout:login:${this.normalizeKey(identifier, ip)}`;

    if (redis.isReady) {
      try {
        const rawClient = redis.getRawClient();
        if (rawClient) {
          const ttl = await rawClient.ttl(lockoutKey);
          if (ttl > 0) {
            return { locked: true, secondsRemaining: ttl };
          }
        }
      } catch (err) {
        console.warn('[RateLimiter checkLockout fallback]:', err instanceof Error ? err.message : err);
      }
    }

    // Fallback in-memory
    const memLockoutUntil = this.inMemoryLockouts.get(lockoutKey);
    if (memLockoutUntil) {
      const remainingMs = memLockoutUntil - Date.now();
      if (remainingMs > 0) {
        return { locked: true, secondsRemaining: Math.ceil(remainingMs / 1000) };
      }
      this.inMemoryLockouts.delete(lockoutKey);
    }

    return { locked: false, secondsRemaining: 0 };
  }

  /**
   * Registra uma falha de autenticação e aplica lockout se o limite for atingido
   */
  async recordFailure(identifier: string, ip: string): Promise<RateLimitCheckResult> {
    const normKey = this.normalizeKey(identifier, ip);
    const attemptsKey = `attempts:login:${normKey}`;
    const lockoutKey = `lockout:login:${normKey}`;

    const maxAttempts = config.RATE_LIMIT_LOGIN_MAX_ATTEMPTS;
    const windowSecs = config.RATE_LIMIT_LOGIN_WINDOW_SECONDS;
    const lockoutSecs = config.RATE_LIMIT_LOCKOUT_SECONDS;

    if (redis.isReady) {
      try {
        const result = (await redis.evalScript(
          RECORD_FAILED_LOGIN_LUA,
          [attemptsKey, lockoutKey],
          [windowSecs, maxAttempts, lockoutSecs]
        )) as [number, number, number];

        const [allowedNum, currentCount, ttlOrLockout] = result;
        const allowed = allowedNum === 1;

        if (!allowed) {
          return {
            allowed: false,
            remainingAttempts: 0,
            totalAttempts: currentCount,
            lockoutSecondsRemaining: ttlOrLockout,
            message: `Muitas tentativas incorretas. Conta temporariamente bloqueada por ${ttlOrLockout} segundos.`,
          };
        }

        const remaining = Math.max(0, maxAttempts - currentCount);
        return {
          allowed: true,
          remainingAttempts: remaining,
          totalAttempts: currentCount,
          message: remaining > 0 ? `Senha incorreta. ${remaining} tentativas restantes.` : undefined,
        };
      } catch (err) {
        console.warn('[RateLimiter Lua fallback]:', err instanceof Error ? err.message : err);
      }
    }

    // Fallback in-memory robusto
    const now = Date.now();
    // Checa lockout
    const lockoutUntil = this.inMemoryLockouts.get(lockoutKey);
    if (lockoutUntil && lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        totalAttempts: maxAttempts,
        lockoutSecondsRemaining: secs,
        message: `Bloqueado temporariamente por ${secs}s.`,
      };
    }

    let record = this.inMemoryAttempts.get(attemptsKey);
    if (!record || now > record.expiresAt) {
      record = { count: 0, expiresAt: now + windowSecs * 1000 };
    }

    record.count += 1;
    this.inMemoryAttempts.set(attemptsKey, record);

    if (record.count >= maxAttempts) {
      const lockUntil = now + lockoutSecs * 1000;
      this.inMemoryLockouts.set(lockoutKey, lockUntil);
      this.inMemoryAttempts.delete(attemptsKey);
      return {
        allowed: false,
        remainingAttempts: 0,
        totalAttempts: record.count,
        lockoutSecondsRemaining: lockoutSecs,
        message: `Muitas tentativas. Bloqueado por ${lockoutSecs} segundos.`,
      };
    }

    const remaining = Math.max(0, maxAttempts - record.count);
    return {
      allowed: true,
      remainingAttempts: remaining,
      totalAttempts: record.count,
      message: `Tentativa inválida. ${remaining} restantes.`,
    };
  }

  /**
   * Reseta as tentativas e remove o lockout após login bem-sucedido
   */
  async reset(identifier: string, ip: string): Promise<void> {
    const normKey = this.normalizeKey(identifier, ip);
    const attemptsKey = `attempts:login:${normKey}`;
    const lockoutKey = `lockout:login:${normKey}`;

    await redis.del(attemptsKey);
    await redis.del(lockoutKey);

    this.inMemoryAttempts.delete(attemptsKey);
    this.inMemoryLockouts.delete(lockoutKey);
  }

  private normalizeKey(identifier: string, ip: string): string {
    const cleanId = identifier.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
    const cleanIp = ip.trim().replace(/[^a-f0-9:.]/gi, '_');
    return `${cleanId}::${cleanIp}`;
  }
}

export const rateLimiter = new RateLimiter();
