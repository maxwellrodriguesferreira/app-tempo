import React, { useState, useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'architecture' | 'demo'>('features');

  // Fecha o modal ao pressionar ESC e trava scroll do body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleActionClick = (tabId: string) => {
    onClose();
    onNavigate(tabId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-surface-container-highest flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container-lowest border-b border-surface-container-highest flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined text-[26px]">cyclone</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="about-modal-title" className="text-xl font-bold text-on-surface tracking-tight">
                  Sobre o ClimaStack Weather Hub
                </h2>
                <span className="font-mono text-[11px] font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full border border-primary/20">
                  v3.4 Production
                </span>
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Container Único
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Plataforma corporativa de telemetria atmosférica, inteligência climática e governança segura.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus:outline-none"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Abas de Navegação Interna do Modal */}
        <div className="px-6 border-b border-surface-container-highest bg-surface-container-lowest flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'features'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">featured_play_list</span>
            Resumo de Funcionalidades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">hub</span>
            Visão Geral & Proposta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">dns</span>
            Arquitetura & Segurança
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'demo'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">verified_user</span>
            Guia Rápido & Acessos
          </button>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface-container-lowest text-on-surface">
          {/* TAB 1: RESUMO DE FUNCIONALIDADES */}
          {activeTab === 'features' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container-highest/80 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">auto_awesome</span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">
                    Central Unificada de Meteorologia & Governança Corporativa
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    O sistema integra 4 pilares operacionais em um único painel de alta performance, projetado para
                    equipes de operações, infraestrutura e tomada de decisão estratégica em tempo real.
                  </p>
                </div>
              </div>

              {/* Grid dos 4 Pilares Funcionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Previsão & Telemetria */}
                <div className="p-4 rounded-xl bg-white border border-surface-container-highest shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">partly_cloudy_day</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Tempo Real
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                      1. Previsão Meteorológica & Radares
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Telemetria climática completa com dados atmosféricos de alta precisão atualizados minuto a minuto.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0">check_circle</span>
                        <span>Condições atuais: temperatura, sensação térmica, umidade, vento, UV e pressão.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0">check_circle</span>
                        <span>Linha do tempo horária de 24h e projeção sinótica estendida de 7 a 10 dias.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0">check_circle</span>
                        <span>Busca inteligente com autocompletar mundial e conversão instantânea °C / °F.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-sky-600 shrink-0">check_circle</span>
                        <span>Cidades favoritas sincronizadas no Cloudflare D1 por usuário logado.</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionClick('weather')}
                    className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                  >
                    <span>Explorar Dashboard de Clima</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                {/* 2. Segurança & Brute-Force */}
                <div className="p-4 rounded-xl bg-white border border-surface-container-highest shadow-2xs hover:border-emerald-600/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">security</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Redis Protegido
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-on-surface group-hover:text-emerald-700 transition-colors">
                      2. Autenticação & Defesa Brute-Force
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Mecanismos criptográficos corporativos com barreira de proteção ativa contra ataques automatizados.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">check_circle</span>
                        <span>Criptografia de credenciais via algoritmo scrypt com salt de 16B e chave de 64B.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">check_circle</span>
                        <span>Sliding Window Rate Limit: máximo de 5 tentativas de login em janela de 60s.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">check_circle</span>
                        <span>Lockout atômico via Lua Script no Redis com quarentena obrigatória de 15 minutos.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-emerald-600 shrink-0">check_circle</span>
                        <span>Política de aprovação prévia de novos cadastros pelo administrador.</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionClick('auth')}
                    className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    <span>Ir para Acesso & Segurança</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                {/* 3. Painel Administrativo & IAM */}
                <div className="p-4 rounded-xl bg-white border border-surface-container-highest shadow-2xs hover:border-tertiary/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        IAM & Auditoria
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-on-surface group-hover:text-tertiary transition-colors">
                      3. Governança IAM & Trilha de Auditoria
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Gestão completa de identidades, papéis, controles de acesso e rastreamento de compliance.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0">check_circle</span>
                        <span>Aprovação ou recusa de novos usuários com contador de alertas no cabeçalho.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0">check_circle</span>
                        <span>Controle de papéis (RBAC): transição entre usuários comuns e administradores.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0">check_circle</span>
                        <span>Bloqueio/desbloqueio imediato de contas e redefinição assistida de senhas.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0">check_circle</span>
                        <span>Registro imutável de logs de auditoria (eventos, IP, ação e timestamp).</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionClick('admin')}
                    className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs font-semibold text-tertiary hover:text-tertiary-container transition-colors"
                  >
                    <span>Acessar Painel IAM</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                {/* 4. Infraestrutura & Logs */}
                <div className="p-4 rounded-xl bg-white border border-surface-container-highest shadow-2xs hover:border-amber-600/40 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[18px]">developer_board</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Telemetria
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-on-surface group-hover:text-amber-700 transition-colors">
                      4. Infraestrutura & Telemetria em Tempo Real
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Supervisão contínua da saúde operacional do container, conexões de borda e latências.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">check_circle</span>
                        <span>Telemetria do container Docker: CPU, memória heap, RSS e tempo de atividade (uptime).</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">check_circle</span>
                        <span>Monitoramento da latência do Redis Remoto com medidor contínuo em milissegundos.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">check_circle</span>
                        <span>Status e integridade do banco Cloudflare D1 Ledger com fallback resiliente.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">check_circle</span>
                        <span>Healthcheck operacional rigoroso via endpoint dedicado /api/v1/health.</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionClick('infra')}
                    className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-xs font-semibold text-amber-800 hover:text-amber-900 transition-colors"
                  >
                    <span>Ver Métricas & Logs</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-surface-container-low to-primary/10 border border-primary/20">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold">
                  Missão & Proposta de Valor
                </span>
                <h3 className="text-base font-bold text-on-surface mt-1">
                  Telemetria de Alta Confiabilidade em Arquitetura Enxuta
                </h3>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  O <strong>Weather Hub (ClimaStack)</strong> nasceu para superar o desafio de disponibilizar serviços
                  críticos de meteorologia corporativa sem a complexidade de gerenciar múltiplos microsserviços e portas
                  expostas. Toda a inteligência da plataforma roda dentro de um único container determinístico,
                  consumindo recursos de borda gerenciados externamente (Cloudflare D1 e Redis Remoto TLS).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white border border-surface-container-highest">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">speed</span>
                    Zero Latência
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Frontend e backend sob a mesma origem, eliminando latências de roundtrip de rede adicionais e problemas de CORS.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-surface-container-highest">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Defesa Ativa
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Proteção atômica no Redis que isola tentativas repetidas de invasão antes que atinjam o banco relacional.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-surface-container-highest">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">palette</span>
                    Design Safe
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Interface ergonômica baseada no sistema Safe Telemetry & Atmosphere, com contrastes otimizados e dados tabulares legíveis.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2 font-mono">
                  Casos de Uso Principais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Monitoramento logístico de frotas e rotas de transporte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Operações portuárias, agrícolas e de aviação civil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Salas de situação de emergência e Defesa Civil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Gestão predial com automação de climatização preditiva</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARQUITETURA & SEGURANÇA */}
          {activeTab === 'architecture' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">docker</span>
                    Topologia de Produção em Container Único
                  </span>
                  <span className="font-mono text-[11px] text-primary font-bold bg-white px-2 py-0.5 rounded border border-surface-container-highest">
                    Porta Externa: 8080
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Não existem instâncias separadas para Nginx ou proxy reverso intermediário dentro da VM. O próprio
                  servidor Node.js LTS com Hono v4 realiza a entrega estática otimizada dos assets da Single Page
                  Application (SPA) compilada com Vite e atende todas as rotas de API em <code>/api/v1/*</code>.
                </p>
              </div>

              {/* Tabela Comparativa de Componentes Técnicos */}
              <div className="border border-surface-container-highest rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-surface-container-low border-b border-surface-container-highest text-xs font-mono font-bold text-on-surface flex items-center justify-between">
                  <span>Componente do Stack</span>
                  <span>Tecnologia & Papel na Arquitetura</span>
                </div>
                <div className="divide-y divide-surface-container-highest/60 text-xs">
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-surface-container-low/50 transition-colors">
                    <span className="font-semibold text-primary font-mono">Frontend SPA</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      React 18 + TypeScript + Tailwind CSS (Safe Telemetry)
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-surface-container-low/50 transition-colors">
                    <span className="font-semibold text-primary font-mono">Backend HTTP API</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      Hono v4 + Node.js LTS (@hono/node-server)
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-surface-container-low/50 transition-colors">
                    <span className="font-semibold text-primary font-mono">Banco Relacional</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      Cloudflare D1 (Worker Proxy Bearer ou REST API Oficial)
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-surface-container-low/50 transition-colors">
                    <span className="font-semibold text-primary font-mono">Defesa & Cache</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      Redis Remoto TLS (Sliding Window & Lockout Atômico)
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-surface-container-low/50 transition-colors">
                    <span className="font-semibold text-primary font-mono">Criptografia & Sessões</span>
                    <span className="text-on-surface-variant font-mono text-[11px]">
                      Node.js crypto scrypt (N=16384, r=8, p=1) + timingSafeEqual
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">verified</span>
                  Conformidade de Segurança e Resiliência
                </div>
                <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                  A aplicação aplica o princípio de falha graciosa: caso o serviço de Redis remoto ou D1 oscile
                  momentaneamente na rede, o motor ativa fallbacks imediatos em memória sem derrubar o container do ar.
                  Todas as senhas e tokens de log são automaticamente mascarados.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: GUIA RÁPIDO & DEMO */}
          {activeTab === 'demo' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-purple-700">key</span>
                    Acesso de Demonstração (Administrador)
                  </span>
                  <span className="font-mono text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-300 font-bold">
                    Role: admin
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-purple-200/80 font-mono text-xs">
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">E-mail de Acesso:</span>
                    <strong className="text-on-surface select-all text-xs">carlos.mendes@climastack.io</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block text-[11px]">Senha Padrão:</span>
                    <strong className="text-on-surface select-all text-xs">Admin123!</strong>
                  </div>
                </div>
                <p className="text-[11px] text-purple-800 mt-2">
                  Dica: Utilize essa credencial para desbloquear o <strong>Painel Administrativo</strong>, aprovar usuários pendentes e visualizar logs de auditoria em tempo real.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider font-mono">
                  Roteiro Rápido para Testar a Plataforma
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 bg-white border border-surface-container-highest rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="text-xs">
                      <strong className="text-on-surface">Consulte o Tempo de Qualquer Cidade:</strong>
                      <p className="text-on-surface-variant mt-0.5">
                        Utilize a barra de pesquisa no topo com autocompletar instantâneo para capitais ou cidades do interior.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-surface-container-highest rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="text-xs">
                      <strong className="text-on-surface">Teste a Barreira contra Força Bruta:</strong>
                      <p className="text-on-surface-variant mt-0.5">
                        Na tela de login, erre intencionalmente a senha 5 vezes consecutivas para ver a quarentena atômica do Redis disparar em tempo real.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-surface-container-highest rounded-xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="text-xs">
                      <strong className="text-on-surface">Acompanhe a Telemetria e Latência:</strong>
                      <p className="text-on-surface-variant mt-0.5">
                        Abra a aba de Infraestrutura para verificar o consumo de CPU, heap de memória e a latência de roundtrip do Redis TLS.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações Rápidas */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-surface-container-highest flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">terminal</span>
            <span>Porta 8080 • REST API /api/v1</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleActionClick('weather')}
              className="px-3.5 py-1.5 bg-white border border-surface-container-highest hover:bg-surface-container text-xs font-semibold rounded-lg text-on-surface transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">cloud</span>
              <span>Ir para Previsão</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionClick('infra')}
              className="px-3.5 py-1.5 bg-white border border-surface-container-highest hover:bg-surface-container text-xs font-semibold rounded-lg text-on-surface transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-700">developer_board</span>
              <span>Ver Infraestrutura</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Entendido / Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
