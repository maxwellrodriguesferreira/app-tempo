import { config, sanitizeForLogs } from '../config.js';

export interface QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number | string;
    duration?: number;
  };
}

export interface DatabaseAdapter {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryFirst<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number | string }>;
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<unknown[]>;
  checkHealth(): Promise<{ ok: boolean; latencyMs: number; mode: string; details?: string }>;
}

/**
 * Adaptador que se comunica com um Cloudflare Worker intermediário dedicado.
 * O Worker expõe um endpoint privado protegido por token Bearer que executa queries no D1 binding nativo.
 */
export class D1WorkerProxyAdapter implements DatabaseAdapter {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const response = await fetch(`${this.url}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao consultar D1 via Worker Proxy (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { results?: T[]; success: boolean; error?: string };
    if (data.error) {
      throw new Error(`D1 Proxy Error: ${data.error}`);
    }
    return data.results || [];
  }

  async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const list = await this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number | string }> {
    const response = await fetch(`${this.url}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao executar D1 via Worker Proxy (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { changes?: number; lastInsertRowid?: number | string; error?: string };
    if (data.error) {
      throw new Error(`D1 Proxy Error: ${data.error}`);
    }
    return {
      changes: data.changes ?? 1,
      lastInsertRowid: data.lastInsertRowid,
    };
  }

  async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<unknown[]> {
    const response = await fetch(`${this.url}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ statements }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro no batch D1 via Worker Proxy (${response.status}): ${errText}`);
    }

    return (await response.json()) as unknown[];
  }

  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; mode: string; details?: string }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1 as ping');
      return {
        ok: true,
        latencyMs: Date.now() - start,
        mode: 'worker-proxy',
        details: `Conectado via ${sanitizeForLogs(this.url)}`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        mode: 'worker-proxy',
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Adaptador oficial direto da REST API da Cloudflare para D1:
 * POST https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query
 */
export class CloudflareD1RestAdapter implements DatabaseAdapter {
  private accountId: string;
  private databaseId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudflare D1 REST API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      errors?: Array<{ message: string }>;
      result?: Array<{ results?: T[] }>;
    };

    if (!data.success) {
      const msg = data.errors?.map((e) => e.message).join(', ') || 'Erro desconhecido na Cloudflare API';
      throw new Error(`D1 REST API failure: ${msg}`);
    }

    return data.result?.[0]?.results || [];
  }

  async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const list = await this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number | string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudflare D1 REST execute error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      result?: Array<{ meta?: { changes?: number; last_row_id?: number | string } }>;
    };

    const meta = data.result?.[0]?.meta;
    return {
      changes: meta?.changes ?? 1,
      lastInsertRowid: meta?.last_row_id,
    };
  }

  async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<unknown[]> {
    // Cloudflare D1 query aceita sql concatenado ou array
    const results: unknown[] = [];
    for (const stmt of statements) {
      const r = await this.execute(stmt.sql, stmt.params || []);
      results.push(r);
    }
    return results;
  }

  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; mode: string; details?: string }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1 as ping');
      return {
        ok: true,
        latencyMs: Date.now() - start,
        mode: 'cloudflare-api',
        details: `Conectado ao Cloudflare D1 (${this.databaseId.substring(0, 6)}...)`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        mode: 'cloudflare-api',
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * Adaptador de memória para desenvolvimento local e testes automatizados.
 * Não utilizado como persistência permanente em produção.
 */
export class InMemoryDatabaseAdapter implements DatabaseAdapter {
  private users: Map<string, Record<string, unknown>> = new Map();
  private sessions: Map<string, Record<string, unknown>> = new Map();
  private favorites: Map<string, Record<string, unknown>> = new Map();
  private auditLogs: Array<Record<string, unknown>> = [];

  constructor() {
    this.seedDefaultAdmin();
  }

  private seedDefaultAdmin() {
    // Admin padrão Carlos Mendes
    // Senha padrão de setup inicial: Admin123!
    const defaultAdmin = {
      id: 'usr_admin_carlos',
      name: 'Carlos Mendes',
      email: 'carlos.mendes@climastack.io',
      password_hash:
        '1df0dda7cde6d00a6ff09952a6f967ab:f528b1db25d94c5375d0af330d3a6960f73186f703d8771b1893e50f71168b81325dac380f579dbbc41f5be774a070db9fd21ee29697ae21a34c74e54054f866',
      role: 'admin',
      is_blocked: 0,
      is_approved: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    };
    this.users.set(defaultAdmin.id, defaultAdmin);
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const normalized = sql.trim().toLowerCase();

    if (normalized.startsWith('select 1 as ping')) {
      return [{ ping: 1 }] as T[];
    }

    if (normalized.includes('from users') && normalized.includes('where email = ?')) {
      const email = params[0] as string;
      for (const user of this.users.values()) {
        if (user.email === email) {
          return [{ ...user }] as T[];
        }
      }
      return [];
    }

    if (normalized.includes('from users') && normalized.includes('where id = ?')) {
      const id = params[0] as string;
      const user = this.users.get(id);
      return user ? ([{ ...user }] as T[]) : [];
    }

    if (normalized.includes('from users')) {
      return Array.from(this.users.values()) as T[];
    }

    if (normalized.includes('from sessions') && normalized.includes('where token_hash = ?')) {
      const tokenHash = params[0] as string;
      for (const s of this.sessions.values()) {
        if (s.token_hash === tokenHash) {
          return [{ ...s }] as T[];
        }
      }
      return [];
    }

    if (normalized.includes('from favorite_locations') && normalized.includes('where user_id = ?')) {
      const userId = params[0] as string;
      const list = Array.from(this.favorites.values()).filter((f) => f.user_id === userId);
      return list as T[];
    }

    if (normalized.includes('from audit_logs')) {
      return [...this.auditLogs].reverse().slice(0, 50) as T[];
    }

    return [];
  }

  async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const list = await this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid?: number | string }> {
    const normalized = sql.trim().toLowerCase();

    if (normalized.startsWith('insert into users') || normalized.startsWith('insert or replace into users')) {
      const id = params[0] as string;
      const name = params[1] as string;
      const email = params[2] as string;
      const passwordHash = params[3] as string;
      const role = params[4] as string;
      const isBlocked = params[5] as number;
      // Se tiver 10 parâmetros: id, name, email, password_hash, role, is_blocked, is_approved, created_at, updated_at, last_login_at
      const isApproved = params.length >= 7 && typeof params[6] === 'number' ? params[6] : 1;
      const createdAt = (params.length >= 8 ? params[7] : params[6]) as string;
      const updatedAt = (params.length >= 9 ? params[8] : params[7]) as string;
      const lastLoginAt = (params.length >= 10 ? params[9] : null) as string | null;

      this.users.set(id, {
        id,
        name,
        email,
        password_hash: passwordHash,
        role: role || 'user',
        is_blocked: isBlocked ?? 0,
        is_approved: isApproved ?? 1,
        created_at: createdAt || new Date().toISOString(),
        updated_at: updatedAt || new Date().toISOString(),
        last_login_at: lastLoginAt || null,
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (normalized.startsWith('delete from users where id = ?')) {
      const id = params[0] as string;
      const existed = this.users.delete(id);
      return { changes: existed ? 1 : 0 };
    }

    if (normalized.startsWith('update users set') && normalized.includes('where id = ?')) {
      const id = params[params.length - 1] as string;
      const user = this.users.get(id);
      if (user) {
        const setClause = sql.substring(sql.toLowerCase().indexOf('set') + 3, sql.toLowerCase().lastIndexOf('where id = ?')).trim();
        const assignments = setClause.split(',').map((s) => s.trim().toLowerCase());
        assignments.forEach((assign, index) => {
          const col = assign.split('=')[0].trim();
          const val = params[index];
          if (col === 'name') user.name = val;
          if (col === 'email') user.email = val;
          if (col === 'role') user.role = val;
          if (col === 'is_blocked') user.is_blocked = val;
          if (col === 'is_approved') user.is_approved = val;
          if (col === 'password_hash') user.password_hash = val;
          if (col === 'updated_at') user.updated_at = val;
          if (col === 'last_login_at') user.last_login_at = val;
        });
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalized.startsWith('insert into sessions')) {
      const [id, userId, tokenHash, expiresAt, createdAt, userAgent, ipAddress] = params as [
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ];
      this.sessions.set(id, {
        id,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: createdAt,
        user_agent: userAgent,
        ip_address: ipAddress,
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (normalized.startsWith('delete from sessions where token_hash = ?')) {
      const tokenHash = params[0] as string;
      let removed = 0;
      for (const [id, s] of this.sessions.entries()) {
        if (s.token_hash === tokenHash) {
          this.sessions.delete(id);
          removed++;
        }
      }
      return { changes: removed };
    }

    if (normalized.startsWith('delete from sessions where user_id = ?')) {
      const userId = params[0] as string;
      let removed = 0;
      for (const [id, s] of this.sessions.entries()) {
        if (s.user_id === userId) {
          this.sessions.delete(id);
          removed++;
        }
      }
      return { changes: removed };
    }

    if (normalized.startsWith('insert into audit_logs')) {
      const [id, actorId, actorName, action, targetId, targetType, details, ipAddress, createdAt] = params as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ];
      this.auditLogs.push({
        id,
        actor_id: actorId,
        actor_name: actorName,
        action,
        target_id: targetId,
        target_type: targetType,
        details,
        ip_address: ipAddress,
        created_at: createdAt || new Date().toISOString(),
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (normalized.startsWith('insert into favorite_locations')) {
      const [id, userId, cityName, state, country, lat, lon, createdAt] = params as [
        string,
        string,
        string,
        string,
        string,
        number,
        number,
        string
      ];
      this.favorites.set(id, {
        id,
        user_id: userId,
        city_name: cityName,
        state,
        country,
        latitude: lat,
        longitude: lon,
        created_at: createdAt || new Date().toISOString(),
      });
      return { changes: 1, lastInsertRowid: id };
    }

    if (normalized.startsWith('delete from favorite_locations where id = ?')) {
      const [id, userId] = params as [string, string];
      const fav = this.favorites.get(id);
      if (fav && fav.user_id === userId) {
        this.favorites.delete(id);
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    if (normalized.startsWith('delete from favorite_locations where user_id = ?')) {
      const userId = params[0] as string;
      let removed = 0;
      for (const [id, f] of this.favorites.entries()) {
        if (f.user_id === userId) {
          this.favorites.delete(id);
          removed++;
        }
      }
      return { changes: removed };
    }

    return { changes: 1 };
  }

  async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<unknown[]> {
    const results = [];
    for (const stmt of statements) {
      results.push(await this.execute(stmt.sql, stmt.params || []));
    }
    return results;
  }

  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; mode: string; details?: string }> {
    return {
      ok: true,
      latencyMs: 1,
      mode: 'sqlite-fallback',
      details: 'Modo local in-memory ativo (configure D1_API_URL ou Cloudflare D1 em produção)',
    };
  }
}

/**
 * Cria a instância adequada de DatabaseAdapter conforme as variáveis de ambiente fornecidas.
 */
export function createDatabaseAdapter(): DatabaseAdapter {
  // 1. Worker Proxy dedicado com API autenticada (sugerido pelo usuário)
  if (config.D1_API_URL && config.D1_API_TOKEN) {
    console.info(`[D1] Utilizando Cloudflare Worker Proxy em ${sanitizeForLogs(config.D1_API_URL)}`);
    return new D1WorkerProxyAdapter(config.D1_API_URL, config.D1_API_TOKEN);
  }

  // 2. Cloudflare D1 REST API direta oficial
  if (config.CLOUDFLARE_ACCOUNT_ID && config.CLOUDFLARE_D1_DATABASE_ID && config.CLOUDFLARE_API_TOKEN) {
    console.info(`[D1] Utilizando Cloudflare D1 REST API direta (DB ID: ${config.CLOUDFLARE_D1_DATABASE_ID.substring(0, 6)}...)`);
    return new CloudflareD1RestAdapter(
      config.CLOUDFLARE_ACCOUNT_ID,
      config.CLOUDFLARE_D1_DATABASE_ID,
      config.CLOUDFLARE_API_TOKEN
    );
  }

  // 3. Fallback seguro para ambiente de dev/testes quando as credenciais Cloudflare ainda não foram adicionadas
  console.warn(
    '[D1] Variáveis de conexão do Cloudflare D1 (D1_API_URL/D1_API_TOKEN ou CLOUDFLARE_*) não detectadas. Iniciando com adaptador de teste.'
  );
  return new InMemoryDatabaseAdapter();
}

export const db = createDatabaseAdapter();
