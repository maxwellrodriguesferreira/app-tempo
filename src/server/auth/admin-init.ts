import { db } from '../db/adapter.js';
import { hashPassword } from './password.js';
import { config } from '../config.js';
import { User } from '../../shared/types.js';

/**
 * Garante a existência do usuário administrador configurado via ADMIN_EMAIL e ADMIN_PASS.
 * Se o usuário já existir, atualiza sua senha e assegura os privilégios de 'admin'.
 * Se não existir, cria o registro imediatamente no banco D1 ou fallback.
 */
export async function ensureAdminUser(): Promise<void> {
  const adminEmail = config.ADMIN_EMAIL;
  const adminPass = config.ADMIN_PASS;

  if (!adminEmail || !adminPass) {
    return;
  }

  try {
    const existing = await db.queryFirst<User>(
      `SELECT id, role, is_blocked FROM users WHERE email = ? LIMIT 1`,
      [adminEmail.toLowerCase()]
    );
    const passwordHash = await hashPassword(adminPass);
    const now = new Date().toISOString();

    if (existing) {
      await db.execute(
        `UPDATE users SET password_hash = ?, role = 'admin', is_blocked = 0, updated_at = ? WHERE id = ?`,
        [passwordHash, now, existing.id]
      );
      console.info(`[IAM] Administrador configurado via ADMIN_EMAIL sincronizado com sucesso: ${adminEmail}`);
    } else {
      const adminId = `usr_admin_${Buffer.from(adminEmail).toString('hex').slice(0, 12)}`;
      await db.execute(
        `INSERT INTO users (id, name, email, password_hash, role, is_blocked, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          'Administrador Root',
          adminEmail.toLowerCase(),
          passwordHash,
          'admin',
          0,
          now,
          now,
          now,
        ]
      );
      console.info(`[IAM] Novo administrador criado com sucesso a partir de ADMIN_EMAIL: ${adminEmail}`);
    }
  } catch (err: unknown) {
    console.warn(
      '[IAM Aviso] Não foi possível provisionar ADMIN_EMAIL imediatamente:',
      err instanceof Error ? err.message : err
    );
  }
}
