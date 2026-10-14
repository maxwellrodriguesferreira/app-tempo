import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'crypto';
import { db } from '../db/adapter.js';
import { rateLimiter } from '../redis/rate-limit.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { sessionService } from '../auth/session.js';
import { requireAuth } from '../auth/middleware.js';
import { loginSchema, registerSchema } from '../../shared/schema.js';
import { User, UserSanitized, AppEnv } from '../../shared/types.js';
import { config } from '../config.js';

const authRoutes = new Hono<AppEnv>();

/**
 * POST /api/v1/auth/login
 * Autenticação de usuários com proteção contra força bruta integrada ao Redis
 */
authRoutes.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Unknown';

  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', issues: parsed.error.issues }, 400);
  }

  const { email, password } = parsed.data;

  // 1. Verifica se a conta/IP já está sob lockout no Redis
  const lockoutCheck = await rateLimiter.checkLockout(email, ip);
  if (lockoutCheck.locked) {
    return c.json(
      {
        error: `Conta temporariamente suspensa por excesso de tentativas falhas. Tente novamente em ${lockoutCheck.secondsRemaining} segundos.`,
        lockout: true,
        seconds_remaining: lockoutCheck.secondsRemaining,
      },
      429
    );
  }

  // 2. Busca o usuário no Cloudflare D1
  const user = await db.queryFirst<User>(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email.toLowerCase()]);

  // Se o usuário não existir ou a senha for inválida
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const rateLimit = await rateLimiter.recordFailure(email, ip);

    // Registra falha na auditoria
    await db.execute(
      `INSERT INTO audit_logs (id, actor_id, actor_name, action, target_id, target_type, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `aud_${crypto.randomUUID()}`,
        user?.id || null,
        user?.name || email,
        'LOGIN_FAILED',
        null,
        'AUTH',
        JSON.stringify({ reason: 'Credenciais inválidas', attempts: rateLimit.totalAttempts }),
        ip,
        new Date().toISOString(),
      ]
    );

    if (!rateLimit.allowed) {
      return c.json(
        {
          error: `Limite de tentativas excedido. Bloqueado temporariamente por ${rateLimit.lockoutSecondsRemaining} segundos.`,
          lockout: true,
          seconds_remaining: rateLimit.lockoutSecondsRemaining,
        },
        429
      );
    }

    return c.json(
      {
        error: 'Credenciais inválidas.',
        remaining_attempts: rateLimit.remainingAttempts,
      },
      401
    );
  }

  // 3. Verifica se a conta está bloqueada administrativamente
  if (user.is_blocked) {
    return c.json(
      {
        error: 'Esta conta foi suspensa pela administração. Entre em contato com o suporte.',
        is_blocked: true,
      },
      403
    );
  }

  // 4. Sucesso: reseta os contadores do rate limiter
  await rateLimiter.reset(email, ip);

  // 5. Atualiza last_login_at
  const now = new Date().toISOString();
  await db.execute(`UPDATE users SET last_login_at = ? WHERE id = ?`, [now, user.id]);

  // 6. Cria sessão segura (D1 + Redis)
  const { token, session } = await sessionService.createSession(user, { userAgent, ipAddress: ip });

  // 7. Define cookie seguro
  const isSecure = config.NODE_ENV === 'production';
  setCookie(c, 'session_token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: config.SESSION_TTL_SECONDS,
  });

  // 8. Registra sucesso na auditoria
  await db.execute(
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, target_id, target_type, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `aud_${crypto.randomUUID()}`,
      user.id,
      user.name,
      'LOGIN_SUCCESS',
      user.id,
      'USER',
      JSON.stringify({ user_agent: userAgent }),
      ip,
      now,
    ]
  );

  return c.json({
    message: 'Autenticado com sucesso.',
    user: sessionService.sanitizeUser(user),
    token,
    expires_at: session.expires_at,
  });
});

/**
 * POST /api/v1/auth/register
 * Cadastro de novo usuário
 */
authRoutes.post('/register', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Unknown';

  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Dados inválidos', issues: parsed.error.issues }, 400);
  }

  const { name, email, password } = parsed.data;

  // Verifica se email já está cadastrado
  const existing = await db.queryFirst<User>(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email.toLowerCase()]);
  if (existing) {
    return c.json({ error: 'Este e-mail já está em uso.' }, 409);
  }

  // Gera hash scrypt seguro
  const passwordHash = await hashPassword(password);
  const userId = `usr_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Se for o primeiro usuário do sistema, atribui admin
  const allUsersCount = (await db.query<User>(`SELECT id FROM users LIMIT 2`)).length;
  const initialRole = allUsersCount === 0 ? 'admin' : 'user';

  const newUser: User = {
    id: userId,
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role: initialRole,
    is_blocked: 0,
    created_at: now,
    updated_at: now,
    last_login_at: now,
  };

  await db.execute(
    `INSERT INTO users (id, name, email, password_hash, role, is_blocked, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newUser.id,
      newUser.name,
      newUser.email,
      newUser.password_hash,
      newUser.role,
      newUser.is_blocked,
      newUser.created_at,
      newUser.updated_at,
      newUser.last_login_at,
    ]
  );

  // Cria sessão imediata
  const { token, session } = await sessionService.createSession(newUser, { userAgent, ipAddress: ip });

  const isSecure = config.NODE_ENV === 'production';
  setCookie(c, 'session_token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: config.SESSION_TTL_SECONDS,
  });

  // Registra auditoria
  await db.execute(
    `INSERT INTO audit_logs (id, actor_id, actor_name, action, target_id, target_type, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `aud_${crypto.randomUUID()}`,
      newUser.id,
      newUser.name,
      'USER_REGISTERED',
      newUser.id,
      'USER',
      JSON.stringify({ role: newUser.role }),
      ip,
      now,
    ]
  );

  return c.json(
    {
      message: 'Usuário cadastrado com sucesso.',
      user: sessionService.sanitizeUser(newUser),
      token,
      expires_at: session.expires_at,
    },
    201
  );
});

/**
 * POST /api/v1/auth/logout
 * Encerramento de sessão com revogação no D1 e Redis
 */
authRoutes.post('/logout', async (c) => {
  let token = c.req.header('Authorization')?.replace(/^Bearer\s+/, '');
  if (!token) {
    const cookieToken = c.req.header('cookie')?.match(/session_token=([^;]+)/)?.[1];
    if (cookieToken) token = cookieToken;
  }

  if (token) {
    await sessionService.revokeSession(token);
  }

  deleteCookie(c, 'session_token', { path: '/' });
  return c.json({ message: 'Sessão encerrada com sucesso.' });
});

/**
 * GET /api/v1/auth/me
 * Retorna os dados do usuário autenticado atual
 */
authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user') as UserSanitized;
  return c.json({ user });
});

export { authRoutes };
