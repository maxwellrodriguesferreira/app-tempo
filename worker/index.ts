/**
 * Cloudflare Worker Dedicado - D1 Database Gateway Seguro
 *
 * Este Worker é implantado na Cloudflare e atua como uma ponte privada autenticada
 * entre o servidor Docker da aplicação e o Cloudflare D1 nativo.
 */

export interface Env {
  DB: D1Database;
  AUTH_TOKEN: string; // Token Bearer secreto configurado via `wrangler secret put AUTH_TOKEN`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Validação de autenticação via Bearer Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response(JSON.stringify({ error: 'Não autorizado: Token Bearer inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    try {
      // POST /query - Executa consulta com retorno de dados
      if (url.pathname === '/query' && request.method === 'POST') {
        const { sql, params = [] } = (await request.json()) as { sql: string; params?: unknown[] };
        const stmt = env.DB.prepare(sql).bind(...params);
        const { results } = await stmt.all();
        return new Response(JSON.stringify({ success: true, results }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // POST /execute - Executa mutação (INSERT, UPDATE, DELETE)
      if (url.pathname === '/execute' && request.method === 'POST') {
        const { sql, params = [] } = (await request.json()) as { sql: string; params?: unknown[] };
        const stmt = env.DB.prepare(sql).bind(...params);
        const info = await stmt.run();
        return new Response(
          JSON.stringify({
            success: true,
            changes: info.meta.changes,
            lastInsertRowid: info.meta.last_row_id,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // POST /batch - Executa lote de instruções em transação atômica
      if (url.pathname === '/batch' && request.method === 'POST') {
        const { statements } = (await request.json()) as {
          statements: Array<{ sql: string; params?: unknown[] }>;
        };
        const batchStmts = statements.map((s) => env.DB.prepare(s.sql).bind(...(s.params || [])));
        const batchResults = await env.DB.batch(batchStmts);
        return new Response(JSON.stringify({ success: true, results: batchResults }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
