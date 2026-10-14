import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { CitySearchResult } from '../../shared/types.js';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  redisLatencyMs?: number;
  onSearchCity?: (city: string | CitySearchResult) => void;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'security' | 'system' | 'info';
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  redisLatencyMs = 1.4,
  onSearchCity,
}) => {
  const { user, logout } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('climastack_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Consulta quantidade de usuários pendentes se for administrador
  useEffect(() => {
    if (user?.role !== 'admin') {
      setPendingApprovalCount(0);
      return;
    }

    const fetchPending = async () => {
      try {
        const stats = await api.getUserStats();
        setPendingApprovalCount(stats.pendingApproval || 0);
      } catch (err) {
        console.warn('Falha ao obter status de aprovação de usuários:', err);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 20000); // Atualiza a cada 20 segundos
    return () => clearInterval(interval);
  }, [user]);

  // Lista dinâmica de notificações
  const notifications: AppNotification[] = [];

  // 1. Notificação de aprovação de usuários para administradores
  if (user?.role === 'admin' && pendingApprovalCount > 0) {
    const id = `pending_users_${pendingApprovalCount}`;
    notifications.push({
      id,
      title: 'Aprovação de Usuários Pendente',
      message:
        pendingApprovalCount === 1
          ? 'Existe 1 novo usuário aguardando o seu aceite para acessar a plataforma.'
          : `Existem ${pendingApprovalCount} novos usuários aguardando o seu aceite para acessar a plataforma.`,
      type: 'security',
      timestamp: 'Ação Requerida',
      read: readIds.includes(id),
      actionLabel: 'Aprovar no Painel IAM',
      actionTab: 'admin',
    });
  }

  // 2. Alerta meteorológico geral
  notifications.push({
    id: 'weather_bulletin_instability',
    title: 'Aviso Meteorológico Vigente',
    message:
      'Canal de umidade e instabilidade atmosférica com previsão de pancadas e rajadas moderadas no decorrer do período.',
    type: 'alert',
    timestamp: 'Boletim Vigente',
    read: readIds.includes('weather_bulletin_instability'),
    actionLabel: 'Ver Radares & Telemetria',
    actionTab: 'weather',
  });

  // 3. Status de Infraestrutura
  notifications.push({
    id: 'system_edge_d1_status',
    title: 'Cluster Edge Operacional',
    message: `Cloudflare D1 Ledger sincronizado e Redis ativo com latência operacional de ${redisLatencyMs}ms.`,
    type: 'system',
    timestamp: 'Tempo Real',
    read: readIds.includes('system_edge_d1_status'),
    actionLabel: 'Ver Logs & Infra',
    actionTab: 'infra',
  });

  // 4. Status de Sessão (se logado)
  if (user) {
    notifications.push({
      id: `session_active_${user.id}`,
      title: 'Sessão Segura Ativa',
      message: `Conectado como ${user.name} (${user.role.toUpperCase()}) com criptografia ponta a ponta e token assinado.`,
      type: 'info',
      timestamp: 'Sessão Atual',
      read: readIds.includes(`session_active_${user.id}`),
      actionLabel: 'Gerenciar Conta',
      actionTab: 'auth',
    });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('climastack_read_notifications', JSON.stringify(updated));
      } catch {
        // noop
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('climastack_read_notifications', JSON.stringify(allIds));
    } catch {
      // noop
    }
  };

  const handleNotificationAction = (item: AppNotification) => {
    markAsRead(item.id);
    if (item.actionTab) {
      onSelectTab(item.actionTab);
    }
    setNotificationsOpen(false);
  };

  // Debounce para busca inteligente conforme o usuário digita
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.searchCities(trimmed);
        setSearchResults(res.results || []);
        setShowDropdown(true);
      } catch (err) {
        console.warn('Falha na busca de cidades:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city: CitySearchResult) => {
    setShowDropdown(false);
    setSearchInput(city.name);
    if (onSearchCity) {
      onSearchCity(city);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    if (searchResults.length > 0) {
      handleSelectCity(searchResults[0]);
    } else if (onSearchCity) {
      onSearchCity(searchInput.trim());
      setShowDropdown(false);
    }
  };

  const navItems = [
    { id: 'weather', label: 'Previsão & Clima' },
    { id: 'admin', label: 'Painel Administrativo', adminOnly: true },
    { id: 'infra', label: 'Infraestrutura & Logs' },
    { id: 'auth', label: user ? 'Minha Conta' : 'Acesso & Segurança' },
  ];

  const filteredNotifications =
    notificationFilter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

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
          {/* Campo de Busca Rápida com Autocomplete Inteligente */}
          <div ref={searchContainerRef} className="relative hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-outline text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchInput}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar cidades no Brasil e mundo..."
                className="h-9 pl-8 pr-8 bg-surface-container-low text-on-surface placeholder:text-outline text-xs rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all w-56 md:w-72"
              />
              {searchLoading ? (
                <div className="absolute right-2.5 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : null}
            </form>

            {/* Dropdown de Resultados da Busca */}
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-surface-container-highest py-2 z-50 overflow-hidden animate-in fade-in duration-150">
                <div className="px-3 py-1.5 border-b border-surface-container-highest/60 flex items-center justify-between text-[11px] font-mono text-on-surface-variant font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">public</span>
                    Cidades Encontradas ({searchResults.length})
                  </span>
                  <span className="text-[10px] text-outline">Pressione Enter</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-on-surface-variant">
                    {searchLoading ? (
                      <p>Consultando catálogo e satélites meteorológicos...</p>
                    ) : (
                      <p>Nenhuma cidade encontrada para &ldquo;{searchInput}&rdquo;.</p>
                    )}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-surface-container-highest/40">
                    {searchResults.map((city) => {
                      const isBrazil =
                        city.country_code?.toUpperCase() === 'BR' ||
                        city.country.toLowerCase() === 'brasil';
                      return (
                        <button
                          key={`${city.id}_${city.latitude}_${city.longitude}`}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-surface-container transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0 select-none">
                              {isBrazil ? '🇧🇷' : '🌐'}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors block truncate">
                                {city.name}
                              </span>
                              <span className="text-[11px] text-on-surface-variant truncate block">
                                {city.state ? `${city.state}, ` : ''}{city.country}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="font-mono text-[10px] text-outline block">
                              {city.latitude > 0 ? `${city.latitude.toFixed(1)}°N` : `${Math.abs(city.latitude).toFixed(1)}°S`}
                            </span>
                            <span className="text-[10px] font-semibold text-primary font-mono group-hover:underline">
                              Ver clima →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Sino de Notificações Interativo */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setUserMenuOpen(false);
              }}
              className={`relative p-2 rounded-xl transition-all focus:outline-none ${
                notificationsOpen
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Central de Notificações & Alertas"
            >
              <span className="material-symbols-outlined text-[21px] block">
                {unreadCount > 0 ? 'notifications_active' : 'notifications'}
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-error text-white font-mono text-[10px] leading-none font-bold shadow-xs animate-in zoom-in">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de Notificações */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-surface-container-highest z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header do Menu */}
                <div className="p-3.5 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-lowest">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      notifications
                    </span>
                    <h3 className="text-xs font-bold text-on-surface">Notificações & Alertas</h3>
                    {unreadCount > 0 && (
                      <span className="font-mono text-[10px] font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.2 rounded-full">
                        {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      title="Marcar todas como lidas"
                    >
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      <span>Marcar lidas</span>
                    </button>
                  )}
                </div>

                {/* Filtro rápido */}
                <div className="flex items-center gap-1 px-3 py-1.5 border-b border-surface-container-highest bg-surface-container-low/40 text-[11px]">
                  <button
                    onClick={() => setNotificationFilter('all')}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                      notificationFilter === 'all'
                        ? 'bg-white text-on-surface shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Todas ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter('unread')}
                    className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
                      notificationFilter === 'unread'
                        ? 'bg-white text-primary shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Não lidas ({unreadCount})
                  </button>
                </div>

                {/* Lista de Notificações */}
                <div className="max-h-84 overflow-y-auto divide-y divide-surface-container-highest/60">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl text-outline">
                        notifications_off
                      </span>
                      <p className="text-xs font-semibold">Nenhuma notificação por aqui.</p>
                      <p className="text-[11px] text-outline">
                        Você está em dia com todos os alertas do ClimaStack.
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const isSecurity = item.type === 'security';
                      const isAlert = item.type === 'alert';
                      const isSystem = item.type === 'system';

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 transition-colors flex gap-3 ${
                            item.read
                              ? 'bg-white hover:bg-surface-container-low/50 opacity-80'
                              : 'bg-primary-fixed/10 hover:bg-primary-fixed/20'
                          }`}
                        >
                          {/* Ícone de Categoria */}
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              isSecurity
                                ? 'bg-amber-100 text-amber-800'
                                : isAlert
                                ? 'bg-red-100 text-red-700'
                                : isSystem
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-surface-container-high text-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isSecurity
                                ? 'admin_panel_settings'
                                : isAlert
                                ? 'warning'
                                : isSystem
                                ? 'database'
                                : 'info'}
                            </span>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h4
                                className={`text-xs leading-tight font-bold ${
                                  item.read ? 'text-on-surface' : 'text-on-surface font-extrabold'
                                }`}
                              >
                                {item.title}
                              </h4>
                              <span className="font-mono text-[10px] text-outline shrink-0 whitespace-nowrap">
                                {item.timestamp}
                              </span>
                            </div>

                            <p className="text-[11px] text-on-surface-variant leading-relaxed mb-2">
                              {item.message}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              {item.actionLabel ? (
                                <button
                                  type="button"
                                  onClick={() => handleNotificationAction(item)}
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                                    isSecurity
                                      ? 'bg-amber-700 text-white hover:bg-amber-800 shadow-2xs'
                                      : 'bg-primary text-white hover:bg-primary/90 shadow-2xs'
                                  }`}
                                >
                                  <span>{item.actionLabel}</span>
                                  <span className="material-symbols-outlined text-[13px]">
                                    arrow_forward
                                  </span>
                                </button>
                              ) : (
                                <span />
                              )}

                              {!item.read && (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(item.id)}
                                  className="text-[10px] text-outline hover:text-on-surface font-semibold underline"
                                >
                                  Marcar lida
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer do Menu */}
                <div className="p-2.5 bg-surface-container-low border-t border-surface-container-highest flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Central de Alertas Ativa</span>
                  </div>
                  <span>ClimaStack v3.4</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-outline-variant"></div>

          {/* Dropdown de Usuário / Login */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
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
