/**
 * Aquinos Frios - User Management & Security Panel
 * Painel Exclusivo do Superadmin (amaryelcc@gmail.com) para Controle de Acessos, Bloqueio/Desbloqueio e Perfis.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Crown,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  Mail,
  ShieldAlert,
  KeyRound,
  Check,
  Ban,
  Database,
  Edit2,
  Eye,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { User, UserRole, Company } from '../types';
import { storage, SUPERADMIN_EMAIL } from '../services/storage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');

  // Company Form State
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyDoc, setCompanyDoc] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companySupabaseUrl, setCompanySupabaseUrl] = useState('');
  const [companySupabaseKey, setCompanySupabaseKey] = useState('');

  // Password reset inline state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const loadData = () => {
    setUsers(storage.getUsers());
    const comps = storage.getCompanies();
    setCompanies(comps);
    if (comps.length > 0 && !newUserCompanyId) {
      setNewUserCompanyId(comps[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuper = currentUser.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser.role === 'superadmin';

  // --- USER ACTIONS ---
  const handleToggleBlock = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal não pode ser bloqueado.' });
      return;
    }

    const res = storage.toggleBlockUser(targetUser.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Status do usuário ${targetUser.name} alterado para: ${res.is_blocked ? 'BLOQUEADO' : 'ATIVO'}.`,
      });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar bloqueio.' });
    }
  };

  const handleToggleApproval = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal está sempre liberado.' });
      return;
    }

    const res = storage.toggleUserApproval(targetUser.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Acesso do usuário ${targetUser.name} alterado para: ${res.is_approved ? 'LIBERADO' : 'PENDENTE'}.`,
      });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar liberação de acesso.' });
    }
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const res = storage.updateUserRole(userId, newRole);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Função do usuário atualizada com sucesso.' });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar função.' });
    }
  };

  const handleCompanyChange = (userId: string, companyId: string) => {
    const res = storage.updateUserCompany(userId, companyId);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Usuário vinculado à empresa com sucesso.' });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar empresa.' });
    }
  };

  const handleDeleteUser = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal não pode ser excluído.' });
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o usuário ${targetUser.name}?`)) {
      return;
    }

    const res = storage.deleteUser(targetUser.id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Usuário ${targetUser.name} excluído do sistema.` });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao excluir usuário.' });
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome e o e-mail do usuário.' });
      return;
    }

    const res = storage.registerUser({
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword || '123456',
      role: newUserRole,
      company_id: newUserCompanyId,
    });

    if (res.success) {
      setFeedback({ type: 'success', message: `Usuário ${newUserName} cadastrado com sucesso!` });
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao cadastrar usuário.' });
    }
  };

  const handleSaveResetPassword = (userId: string) => {
    if (!resetPasswordValue || resetPasswordValue.length < 3) {
      setFeedback({ type: 'error', message: 'A nova senha deve conter pelo menos 3 caracteres.' });
      return;
    }

    const res = storage.updateUserPassword(userId, resetPasswordValue);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Senha redefinida com sucesso!' });
      setResettingUserId(null);
      setResetPasswordValue('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar senha.' });
    }
  };

  // --- COMPANY ACTIONS ---
  const handleOpenNewCompany = () => {
    setEditingCompany(null);
    setCompanyName('');
    setCompanyDoc('');
    setCompanyPhone('');
    setCompanyAddress('');
    setCompanyEmail('');
    setCompanySupabaseUrl('');
    setCompanySupabaseKey('');
    setIsAddingCompany(true);
  };

  const handleOpenEditCompany = (comp: Company) => {
    setEditingCompany(comp);
    setCompanyName(comp.name);
    setCompanyDoc(comp.document);
    setCompanyPhone(comp.phone || '');
    setCompanyAddress(comp.address || '');
    setCompanyEmail(comp.email || '');
    setCompanySupabaseUrl(comp.supabase_url || '');
    setCompanySupabaseKey(comp.supabase_key || '');
    setIsAddingCompany(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !companyDoc.trim()) {
      setFeedback({ type: 'error', message: 'Informe a Razão Social/Nome e o CNPJ/CPF da empresa.' });
      return;
    }

    const res = storage.saveCompany({
      id: editingCompany ? editingCompany.id : undefined,
      name: companyName,
      document: companyDoc,
      phone: companyPhone,
      address: companyAddress,
      email: companyEmail,
      supabase_url: companySupabaseUrl,
      supabase_key: companySupabaseKey,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: editingCompany ? 'Dados da empresa atualizados com sucesso!' : 'Nova empresa cadastrada no sistema!',
      });
      setIsAddingCompany(false);
      setEditingCompany(null);
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao salvar empresa.' });
    }
  };

  const handleToggleCompanyStatus = (comp: Company) => {
    const res = storage.toggleCompanyStatus(comp.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Status da empresa ${comp.name} alterado para: ${res.status === 'active' ? 'ATIVA' : 'INATIVA'}.`,
      });
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar status da empresa.' });
    }
  };

  const handleSelectCompanyView = (companyId: string | null) => {
    storage.setSuperadminSelectedCompanyId(companyId);
    const selectedComp = companyId ? companies.find((c) => c.id === companyId) : null;
    setFeedback({
      type: 'success',
      message: selectedComp
        ? `Visão alternada para a empresa: ${selectedComp.name}. Agora você está gerenciando os dados deste cliente.`
        : 'Visão restaurada para a empresa padrão.',
    });
    loadData();
  };

  const currentSelectedCompanyId = storage.getSuperadminSelectedCompanyId();
  const activeCompany = storage.getCurrentUserCompany();
  const pendingUsersCount = users.filter((u) => u.is_approved === false).length;

  const filteredUsers =
    companyFilter === 'all' ? users : users.filter((u) => u.company_id === companyFilter);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Painel de Controle Superadmin & White Label
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie liberação de usuários, altere permissões de Superadmin e cadastre empresas parceiras.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {isSuper && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-6 gap-2 pt-2">
            <button
              onClick={() => {
                setActiveTab('users');
                setFeedback(null);
              }}
              className={`py-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Gestão de Usuários & Acessos ({users.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('companies');
                setFeedback(null);
              }}
              className={`py-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'companies'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Empresas & White Label ({companies.length})</span>
            </button>
          </div>
        )}

        {/* Access Denial if not Superadmin */}
        {!isSuper ? (
          <div className="p-8 text-center my-auto space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Acesso Restrito ao Superadmin Principal
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Apenas a conta principal <strong className="text-amber-500">{SUPERADMIN_EMAIL}</strong> possui
              autorização para gerenciar permissões e empresas parceiras.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Feedback Banners */}
            {feedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                <button
                  onClick={() => setFeedback(null)}
                  className="text-xs font-bold hover:underline opacity-80"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* TAB 1: USERS MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Pending Requests Alert Banner */}
                {pendingUsersCount > 0 && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Há <strong>{pendingUsersCount} solicitação(ões) de cadastro pendente(s)</strong> aguardando sua liberação de acesso.</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Aqui você pode **liberar acessos**, promover usuários a **Superadmin** e **vincular usuários às suas empresas**.
                  </p>

                  <div className="flex items-center gap-2">
                    {/* Company Filter Dropdown */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                      <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <select
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="bg-transparent font-extrabold outline-none cursor-pointer"
                      >
                        <option value="all">Todas as Empresas ({users.length})</option>
                        {companies.map((c) => {
                          const count = users.filter((u) => u.company_id === c.id).length;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} ({count} usúarios)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <button
                      onClick={() => setIsAddingUser(!isAddingUser)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingUser ? 'Cancelar' : 'Cadastrar Usuário'}</span>
                    </button>
                  </div>
                </div>

                {/* Add New User Form */}
                {isAddingUser && (
                  <form
                    onSubmit={handleCreateUser}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3"
                  >
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span>Cadastrar Novo Usuário</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="ex: Roberto Silva"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          E-mail de Acesso
                        </label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="ex: roberto@empresa.com.br"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Senha Inicial
                        </label>
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Senha padrão (ex: 123456)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Nível de Permissão
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                        >
                          <option value="superadmin">Superadmin (Controle Total)</option>
                          <option value="admin">Administrador (Empresa)</option>
                          <option value="funcionario">Funcionário (Operação)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Empresa Vinculada
                        </label>
                        <select
                          value={newUserCompanyId}
                          onChange={(e) => setNewUserCompanyId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.document})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                      >
                        Salvar Usuário
                      </button>
                    </div>
                  </form>
                )}

                {/* Users Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Usuário</th>
                          <th className="py-3 px-4">Empresa Vinculada</th>
                          <th className="py-3 px-4">Função / Perfil</th>
                          <th className="py-3 px-4">Liberação de Acesso</th>
                          <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredUsers.map((u) => {
                          const isMainSuper = u.email.toLowerCase() === SUPERADMIN_EMAIL;
                          const userComp = companies.find((c) => c.id === u.company_id);

                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                                u.is_blocked
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                  : u.is_approved === false
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                  : ''
                              }`}
                            >
                              <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                                      isMainSuper || u.role === 'superadmin'
                                        ? 'bg-amber-500 shadow-sm'
                                        : u.role === 'admin'
                                        ? 'bg-blue-600'
                                        : 'bg-slate-600'
                                    }`}
                                  >
                                    {isMainSuper || u.role === 'superadmin' ? (
                                      <Crown className="w-4 h-4" />
                                    ) : (
                                      u.name.substring(0, 1).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <span className="block font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                      {u.name}
                                      {isMainSuper && (
                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                                          SUPERADMIN
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                                      {u.email}
                                    </span>
                                  </div>
                                </div>

                                {/* Reset Password Form Inline */}
                                {resettingUserId === u.id && (
                                  <div className="mt-2.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2">
                                    <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                    <input
                                      type="text"
                                      value={resetPasswordValue}
                                      onChange={(e) => setResetPasswordValue(e.target.value)}
                                      placeholder="Nova Senha"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded font-mono"
                                    />
                                    <button
                                      onClick={() => handleSaveResetPassword(u.id)}
                                      className="px-2 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      onClick={() => setResettingUserId(null)}
                                      className="px-2 py-1 bg-slate-400 text-white font-bold text-[10px] rounded"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Empresa Vinculada */}
                              <td className="py-3.5 px-4">
                                {isMainSuper ? (
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {userComp?.name || 'Todas as Empresas'}
                                  </span>
                                ) : (
                                  <select
                                    value={u.company_id || companies[0]?.id || ''}
                                    onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[160px] truncate"
                                  >
                                    {companies.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              {/* Role selection (Superadmin, Admin, Funcionario) */}
                              <td className="py-3.5 px-4">
                                {isMainSuper ? (
                                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px]">
                                    Superadmin Principal
                                  </span>
                                ) : (
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                                  >
                                    <option value="superadmin">Superadmin</option>
                                    <option value="admin">Admin</option>
                                    <option value="funcionario">Funcionário</option>
                                  </select>
                                )}
                              </td>

                              {/* Status de Liberação (is_approved) */}
                              <td className="py-3.5 px-4">
                                {u.is_blocked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                                    <UserX className="w-3 h-3" /> BLOQUEADO
                                  </span>
                                ) : u.is_approved === false ? (
                                  <button
                                    onClick={() => handleToggleApproval(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm transition active:scale-95 animate-bounce"
                                    title="Clique para liberar acesso do usuário"
                                  >
                                    <Lock className="w-3.5 h-3.5" /> LIBERAR ACESSO
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleApproval(u)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-800 transition"
                                    title="Acesso liberado. Clique para suspender liberação."
                                  >
                                    <UserCheck className="w-3.5 h-3.5" /> LIBERADO
                                  </button>
                                )}
                              </td>

                              {/* Security Actions */}
                              <td className="py-3.5 px-4 text-right">
                                {!isMainSuper ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleToggleBlock(u)}
                                      className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition ${
                                        u.is_blocked
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-600 hover:text-white'
                                      }`}
                                      title={u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                    >
                                      {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setResettingUserId(u.id);
                                        setResetPasswordValue('');
                                      }}
                                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg"
                                      title="Redefinir Senha"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      className="p-1.5 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-600 dark:text-rose-400 rounded-lg"
                                      title="Excluir Usuário"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-500 italic">
                                    Protegido
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPANIES MANAGEMENT (WHITE LABEL / MULTI-TENANT) */}
            {activeTab === 'companies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Cadastre e gerencie empresas contratantes do sistema White-Label. Cada empresa possui seu CNPJ e dados de contato para emissão de notas/comprovantes.
                  </p>

                  <button
                    onClick={handleOpenNewCompany}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Nova Empresa</span>
                  </button>
                </div>

                {/* Company Add / Edit Form */}
                {isAddingCompany && (
                  <form
                    onSubmit={handleSaveCompany}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3"
                  >
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span>{editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa Partner'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Razão Social / Nome Fantasia
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="ex: Aquino Frios Distribuidora"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          CNPJ ou CPF
                        </label>
                        <input
                          type="text"
                          required
                          value={companyDoc}
                          onChange={(e) => setCompanyDoc(e.target.value)}
                          placeholder="ex: 30.404.812/0001-63"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Telefone de Contato (Impresso no Cupom)
                        </label>
                        <input
                          type="text"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="ex: (88) 99999-0000"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Endereço Completo
                        </label>
                        <input
                          type="text"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          placeholder="ex: Av. Comercial, 100 - Centro"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          E-mail Corporativo
                        </label>
                        <input
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="ex: contato@empresa.com.br"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Supabase REST URL (Opcional - Banco Próprio)
                        </label>
                        <input
                          type="text"
                          value={companySupabaseUrl}
                          onChange={(e) => setCompanySupabaseUrl(e.target.value)}
                          placeholder="https://xyz.supabase.co"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCompany(false);
                          setEditingCompany(null);
                        }}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                      >
                        Salvar Empresa
                      </button>
                    </div>
                  </form>
                )}

                {/* Companies List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.map((c) => {
                    const companyUsersCount = users.filter((u) => u.company_id === c.id).length;

                    return (
                      <div
                        key={c.id}
                        className={`p-4 rounded-2xl border transition ${
                          c.status === 'blocked'
                            ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-500" />
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {c.name}
                              </h4>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                              CNPJ/CPF: {c.document}
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {c.status === 'active' ? 'LIBERADA / ATIVA' : 'INATIVA / SUSPENSA'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                          {c.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.phone}</span>
                            </p>
                          )}
                          {c.address && (
                            <p className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.address}</span>
                            </p>
                          )}
                          <p className="flex items-center gap-2 text-slate-500">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{companyUsersCount} Usuário(s) vinculado(s)</span>
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            onClick={() => {
                              handleSelectCompanyView(c.id);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
                            title={`Visualizar dados e operações da empresa ${c.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar Esta Empresa</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditCompany(c)}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>

                            <button
                              onClick={() => handleToggleCompanyStatus(c)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                c.status === 'active'
                                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              {c.status === 'active' ? 'Suspender' : 'Liberar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
};
