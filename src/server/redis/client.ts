import { Redis } from 'ioredis';
import { config, sanitizeForLogs } from '../config.js';

export interface RedisHealth {
  status: 'connected' | 'disconnected' | 'disabled';
  latencyMs: number;
  tls: boolean;
  provider: string;
  details?: string;
}

class RedisManager {
  private client: Redis | null = null;
  private isConnected = false;
  private isConnecting = false;
  private inMemoryFallback = new Map<string, { value: string; expiresAt: number }>();

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!config.REDIS_URL) {
      console.warn('[Redis] REDIS_URL não configurado. Ativando cache/rate limiter em memória.');
      return;
    }

    try {
      const isUpstash = config.REDIS_URL.includes('.upstash.io');
      const isTls = config.REDIS_URL.startsWith('rediss://') || config.REDIS_TLS_ENABLED || isUpstash;
      const normalizedUrl = isTls && config.REDIS_URL.startsWith('redis://')
        ? config.REDIS_URL.replace(/^redis:\/\//, 'rediss://')
        : config.REDIS_URL;

      console.info(`[Redis] Conectando ao Redis remoto: ${sanitizeForLogs(normalizedUrl)} (TLS: ${isTls})`);

      this.client = new Redis(normalizedUrl, {
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        connectTimeout: config.REDIS_CONNECT_TIMEOUT_MS,
        maxRetriesPerRequest: config.REDIS_MAX_RETRIES_PER_REQUEST,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Redis] Tentativas de reconexão esgotadas temporariamente. Modo degradado ativo.');
            return null; // para de tentar reconectar agressivamente
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.info('[Redis] Conexão com Redis remoto estabelecida com sucesso.');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.warn(`[Redis Aviso] Erro na conexão com Redis remoto: ${err.message}. Degradação segura ativada.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Conexão assíncrona não bloqueante
      this.client.connect().catch((err) => {
        this.isConnected = false;
        console.warn(`[Redis Aviso] Não foi possível conectar ao Redis remoto imediatamente: ${err.message}. Operando em fallback gracioso.`);
      });
    } catch (err: unknown) {
      console.warn('[Redis Erro ao instanciar]:', err instanceof Error ? err.message : err);
      this.client = null;
      this.isConnected = false;
    }
  }

  public get isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  public getRawClient(): Redis | null {
    return this.client;
  }

  // Operações com suporte a fallback gracioso
  public async get(key: string): Promise<string | null> {
    if (this.isReady && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        console.warn(`[Redis Fallback GET] Falha ao obter chave ${key}:`, err instanceof Error ? err.message : err);
      }
    }

    // Fallback in-memory
    const item = this.inMemoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (this.isReady && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          return await this.client.set(key, value, 'EX', ttlSeconds);
        }
        return await this.client.set(key, value);
      } catch (err) {
        console.warn(`[Redis Fallback SET] Falha ao salvar chave ${key}:`, err instanceof Error ? err.message : err);
      }
    }

    // Fallback in-memory
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : Infinity;
    this.inMemoryFallback.set(key, { value, expiresAt });
    return 'OK';
  }

  public async del(key: string): Promise<number> {
    if (this.isReady && this.client) {
      try {
        return await this.client.del(key);
      } catch (err) {
        console.warn(`[Redis Fallback DEL] Falha ao deletar chave ${key}:`, err instanceof Error ? err.message : err);
      }
    }
    const existed = this.inMemoryFallback.delete(key);
    return existed ? 1 : 0;
  }

  public async evalScript(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    if (this.isReady && this.client) {
      try {
        return await this.client.eval(script, keys.length, ...keys, ...args);
      } catch (err) {
        console.warn('[Redis Eval Erro]:', err instanceof Error ? err.message : err);
        throw err;
      }
    }
    throw new Error('Redis não está pronto para executar scripts Lua. Utilize operações com fallback.');
  }

  public async checkHealth(): Promise<RedisHealth> {
    if (!config.REDIS_URL) {
      return {
        status: 'disabled',
        latencyMs: 0,
        tls: false,
        provider: 'In-Memory Emulated Rate Limiter',
        details: 'REDIS_URL não informada no ambiente.',
      };
    }

    const start = Date.now();
    const isTls = config.REDIS_URL.startsWith('rediss://') || config.REDIS_TLS_ENABLED;

    if (!this.client || !this.isConnected) {
      return {
        status: 'disconnected',
        latencyMs: 0,
        tls: isTls,
        provider: 'Redis Remoto Externo',
        details: 'Conexão indisponível ou em processo de retry.',
      };
    }

    try {
      const pong = await this.client.ping();
      const latencyMs = Date.now() - start;
      return {
        status: pong === 'PONG' ? 'connected' : 'disconnected',
        latencyMs,
        tls: isTls,
        provider: 'Redis Remoto Externo',
        details: `Conectado com latência de ${latencyMs}ms.`,
      };
    } catch (err) {
      return {
        status: 'disconnected',
        latencyMs: Date.now() - start,
        tls: isTls,
        provider: 'Redis Remoto Externo',
        details: err instanceof Error ? err.message : 'Falha no ping ao Redis',
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redis = new RedisManager();
