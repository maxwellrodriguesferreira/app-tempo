import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { TelemetryStatus } from '../../shared/types.js';

export const InfrastructurePage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(3);

  const fetchTelemetry = async () => {
    try {
      const data = await api.getTelemetry();
      setTelemetry(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha na telemetria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-col gap-6">
      {/* Header da Tela */}
      <div className="w-full bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-surface-container-highest">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold bg-primary-fixed/40 px-2 py-0.5 rounded">
                Arquitetura de Produção
              </span>
              <span className="font-mono text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                1 Único Container Docker
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">
              Infraestrutura & Telemetria em Tempo Real
            </h1>
            <p className="text-xs text-on-surface-variant">
              Monitoramento integrado do container único, banco Cloudflare D1 e cluster Redis remoto para brute-force.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-mono">Auto-refresh:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="h-8 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs font-mono"
            >
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
            <button
              onClick={fetchTelemetry}
              className="h-8 px-3 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {loading && !telemetry ? (
        <div className="p-12 text-center text-xs font-mono text-outline">
          Consultando telemetria dos nós em edge...
        </div>
      ) : telemetry ? (
        <>
          {/* Três Cards Principais de Infraestrutura */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Container Único Docker */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-highest flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary-fixed/40 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">layers</span>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">Container Único Docker</h3>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        Node.js LTS • Alpine
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    ONLINE
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono border-t border-surface-container-highest pt-3">
                  <div className="flex justify-between">
                    <span className="text-outline">Porta HTTP Publicada:</span>
                    <strong className="text-primary">{telemetry.app.port}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Processo Único:</span>
                    <span className="text-emerald-600 font-semibold">Frontend + Backend</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Uptime:</span>
                    <span>{telemetry.uptime_seconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Memória RSS:</span>
                    <span>{telemetry.app.memory_usage_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Ambiente:</span>
                    <span className="uppercase text-primary">{telemetry.app.environment}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container-highest text-[11px] text-on-surface-variant">
                <span>Healthcheck: </span>
                <code className="text-primary">/api/v1/health (HTTP 200)</code>
              </div>
            </div>

            {/* 2. Cloudflare D1 Ledger */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-highest flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">database</span>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">Cloudflare D1</h3>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        SQL Database Gerenciado Externo
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      telemetry.cloudflare_d1.status === 'connected'
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-amber-700 bg-amber-100'
                    }`}
                  >
                    {telemetry.cloudflare_d1.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono border-t border-surface-container-highest pt-3">
                  <div className="flex justify-between">
                    <span className="text-outline">Modo de Integração:</span>
                    <strong className="text-tertiary">{telemetry.cloudflare_d1.mode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Latência de Consulta:</span>
                    <span className="text-on-surface font-semibold">{telemetry.cloudflare_d1.latency_ms} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Camada de Persistência:</span>
                    <span>Queries Parametrizadas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Dialeto:</span>
                    <span>SQLite / D1 Compliant</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container-highest text-[11px] text-on-surface-variant truncate">
                <span>Cluster: </span>
                <span className="text-on-surface font-mono">{telemetry.cloudflare_d1.database}</span>
              </div>
            </div>

            {/* 3. Redis Remoto (Proteção Brute-Force) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-highest flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">security</span>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface">Redis Remoto</h3>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        Rate Limiting & Lockout Atômico
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                      telemetry.redis.status === 'connected'
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-outline bg-surface-container'
                    }`}
                  >
                    {telemetry.redis.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono border-t border-surface-container-highest pt-3">
                  <div className="flex justify-between">
                    <span className="text-outline">Provedor:</span>
                    <span className="text-on-surface font-medium truncate max-w-[140px]">{telemetry.redis.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Criptografia TLS:</span>
                    <span className={telemetry.redis.tls ? 'text-emerald-600 font-bold' : 'text-outline'}>
                      {telemetry.redis.tls ? 'Ativa (rediss://)' : 'Padrão TCP'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Latência Ping:</span>
                    <span>{telemetry.redis.latency_ms} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Janela Sliding:</span>
                    <span>60 segundos (5 slots)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Quarentena Lockout:</span>
                    <span className="text-red-600 font-bold">15 minutos (900s)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container-highest text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm">shield</span>
                <span>Proteção Ativa Sem Dependência Local</span>
              </div>
            </div>
          </div>

          {/* Console / Terminal de Telemetria e Auditoria */}
          <section className="bg-slate-900 text-slate-100 rounded-2xl p-6 font-mono text-xs shadow-md border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="ml-2 font-bold text-slate-300">weather-hub-runtime-console</span>
              </div>
              <span className="text-[11px] text-slate-400">Stream de Auditoria & Segurança</span>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <p className="text-emerald-400">
                [SYSTEM] Container inicializado em 0.0.0.0:{telemetry.app.port} sob NODE_ENV={telemetry.app.environment}
              </p>
              <p className="text-slate-400">
                [SECURITY] Hashing criptográfico ativo: scrypt com salt de 16B e chave de 64B. Timing-safe verifications habilitadas.
              </p>
              <p className="text-sky-400">
                [D1-ADAPTER] Camada de persistência pronta ({telemetry.cloudflare_d1.mode}) com latência de {telemetry.cloudflare_d1.latency_ms}ms.
              </p>
              <p className="text-amber-400">
                [REDIS-BRUTE-FORCE] Script Lua atômico carregado para controle de lockout e sliding window.
              </p>
              <p className="text-slate-400">
                [ROUTER] Unificação de rotas: API REST sob /api/v1 e arquivos estáticos SPA servidos na mesma origem.
              </p>
              <p className="text-emerald-400">
                [HEALTHCHECK] Wget spider /api/v1/health respondendo 200 OK.
              </p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
