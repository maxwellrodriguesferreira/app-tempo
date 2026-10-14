import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  redisLatencyMs?: number;
  onSearchCity?: (city: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  redisLatencyMs = 1.4,
  onSearchCity,
}) => {
  const { user, logout } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim() && onSearchCity) {
      onSearchCity(searchInput.trim());
    }
  };

  const navItems = [
    { id: 'weather', label: 'Previsão & Clima' },
    { id: 'admin', label: 'Painel Administrativo', adminOnly: true },
    { id: 'infra', label: 'Infraestrutura & Logs' },
    { id: 'auth', label: user ? 'Minha Conta' : 'Acesso & Segurança' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-surface-container-highest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 w-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Lado Esquerdo: Logo & Navegação */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => onSelectTab('weather')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[24px]">cyclone</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-lg text-primary tracking-tight font-bold leading-none">
                ClimaStack
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                Prod • Docker & D1
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-outline-variant hidden xl:block"></div>

          {/* Abas de Navegação */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') {
                return null;
              }
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Busca, Status Redis, Notificações & Usuário */}
        <div className="flex items-center gap-3">
          {/* Campo de Busca Rápida */}
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 text-outline text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar cidade... ex: Curitiba"
              className="h-9 pl-8 pr-3 bg-surface-container-low text-on-surface placeholder:text-outline text-xs rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all w-40 md:w-56"
            />
          </form>

          {/* Badge Telemetria Redis Remoto */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-lg border border-surface-container-highest/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">
              Redis: <strong className="text-on-surface font-semibold">{redisLatencyMs}ms</strong>
            </span>
          </div>

          {/* Alertas */}
          <button
            type="button"
            className="relative p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Alertas Meteorológicos Oficiais"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-error text-white font-mono text-[10px] leading-none font-bold">
              1
            </span>
          </button>

          <div className="h-6 w-px bg-outline-variant"></div>

          {/* Dropdown de Usuário / Login */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-1 group focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {user.name.substring(0, 2)}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-on-surface leading-tight">
                    {user.name}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold uppercase leading-none mt-0.5 ${
                      user.role === 'admin' ? 'text-tertiary' : 'text-primary'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-outline text-[16px] hidden xl:inline-block group-hover:text-on-surface transition-colors">
                  expand_more
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-surface-container-highest py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-surface-container-highest">
                    <p className="text-xs font-semibold text-on-surface">{user.name}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{user.email}</p>
                    <span className="inline-block mt-1 font-mono text-[10px] font-semibold bg-surface-container px-1.5 py-0.5 rounded text-primary">
                      Papel: {user.role}
                    </span>
                  </div>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        onSelectTab('admin');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-tertiary">admin_panel_settings</span>
                      Painel Administrativo
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectTab('infra');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">developer_board</span>
                    Infraestrutura & Logs
                  </button>
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await logout();
                      onSelectTab('auth');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-error hover:bg-error-container/30 flex items-center gap-2 border-t border-surface-container-highest"
                  >
                    <span className="material-symbols-outlined text-sm text-error">logout</span>
                    Encerrar Sessão
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="h-8 px-3 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu mobile de navegação */}
      <div className="lg:hidden flex items-center justify-around border-t border-surface-container-highest py-2 px-2 bg-surface-container-lowest">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                isActive ? 'bg-primary text-white' : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
