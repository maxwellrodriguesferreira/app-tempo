import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ApiError } from '../services/api.js';

interface AuthPageProps {
  onSuccessLogin?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccessLogin }) => {
  const { user, login, register, logout } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // Contador regressivo para o bloqueio de brute-force
  useEffect(() => {
    if (lockoutRemaining === null || lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      if (onSuccessLogin) onSuccessLogin();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.status === 429 && err.data?.seconds_remaining) {
          setLockoutRemaining(Number(err.data.seconds_remaining));
        }
      } else {
        setErrorMessage('Erro inesperado na comunicação com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('carlos.mendes@climastack.io');
    setPassword('Admin123!');
    setTab('login');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-col items-center justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
        {/* Painel Esquerdo: Identidade de Sistema, Confiança & Defesa em Edge */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-surface-container-high rounded-2xl p-6 lg:p-8 shadow-sm relative overflow-hidden border border-surface-container-highest">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-tertiary/5 blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            {/* Header Telemetria */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">cyclone</span>
                </span>
                <div>
                  <span className="text-base font-bold text-on-surface tracking-tight block">ClimaStack</span>
                  <span className="font-mono text-[10px] text-on-surface-variant block uppercase font-semibold">
                    Core Telemetry v3.4
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white shadow-xs border border-surface-container-highest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-mono text-[11px] text-on-surface font-semibold">D1: 4.2ms</span>
              </div>
            </div>

            {/* Propósito */}
            <div className="space-y-2 mb-6">
              <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold">
                Gateway Operacional
              </span>
              <h2 className="text-xl lg:text-2xl font-bold text-on-surface leading-tight">
                Sensoriamento atmosférico e defesa em edge computacional.
              </h2>
              <p className="text-xs text-on-surface-variant">
                Acesso unificado à rede de telemetria meteorológica de alta densidade com validação de chaves criptográficas em tempo real.
              </p>
            </div>

            {/* Monitor de Arquitetura de Defesa (Redis + D1) */}
            <div className="space-y-3 mb-6">
              <div className="bg-white p-3.5 rounded-xl shadow-xs border border-surface-container-highest">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-primary">security</span>
                    Limitação de Taxa via Redis Edge
                  </span>
                  <span className="font-mono text-[10px] text-primary font-bold bg-primary-fixed/40 px-1.5 py-0.5 rounded">
                    PROTEÇÃO ATIVA
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant mb-2">
                  Controle por sliding window contra força bruta com quarentena imediata de 15 minutos em 5 rejeições consecutivas.
                </p>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full w-[10%]" title="Tentativas utilizadas"></div>
                  <div className="bg-surface-container-high h-full w-[90%]"></div>
                </div>
                <div className="flex justify-between items-center mt-1.5 font-mono text-[10px]">
                  <span className="text-on-surface-variant">Janela: 60s</span>
                  <span className="text-on-surface font-semibold">5 slots livres</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl shadow-xs border border-surface-container-highest">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-tertiary">database</span>
                    Cloudflare D1 Ledger
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                    TLS 1.3 / mTLS
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Credenciais e tokens de sessão distribuídos e assinados criptograficamente nas edge nodes regionais.
                </p>
              </div>

              {/* Sparkline de Ingestão de Estações */}
              <div className="bg-white p-3.5 rounded-xl shadow-xs border border-surface-container-highest">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-primary">ssid_chart</span>
                    Ingestão de Estações Ativas
                  </span>
                  <span className="font-mono text-[11px] text-on-surface-variant">1.482 nós sincronizados</span>
                </div>
                <div className="h-9 w-full flex items-end">
                  <svg className="w-full h-8 text-primary" fill="none" preserveAspectRatio="none" viewBox="0 0 300 40">
                    <path
                      d="M0 32 L20 28 L40 30 L60 22 L80 25 L100 15 L120 18 L140 10 L160 14 L180 8 L200 12 L220 5 L240 16 L260 11 L280 14 L300 4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    ></path>
                    <path
                      d="M0 32 L20 28 L40 30 L60 22 L80 25 L100 15 L120 18 L140 10 L160 14 L180 8 L200 12 L220 5 L240 16 L260 11 L280 14 L300 4 L300 40 L0 40 Z"
                      fill="currentColor"
                      fillOpacity="0.08"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé do Painel Esquerdo */}
          <div className="mt-4 pt-3 border-t border-surface-container-highest flex items-center justify-between text-on-surface-variant text-[11px]">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
              <span>Criptografia Ponta a Ponta Ativa</span>
            </div>
            <span className="font-mono font-medium">ISO/IEC 27001 Ready</span>
          </div>
        </div>

        {/* Painel Direito: Formulário de Autenticação */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-surface-container-highest">
          <div>
            {user ? (
              <div className="p-6 bg-surface-container-low rounded-xl border border-surface-container-highest flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
                    {user.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{user.name}</h3>
                    <p className="text-xs text-on-surface-variant font-mono">{user.email}</p>
                    <span className="inline-block mt-1 font-mono text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 px-2 py-0.5 rounded">
                      Papel Atual: {user.role.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Você já possui uma sessão ativa persistida no Cloudflare D1 e em cache no Redis remoto.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => logout()}
                    className="px-4 py-2 bg-error text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Abas Corporativas de Login / Cadastro */}
                <div className="bg-surface-container-low p-1 rounded-xl flex items-center mb-6 border border-surface-container-highest">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'login'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">login</span>
                    Entrar na Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tab === 'register'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    Criar Conta
                  </button>
                </div>

                {/* Banner de Aviso / Lockout */}
                {lockoutRemaining !== null && lockoutRemaining > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs animate-pulse">
                    <span className="material-symbols-outlined text-lg text-red-600">gpp_bad</span>
                    <div>
                      <strong className="block">Bloqueio Temporário Ativo (Redis)</strong>
                      <span>Aguarde {lockoutRemaining}s para nova tentativa.</span>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {tab === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Dra. Juliana Santos"
                        className="w-full h-10 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      E-mail Institucional
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operador@climastack.io"
                      className="w-full h-10 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-on-surface">Senha de Acesso</label>
                      {tab === 'login' && (
                        <button
                          type="button"
                          onClick={() => alert('Recuperação via token criptográfico no Redis configurável.')}
                          className="text-[11px] text-primary hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres, maiúscula e número"
                        className="w-full h-10 pl-3 pr-10 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (lockoutRemaining !== null && lockoutRemaining > 0)}
                    className="w-full h-10 bg-primary hover:bg-primary-container disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-base">verified</span>
                    )}
                    <span>
                      {tab === 'login'
                        ? 'Autenticar no Gateway Seguro'
                        : 'Criar Nova Conta no ClimaStack'}
                    </span>
                  </button>
                </form>

                {/* Atalho de Credenciais de Demonstração */}
                <div className="mt-6 pt-4 border-t border-surface-container-highest flex flex-col gap-2">
                  <span className="font-mono text-[10px] text-outline uppercase font-semibold">
                    Acesso Rápido para Avaliação:
                  </span>
                  <button
                    type="button"
                    onClick={fillAdminCredentials}
                    className="text-left p-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg border border-surface-container-highest transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-base">
                        admin_panel_settings
                      </span>
                      <div className="text-[11px]">
                        <span className="font-semibold text-on-surface block">
                          Preencher Conta Administrador (Carlos Mendes)
                        </span>
                        <span className="font-mono text-outline">
                          carlos.mendes@climastack.io / Admin123!
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-primary font-mono">Usar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
