import { db } from '../src/server/db/adapter.js';
import { hashPassword } from '../src/server/auth/password.js';

async function seed() {
  console.log('🌱 Semeando usuários padrão no Cloudflare D1...');

  const adminEmail = 'carlos.mendes@climastack.io';
  const existing = await db.queryFirst(`SELECT id FROM users WHERE email = ?`, [adminEmail]);

  if (existing) {
    console.log(`ℹ️ Usuário ${adminEmail} já existe no banco.`);
    return;
  }

  const passwordHash = await hashPassword('Admin123!');
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO users (id, name, email, password_hash, role, is_blocked, created_at, updated_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'usr_admin_carlos',
      'Carlos Mendes',
      adminEmail,
      passwordHash,
      'admin',
      0,
      now,
      now,
      now,
    ]
  );

  console.log(`✅ Administrador padrão criado com sucesso: ${adminEmail}`);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
