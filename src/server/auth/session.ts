import crypto from 'crypto';
import { db } from '../db/adapter.js';
import { redis } from '../redis/client.js';
import { config } from '../config.js';
import { User, Session, UserSanitized } from '../../shared/types.js';

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', config.SESSION_SECRET).update(token).digest('hex');
}

export class SessionService {
  /**
   * Cria uma nova sessão autenticada persistida no D1 e em cache no Redis
   */
  async createSession(
    user: User,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ token: string; session: Session }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const sessionId = `ses_${crypto.randomUUID()}`;
    const ttlSeconds = config.SESSION_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const session: Session = {
      id: sessionId,
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: createdAt,
      user_agent: meta?.userAgent || null,
      ip_address: meta?.ipAddress || null,
    };

    // 1. Persistência primária no Cloudflare D1
    await db.execute(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.user_id,
        session.token_hash,
        session.expires_at,
        session.created_at,
        session.user_agent,
        session.ip_address,
      ]
    );

    // 2. Cache veloz no Redis com expiração automática
    const cachedData = JSON.stringify({
      session,
      user: this.sanitizeUser(user),
    });
    await redis.set(`session:${tokenHash}`, cachedData, ttlSeconds);

    return { token: rawToken, session };
  }

  /**
   * Valida um token de sessão, conferindo expiração e revogação
   */
  async validateSession(rawToken: string): Promise<{ user: UserSanitized; session: Session } | null> {
    if (!rawToken || rawToken.trim().length === 0) return null;

    const tokenHash = hashToken(rawToken);

    // 1. Tenta obter do Redis
    const cached = await redis.get(`session:${tokenHash}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { session: Session; user: UserSanitized };
        if (new Date(parsed.session.expires_at).getTime() > Date.now()) {
          // Checa se o usuário ainda não foi bloqueado
          if (parsed.user.is_blocked) return null;
          return parsed;
        }
      } catch {
        // Ignora erro de parse e busca do banco
      }
    }

    // 2. Busca do Cloudflare D1
    const sessionRecord = await db.queryFirst<Session>(
      `SELECT * FROM sessions WHERE token_hash = ? LIMIT 1`,
      [tokenHash]
    );

    if (!sessionRecord) return null;

    // Checa expiração
    if (new Date(sessionRecord.expires_at).getTime() <= Date.now()) {
      await this.revokeSession(rawToken);
      return null;
    }

    // Busca usuário associado
    const userRecord = await db.queryFirst<User>(
      `SELECT * FROM users WHERE id = ? LIMIT 1`,
      [sessionRecord.user_id]
    );

    if (!userRecord || userRecord.is_blocked) {
      return null;
    }

    const sanitized = this.sanitizeUser(userRecord);

    // Re-hidrata o Redis com o tempo restante
    const remainingSeconds = Math.max(
      60,
      Math.floor((new Date(sessionRecord.expires_at).getTime() - Date.now()) / 1000)
    );
    await redis.set(`session:${tokenHash}`, JSON.stringify({ session: sessionRecord, user: sanitized }), remainingSeconds);

    return { user: sanitized, session: sessionRecord };
  }

  /**
   * Revoga/encerra uma sessão específica
   */
  async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await redis.del(`session:${tokenHash}`);
    await db.execute(`DELETE FROM sessions WHERE token_hash = ?`, [tokenHash]);
  }

  /**
   * Revoga todas as sessões de um usuário (ex: após troca de senha ou bloqueio)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await db.query<Session>(`SELECT token_hash FROM sessions WHERE user_id = ?`, [userId]);
    for (const s of sessions) {
      await redis.del(`session:${s.token_hash}`);
    }
    await db.execute(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
  }

  public sanitizeUser(u: User): UserSanitized {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_blocked: Boolean(u.is_blocked),
      created_at: u.created_at,
      last_login_at: u.last_login_at,
    };
  }
}

export const sessionService = new SessionService();
