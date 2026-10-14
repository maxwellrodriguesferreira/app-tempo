import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, sanitizeForLogs } from './config.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { weatherRoutes } from './routes/weather.js';
import { telemetryRoutes } from './routes/telemetry.js';
import { healthRoutes } from './routes/health.js';
import { csrfProtection } from './auth/middleware.js';
import { redis } from './redis/client.js';

import { UserSanitized, Session, AppEnv } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de assets compilados do frontend (produção e docker)
function getClientDistDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../client'),
    path.resolve(__dirname, '../client'),
    path.resolve(process.cwd(), 'dist/client'),
    path.resolve(process.cwd(), 'client'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, 'index.html'))) {
      return c;
    }
  }
  return candidates[0];
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const app = new Hono<AppEnv>();

// Middleware de cabeçalhos de segurança essenciais
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});

// Middleware de CSRF nos endpoints de mutação
app.use('/api/*', csrfProtection);

// Agrupamento de rotas da API sob /api/v1
const api = new Hono<AppEnv>();
api.route('/health', healthRoutes);
api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/weather', weatherRoutes);
api.route('/telemetry', telemetryRoutes);

app.route('/api/v1', api);

// Tratamento de 404 estrito para a API REST (não retorna HTML para /api/*)
app.all('/api/*', (c) => {
  return c.json(
    {
      error: 'Endpoint da API não encontrado',
      path: c.req.path,
      method: c.req.method,
    },
    404
  );
});

// Manipulador de arquivos estáticos compilados e Roteamento SPA do Frontend
app.get('*', async (c) => {
  const reqPath = c.req.path;
  const clientDist = getClientDistDir();

  // Se for requisição para a API que passou reto, já foi tratada acima
  if (reqPath.startsWith('/api')) {
    return c.json({ error: 'Endpoint não encontrado', path: reqPath }, 404);
  }

  // Sanitiza o path para evitar Directory Traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const candidateFile = path.join(clientDist, safePath);

  // 1. Tenta servir arquivo estático direto (js, css, png, svg, etc.)
  if (fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
    const ext = path.extname(candidateFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(candidateFile);
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      },
    });
  }

  // 2. Fallback SPA: qualquer rota válida do frontend (/, /login, /admin, /infra) serve o index.html compilado
  const indexHtmlPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    return c.html(html);
  }

  // Caso o frontend ainda não tenha sido compilado (ex: durante dev sem build)
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Weather Hub - ClimaStack</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #f8f9ff; color: #0b1c30; padding: 2rem; text-align: center; }
          .card { max-width: 600px; margin: 3rem auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          h1 { color: #006194; }
          code { background: #e5eeff; padding: 0.2rem 0.4rem; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>ClimaStack / Weather Hub API Online</h1>
          <p>O servidor backend Hono está em execução na porta <code>${config.PORT}</code>.</p>
          <p>O frontend precisa ser compilado com <code>npm run build:client</code>.</p>
          <p>Acesse o healthcheck em: <a href="/api/v1/health">/api/v1/health</a></p>
        </div>
      </body>
    </html>
  `);
});

// Inicialização do servidor Node HTTP (apenas fora do ambiente de testes unitários)
let server: ReturnType<typeof serve> | null = null;

if (process.env.NODE_ENV !== 'test') {
  server = serve(
    {
      fetch: app.fetch,
      port: config.PORT,
      hostname: config.HOST,
    },
    (info) => {
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    WEATHER HUB / CLIMASTACK                      ║
║               Container Único • Hono + React                     ║
╚══════════════════════════════════════════════════════════════════╝
📡 Servidor ouvindo em:     http://${info.address}:${info.port}
🌍 Porta publicada:         ${config.PORT}
🔒 Ambiente:                ${config.NODE_ENV}
📦 Container Único:         Ativo (Frontend & Backend unificados)
🛡️ Proteção Brute-Force:    Ativa (Sliding window & Lockout)
📊 Cloudflare D1:           Configurado (${config.D1_API_URL ? 'Worker Proxy' : config.CLOUDFLARE_D1_DATABASE_ID ? 'REST API' : 'Fallback Local'})
⚡ Redis Remoto:            ${sanitizeForLogs(config.REDIS_URL)}
      `);
    }
  );
}

// Encerramento Gracioso (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 [Sinal ${signal}] Encerrando Weather Hub graciosamente...`);

  if (server) {
    server.close(async (err) => {
      if (err) {
        console.error('Erro ao fechar servidor HTTP:', err);
        process.exit(1);
      }

      try {
        await redis.disconnect();
        console.log('✅ Conexões de rede e Redis desconectadas com segurança.');
      } catch (e) {
        console.warn('Aviso durante desconexão:', e);
      }

      console.log('✅ Encerramento concluído com sucesso.');
      process.exit(0);
    });
  } else {
    await redis.disconnect();
    process.exit(0);
  }

  // Força o encerramento se travar por mais de 8 segundos
  setTimeout(() => {
    console.error('⚠️ Tempo limite de encerramento esgotado. Forçando encerramento.');
    process.exit(1);
  }, 8000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
