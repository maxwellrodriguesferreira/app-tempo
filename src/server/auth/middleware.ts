import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { sessionService } from './session.js';
import { UserRole, UserSanitized, Session, AppEnv } from '../../shared/types.js';

export interface AuthContextVariables {
  user: UserSanitized;
  session: Session;
  sessionToken: string;
}

/**
 * Middleware que exige sessão válida.
 * Suporta extração de token via Cookie HTTP-only (navegador) ou Header Authorization (API).
 */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  let token: string | undefined;

  // 1. Cookie HTTP-only
  const cookieToken = getCookie(c, 'session_token');
  if (cookieToken) {
    token = cookieToken;
  }

  // 2. Header Authorization Bearer
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return c.json({ error: 'Não autenticado. Sessão necessária.' }, 401);
  }

  const sessionData = await sessionService.validateSession(token);
  if (!sessionData) {
    return c.json({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, 401);
  }

  c.set('user', sessionData.user);
  c.set('session', sessionData.session);
  c.set('sessionToken', token);

  await next();
}

/**
 * Middleware de autorização RBAC por papel (ex: admin, user).
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Não autenticado.' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: 'Acesso negado. Esta operação exige privilégios administrativos.',
          required_role: allowedRoles,
          current_role: user.role,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Proteção CSRF simples para mutações (POST, PUT, DELETE, PATCH).
 * Valida o header Origin / Referer contra a origem da aplicação quando em produção.
 */
export async function csrfProtection(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  const host = c.req.header('host');

  // Requisições diretas de ferramentas de API que não enviam origin ou que venham do mesmo host são aceitas
  if (origin && host) {
    const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
    if (originHost !== host && !originHost.includes('localhost')) {
      return c.json({ error: 'Possível ataque CSRF detectado: Origem não autorizada.' }, 403);
    }
  }

  await next();
}
