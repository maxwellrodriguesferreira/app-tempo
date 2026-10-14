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
    pendingApproval: 0,
    activeToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    is_approved: true,
  });
  const [showCreatePass, setShowCreatePass] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSanitized | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    is_blocked: false,
    is_approved: true,
    password: '',
  });
  const [showEditPass, setShowEditPass] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, sRes, aRes] = await Promise.all([
        api.getUsers({ search, role: roleFilter, status: statusFilter }),
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
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Criação de Usuário
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createUser(createForm);
      setFeedbackMsg({
        type: 'success',
        text: `Usuário "${createForm.name}" cadastrado com sucesso!`,
      });
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        is_approved: true,
      });
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao cadastrar novo usuário.',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (user: UserSanitized) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_blocked: Boolean(user.is_blocked),
      is_approved: Boolean(user.is_approved),
      password: '',
    });
    setShowEditPass(false);
    setIsEditOpen(true);
  };

  // Salvar Edição de Usuário
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);

    try {
      const payload: {
        name: string;
        email: string;
        role: 'admin' | 'user';
        is_blocked: boolean;
        is_approved: boolean;
        password?: string;
      } = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_blocked: editForm.is_blocked,
        is_approved: editForm.is_approved,
      };

      if (editForm.password.trim().length > 0) {
        payload.password = editForm.password.trim();
      }

      await api.updateUser(editingUser.id, payload);
      setFeedbackMsg({
        type: 'success',
        text: `Dados de "${editForm.name}" atualizados com sucesso!`,
      });
      setIsEditOpen(false);
      setEditingUser(null);
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar alterações do usuário.',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Aprovação Rápida
  const handleApprove = async (user: UserSanitized) => {
    try {
      await api.approveUser(user.id, true);
      setFeedbackMsg({
        type: 'success',
        text: `Acesso do usuário "${user.name}" aprovado com sucesso!`,
      });
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao aprovar usuário.',
      });
    }
  };

  // Exclusão de Usuário
  const handleDeleteUser = async (user: UserSanitized) => {
    const isMe = currentUser?.id === user.id;
    if (isMe) {
      alert('Você não pode excluir sua própria conta de administrador.');
      return;
    }

    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente excluir permanentemente o usuário "${user.name}" (${user.email})?\nEsta ação apagará os dados, cidades favoritas e revogará todas as sessões ativas.`
    );
    if (!confirmed) return;

    try {
      await api.deleteUser(user.id);
      setFeedbackMsg({
        type: 'success',
        text: `Usuário "${user.name}" removido com sucesso.`,
      });
      loadData();
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao remover usuário.',
      });
    }
  };

  // Alternar Bloqueio
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
                Console IAM :: Gerenciamento Completo
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
              CRUD administrativo completo: criação de contas, aceite/aprovação prévia de acesso, redefinição de senhas, bloqueio emergencial e auditoria integrada ao Cloudflare D1 e Redis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="h-9 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Novo Usuário</span>
            </button>
            <button
              onClick={() => loadData()}
              className="h-9 px-3 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-surface-container-highest transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
              <span>Sincronizar D1</span>
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

      {/* KPI Indicators Bar (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Users */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Total de Usuários
            </span>
            <span className="p-1.5 rounded-lg bg-primary-fixed/40 text-primary">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.totalUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-primary bg-primary-fixed/30 px-1.5 py-0.5 rounded">
              D1 Ledger
            </span>
          </div>
          <div className="mt-1 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Cadastros</span>
            <span className="text-primary">Ativos</span>
          </div>
        </div>

        {/* Card 2: Pendentes de Aceite (Destaque) */}
        <div
          className={`p-4 rounded-xl shadow-sm border flex flex-col justify-between transition-colors ${
            stats.pendingApproval > 0
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-surface-container-highest'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-800 font-bold">
              Pendentes de Aceite
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                stats.pendingApproval > 0
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono font-tabular">
              {stats.pendingApproval}
            </span>
            {stats.pendingApproval > 0 ? (
              <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded animate-pulse">
                Requer Ação
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-semibold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                Zerado
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-amber-900/70 flex justify-between font-mono">
            <span>Aguardando Aceite</span>
            <span className="font-bold">{stats.pendingApproval > 0 ? 'Bloqueados até aceite' : 'Todos liberados'}</span>
          </div>
        </div>

        {/* Card 3: Administradores */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Administradores
            </span>
            <span className="p-1.5 rounded-lg bg-tertiary-fixed text-tertiary">
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.adminUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-tertiary bg-tertiary-fixed/60 px-1.5 py-0.5 rounded">
              Privilégio Total
            </span>
          </div>
          <div className="mt-1 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Papel: admin</span>
            <span className="text-tertiary">RBAC Ativo</span>
          </div>
        </div>

        {/* Card 4: Contas Bloqueadas */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Contas Bloqueadas
            </span>
            <span className="p-1.5 rounded-lg bg-red-100 text-red-700">
              <span className="material-symbols-outlined text-[18px]">gpp_bad</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600 font-mono font-tabular">
              {stats.blockedUsers}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
              Intervenção
            </span>
          </div>
          <div className="mt-1 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>Defesa Redis</span>
            <span className="text-red-600">Manual / Lockout</span>
          </div>
        </div>

        {/* Card 5: Usuários Ativos Hoje */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              Sessões Ativas
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-high text-primary">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-on-surface font-mono font-tabular">
              {stats.activeToday}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              Redis Edge
            </span>
          </div>
          <div className="mt-1 text-[10px] text-on-surface-variant flex justify-between font-mono">
            <span>TTL</span>
            <span>86400s</span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Tabela de Usuários (3/4) + Auditoria (1/4) */}
      <div className="flex flex-col 2xl:flex-row gap-6 items-start">
        {/* Tabela de Usuários */}
        <div className="w-full 2xl:w-3/4 flex flex-col gap-4">
          {/* Barra de Filtros Integrados */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-surface-container-highest flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuário por nome ou e-mail..."
                className="w-full h-10 pl-9 pr-4 bg-surface-container-low text-on-surface text-xs rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-primary transition-all border border-surface-container-highest"
              />
            </form>

            {/* Filtro por Papel */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-highest">
              <span className="text-[10px] font-mono text-outline px-1.5 uppercase font-bold">Papel:</span>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'admin', label: 'Admins' },
                { key: 'user', label: 'Users' },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRoleFilter(r.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    roleFilter === r.key ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Filtro por Status de Aceite */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container-highest">
              <span className="text-[10px] font-mono text-outline px-1.5 uppercase font-bold">Status:</span>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'pending', label: 'Pendentes' },
                { key: 'approved', label: 'Aprovados' },
                { key: 'blocked', label: 'Bloqueados' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === s.key ? 'bg-white text-on-surface shadow-xs font-bold' : 'text-on-surface-variant'
                  }`}
                >
                  {s.label}
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
                    <th className="py-3 px-4">Aprovação / Aceite</th>
                    <th className="py-3 px-4">Status Conta</th>
                    <th className="py-3 px-4">Último Acesso</th>
                    <th className="py-3 px-4 text-right">Ações IAM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-highest">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant font-mono">
                        Carregando registros do Cloudflare D1...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant font-mono">
                        Nenhum usuário localizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isMe = currentUser?.id === u.id;
                      const isPending = u.role !== 'admin' && !Boolean(u.is_approved);

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
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                                Pendente de Aceite
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Aprovado
                              </span>
                            )}
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
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Botão de Aceite Rápido se estiver pendente */}
                              {isPending && (
                                <button
                                  onClick={() => handleApprove(u)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 shadow-xs"
                                  title="Aprovar e liberar acesso à plataforma"
                                >
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  <span>Aprovar</span>
                                </button>
                              )}

                              {/* Botão Editar Usuário */}
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="px-2 py-1 bg-surface-container-low hover:bg-surface-container text-xs font-semibold rounded border border-surface-container-highest transition-colors flex items-center gap-1"
                                title="Editar dados, permissões e redefinir senha"
                              >
                                <span className="material-symbols-outlined text-[14px] text-primary">edit</span>
                                <span>Editar</span>
                              </button>

                              {/* Botão Bloquear / Desbloquear */}
                              <button
                                onClick={() => handleToggleBlock(u)}
                                disabled={isMe}
                                className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-40 font-semibold ${
                                  u.is_blocked
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                                title={u.is_blocked ? 'Desbloquear conta' : 'Bloquear conta'}
                              >
                                {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                              </button>

                              {/* Botão Excluir Usuário */}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isMe}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30"
                                title="Excluir usuário permanentemente"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
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

      {/* MODAL 1: CRIAÇÃO DE NOVO USUÁRIO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-container-highest w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-surface-container-highest pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </span>
                <h3 className="text-base font-bold text-on-surface">Cadastrar Novo Usuário</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-on-surface text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full h-9 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="usuario@climastack.io"
                  className="w-full h-9 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Senha Provisória</label>
                <div className="relative">
                  <input
                    type={showCreatePass ? 'text' : 'password'}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres, maiúscula e número"
                    className="w-full h-9 pl-3 pr-10 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePass(!showCreatePass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showCreatePass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Papel de Acesso</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'user' })}
                    className="w-full h-9 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Aceite de Acesso</label>
                  <select
                    value={createForm.is_approved ? 'true' : 'false'}
                    onChange={(e) => setCreateForm({ ...createForm, is_approved: e.target.value === 'true' })}
                    className="w-full h-9 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Aprovado Imediato</option>
                    <option value="false">Pendente de Aceite</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-highest mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {createLoading ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIÇÃO DE USUÁRIO EXISTENTE */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-container-highest w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-surface-container-highest pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                </span>
                <h3 className="text-base font-bold text-on-surface">Editar Usuário</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-on-surface-variant hover:text-on-surface text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Papel</label>
                  <select
                    value={editForm.role}
                    disabled={currentUser?.id === editingUser.id}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                    className="w-full h-9 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Status de Aceite</label>
                  <select
                    value={editForm.is_approved ? 'true' : 'false'}
                    disabled={currentUser?.id === editingUser.id}
                    onChange={(e) => setEditForm({ ...editForm, is_approved: e.target.value === 'true' })}
                    className="w-full h-9 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="true">Acesso Aprovado</option>
                    <option value="false">Pendente de Aceite</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Status da Conta</label>
                <select
                  value={editForm.is_blocked ? 'blocked' : 'active'}
                  disabled={currentUser?.id === editingUser.id}
                  onChange={(e) => setEditForm({ ...editForm, is_blocked: e.target.value === 'blocked' })}
                  className="w-full h-9 px-2 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="active">Conta Ativa</option>
                  <option value="blocked">Conta Bloqueada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Redefinir Senha <span className="text-outline font-normal">(deixe em branco para manter)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Nova senha (mínimo 8 caracteres, maiúscula e número)"
                    className="w-full h-9 pl-3 pr-10 bg-surface-container-low border border-surface-container-highest rounded-lg text-xs text-on-surface outline-none focus:bg-white focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showEditPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-highest mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
