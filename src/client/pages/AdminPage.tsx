import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { UserSanitized, AuditLog } from '../../shared/types.js';

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserSanitized[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    blockedUsers: 0,
    activeToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes, aRes] = await Promise.all([
        api.getUsers({ search, role: roleFilter }),
        api.getUserStats(),
        api.getAuditLogs(),
      ]);
      setUsers(uRes.users);
      setStats(sRes);
      setAuditLogs(aRes.logs);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao carregar painel administrativo.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleChangeRole = async (targetUser: UserSanitized) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmChange = window.confirm(
      `Deseja realmente alterar o papel de "${targetUser.name}" para "${newRole}"?`
    );
    if (!confirmChange) return;

    try {
      await api.updateUserRole(targetUser.id, newRole);
      setFeedbackMsg({ type: 'success', text: `Papel de ${targetUser.name} alterado para ${newRole}.` });
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar permissão.',
      });
    }
  };

  const handleToggleBlock = async (targetUser: UserSanitized) => {
    const willBlock = !targetUser.is_blocked;
    const confirmBlock = window.confirm(
      `Deseja realmente ${willBlock ? 'bloquear' : 'desbloquear'} o usuário "${targetUser.name}"?`
    );
    if (!confirmBlock) return;

    try {
      await api.toggleBlockUser(targetUser.id, willBlock);
      setFeedbackMsg({
        type: 'success',
        text: `Usuário ${targetUser.name} ${willBlock ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
      });
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao alterar status de bloqueio.',
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-6 flex flex-col gap-6">
      {/* Header do Painel */}
      <div className="w-full bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-surface-container-highest">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-primary font-bold bg-primary-fixed/40 px-2 py-0.5 rounded">
                Console IAM :: V2.4
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                D1 Sync: 100% Sincronizado
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">
              Gestão de Usuários & Controle de Acessos
            </h1>
            <p className="text-xs text-on-surface-variant max-w-3xl">
              Controle de permissões (<span className="font-mono font-bold text-tertiary">admin</span> e{' '}
              <span className="font-mono font-bold text-primary">user</span>), sessões ativas e auditoria de segurança integrada ao Cloudflare D1 e Redis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadData()}
              className="h-9 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-surface-container-highest transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
              <span>Sincronizar D1</span>
            </button>
            <button
              onClick={() => alert('Download do relatório CSV de conformidade.')}
              className="h-9 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-surface-container-highest transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
              <span>Exportar (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-sm font-bold">
            &times;
          </button>
        </div>
      )}

      {/* KPI Indicators Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Users */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Total de Usuários
            </span>
            <span className="p-1.5 rounded-lg bg-primary-fixed/40 text-primary">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.totalUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-primary bg-primary-fixed/30 px-1.5 py-0.5 rounded">
              D1 Ledger
            </span>
          </div>
          <div className="mt-2 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Cloudflare D1</span>
            <span className="text-primary">db_telemetry_users</span>
          </div>
        </div>

        {/* Card 2: Usuários Ativos Hoje */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Usuários Ativos Hoje
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-high text-primary">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.activeToday}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              Sessões Redis
            </span>
          </div>
          <div className="mt-2 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Cache de Sessões</span>
            <span>TTL: 86400s</span>
          </div>
        </div>

        {/* Card 3: Administradores */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Administradores
            </span>
            <span className="p-1.5 rounded-lg bg-tertiary-fixed text-tertiary">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.adminUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-tertiary bg-tertiary-fixed/60 px-1.5 py-0.5 rounded">
              Privilégio Total
            </span>
          </div>
          <div className="mt-2 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Papel: admin</span>
            <span className="text-tertiary">RBAC Ativo</span>
          </div>
        </div>

        {/* Card 4: Contas Bloqueadas */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Contas Bloqueadas
            </span>
            <span className="p-1.5 rounded-lg bg-red-100 text-red-700">
              <span className="material-symbols-outlined text-[20px]">gpp_bad</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 font-mono font-tabular">
              {stats.blockedUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
              Intervenção
            </span>
          </div>
          <div className="mt-2 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Defesa Redis</span>
            <span className="text-red-600">rate-limit/manual</span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Tabela de Usuários (3/4) + Auditoria (1/4) */}
      <div className="flex flex-col 2xl:flex-row gap-6 items-start">
        {/* Tabela de Usuários */}
        <div className="w-full 2xl:w-3/4 flex flex-col gap-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nome ou e-mail..."
                className="w-full h-10 pl-9 pr-4 bg-surface-container-low text-on-surface text-xs rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all border border-surface-container-highest"
              />
            </form>

            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-highest">
              {['all', 'admin', 'user'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    roleFilter === r ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  {r === 'all' ? 'Todos' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Usuários */}
          <div className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low font-mono text-[10px] uppercase text-outline font-bold border-b border-surface-container-highest">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Papel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Último Acesso</th>
                    <th className="py-3 px-4 text-right">Ações IAM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-highest">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant font-mono">
                        Nenhum usuário localizado.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isMe = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {u.name.substring(0, 2)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-on-surface flex items-center gap-1">
                                  {u.name}
                                  {isMe && (
                                    <span className="font-mono text-[9px] bg-primary text-white px-1 rounded font-normal">
                                      Você
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-on-surface-variant font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                u.role === 'admin'
                                  ? 'bg-tertiary-fixed text-tertiary'
                                  : 'bg-primary-fixed/50 text-primary'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.is_blocked ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                Bloqueado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Ativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleString('pt-BR')
                              : 'Nunca'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleChangeRole(u)}
                                disabled={isMe}
                                title={u.role === 'admin' ? 'Rebaixar para Usuário' : 'Promover a Administrador'}
                                className="px-2 py-1 bg-surface-container-low hover:bg-surface-container text-xs rounded border border-surface-container-highest transition-colors disabled:opacity-40"
                              >
                                {u.role === 'admin' ? 'Tornar User' : 'Tornar Admin'}
                              </button>
                              <button
                                onClick={() => handleToggleBlock(u)}
                                disabled={isMe}
                                className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-40 font-semibold ${
                                  u.is_blocked
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Barra Lateral: Feed de Auditoria de Segurança */}
        <div className="w-full 2xl:w-1/4 bg-white rounded-xl shadow-sm border border-surface-container-highest p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
              <h3 className="text-sm font-bold text-on-surface">Auditoria de Segurança</h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-on-surface-variant font-mono">Nenhum evento registrado ainda.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest flex flex-col gap-1 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">{log.action}</span>
                    <span className="font-mono text-[9px] text-outline">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-on-surface">
                    <strong>{log.actor_name || 'Sistema'}</strong>
                  </div>
                  {log.details && (
                    <div className="font-mono text-[10px] text-on-surface-variant truncate bg-white p-1 rounded border border-surface-container-highest/60">
                      {log.details}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
