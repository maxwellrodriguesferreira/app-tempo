import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/server/db/adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🚀 Iniciando aplicação de migrations no Cloudflare D1...');
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`⏳ Aplicando migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    // Remove comentários linha a linha antes de dividir por ponto e vírgula
    const cleanedSql = sqlContent
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    // Divide em comandos individuais
    const statements = cleanedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      try {
        await db.execute(sql);
      } catch (err: unknown) {
        console.warn(`Aviso no comando: "${sql.substring(0, 40)}...":`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`✅ Migration ${file} aplicada com sucesso!`);
  }

  console.log('🎉 Todas as migrations foram processadas.');
}

runMigrations().catch((err) => {
  console.error('❌ Falha ao aplicar migrations:', err);
  process.exit(1);
});
