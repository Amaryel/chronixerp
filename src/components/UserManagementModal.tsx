/**
 * Chronix ERP - Superadmin & Multi-Tenant Management Panel
 * Painel em Tela Cheia para Controle Total do Superadmin:
 * - Gestão de Empresas por CNPJ
 * - Upload de Logotipos customizados (PWA & Sistema)
 * - Cores de Tema & Título PWA
 * - Dashboards Globais & Métricas Multi-Empresas
 * - Gestão de Usuários, Senhas e Acessos
 * - Visualização/Alternância direta de Empresa Ativa
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Crown,
  Shield,
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
  Edit2,
  Eye,
  Filter,
  Upload,
  Palette,
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
} from 'lucide-react';
import { User, UserRole, Company } from '../types';
import { storage, SUPERADMIN_EMAIL, chronixLogoImg } from '../services/storage';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRefresh?: () => void;
}

const PRESET_THEME_COLORS = [
  { name: 'Azul Chronix', hex: '#0284c7' },
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Verde Esmeralda', hex: '#16a34a' },
  { name: 'Roxo Imperial', hex: '#7c3aed' },
  { name: 'Laranja Fogo', hex: '#ea580c' },
  { name: 'Vermelho Ruby', hex: '#dc2626' },
  { name: 'Ciano Neonis', hex: '#06b6d4' },
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'companies' | 'dashboards' | 'users'>('companies');
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyThemeColor, setCompanyThemeColor] = useState('#0284c7');
  const [companyPwaTitle, setCompanyPwaTitle] = useState('');
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

  // File Upload Helper (converts image file to Base64 data URL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'A imagem deve ser menor que 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setCompanyLogoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
      onRefresh?.();
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
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar liberação de acesso.' });
    }
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const res = storage.updateUserRole(userId, newRole);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Função do usuário atualizada com sucesso.' });
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar função.' });
    }
  };

  const handleCompanyChange = (userId: string, companyId: string) => {
    const res = storage.updateUserCompany(userId, companyId);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Usuário vinculado à empresa com sucesso.' });
      loadData();
      onRefresh?.();
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
      onRefresh?.();
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
      onRefresh?.();
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
      onRefresh?.();
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
    setCompanyLogoUrl(chronixLogoImg);
    setCompanyThemeColor('#0284c7');
    setCompanyPwaTitle('');
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
    setCompanyLogoUrl(comp.logo_url || chronixLogoImg);
    setCompanyThemeColor(comp.theme_color || '#0284c7');
    setCompanyPwaTitle(comp.pwa_title || `${comp.name} ERP`);
    setCompanySupabaseUrl(comp.supabase_url || '');
    setCompanySupabaseKey(comp.supabase_key || '');
    setIsAddingCompany(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !companyDoc.trim()) {
      setFeedback({ type: 'error', message: 'Informe a Razão Social/Nome e o CNPJ da empresa.' });
      return;
    }

    const res = storage.saveCompany({
      id: editingCompany ? editingCompany.id : undefined,
      name: companyName,
      document: companyDoc,
      phone: companyPhone,
      address: companyAddress,
      email: companyEmail,
      logo_url: companyLogoUrl || chronixLogoImg,
      theme_color: companyThemeColor,
      pwa_title: companyPwaTitle || `${companyName.trim()} ERP`,
      supabase_url: companySupabaseUrl,
      supabase_key: companySupabaseKey,
    });

    if (res.success) {
      setFeedback({
        type: 'success',
        message: editingCompany ? 'Empresa e logotipo atualizados com sucesso!' : 'Nova empresa cadastrada com logotipo!',
      });
      setIsAddingCompany(false);
      setEditingCompany(null);
      loadData();
      onRefresh?.();
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
      onRefresh?.();
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
        ? `Visão alternada para a empresa: ${selectedComp.name} (CNPJ: ${selectedComp.document}).`
        : 'Visão do sistema restaurada para a empresa padrão.',
    });
    loadData();
    onRefresh?.();
  };

  const currentSelectedCompanyId = storage.getSuperadminSelectedCompanyId();
  const activeCompany = storage.getCurrentUserCompany();

  const filteredUsers =
    companyFilter === 'all' ? users : users.filter((u) => u.company_id === companyFilter);

  // Global Multi-Company Metrics Calculation
  const allProducts = storage.getProducts();
  const totalStockValuation = allProducts.reduce((acc, p) => acc + (p.current_stock * (p.cost_price || p.sale_price || 0)), 0);
  const activeCompaniesCount = companies.filter((c) => c.status === 'active').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden text-slate-100 font-sans select-none">
      {/* FULLSCREEN TOP NAVBAR */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-950 rounded-2xl border border-cyan-500/40 shadow-inner">
            <img
              src={chronixLogoImg}
              alt="Chronix ERP Logo"
              className="w-9 h-9 rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Painel Superadmin Chronix ERP
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-400" />
                Acesso Master
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Gestão de CNPJs, Logotipos PWA, Visualização de Empresas & Usuários
            </p>
          </div>
        </div>

        {/* Active Company Switcher Indicator in Top Right */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <img
                src={activeCompany.logo_url || chronixLogoImg}
                alt={activeCompany.name}
                className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-cyan-500/30"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa em Visualização:</span>
                <span className="block text-xs font-black text-cyan-300">{activeCompany.name}</span>
              </div>
            </div>

            {currentSelectedCompanyId && (
              <button
                onClick={() => handleSelectCompanyView(null)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[10px] font-bold transition"
                title="Restaurar para a empresa padrão"
              >
                Resetar Visão
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-rose-900/80 hover:text-white text-slate-300 transition border border-slate-700 flex items-center gap-1.5 font-bold text-xs"
            title="Sair do Painel Superadmin"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Fechar Painel</span>
          </button>
        </div>
      </header>

      {/* FULLSCREEN TABS HEADER */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('companies');
              setFeedback(null);
            }}
            className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition ${
              activeTab === 'companies'
                ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Empresas & Logotipos CNPJ ({companies.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('dashboards');
              setFeedback(null);
            }}
            className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition ${
              activeTab === 'dashboards'
                ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Dashboards & Analytics Globais</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              setFeedback(null);
            }}
            className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Gestão de Usuários & Acessos ({users.length})</span>
          </button>
        </div>

        {activeTab === 'companies' && (
          <button
            onClick={handleOpenNewCompany}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Empresa</span>
          </button>
        )}
      </div>

      {/* FULLSCREEN MAIN CONTENT BODY */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-700/80'
                : 'bg-rose-950/90 text-rose-200 border border-rose-700/80'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
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

        {/* TAB 1: COMPANIES & LOGO CONFIGURATION */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            {/* Modal / Inline Form for Add or Edit Company */}
            {isAddingCompany && (
              <div className="p-6 bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-cyan-400" />
                    <h3 className="font-black text-base text-white">
                      {editingCompany ? `Editar Empresa: ${editingCompany.name}` : 'Cadastrar Nova Empresa Parceira'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCompany(false);
                      setEditingCompany(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCompany} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Razão Social / Nome Fantasia *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="ex: Chronix Frios Ltda"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        CNPJ ou CPF *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyDoc}
                        onChange={(e) => setCompanyDoc(e.target.value)}
                        placeholder="ex: 00.000.000/0001-99"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Telefone de Contato (Cupom)
                      </label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="ex: (11) 4004-9000"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Endereço Completo
                      </label>
                      <input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="ex: Av. Paulista, 1000 - São Paulo, SP"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        E-mail Corporativo de Acesso
                      </label>
                      <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="ex: contato@empresa.com.br"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Título Personalizado do PWA
                      </label>
                      <input
                        type="text"
                        value={companyPwaTitle}
                        onChange={(e) => setCompanyPwaTitle(e.target.value)}
                        placeholder="ex: Chronix ERP - Frios"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* CUSTOM LOGO & BRAND COLOR SECTION */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-cyan-400" />
                        <label className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Logotipo da Empresa (Sistema e PWA)
                        </label>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-900 rounded-2xl border-2 border-cyan-500/40 flex items-center justify-center p-1.5 shrink-0 shadow-lg relative group">
                          <img
                            src={companyLogoUrl || chronixLogoImg}
                            alt="Preview Logo"
                            className="w-full h-full object-contain rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="space-y-2 flex-1">
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-extrabold transition shadow-md">
                            <Upload className="w-4 h-4" />
                            <span>Enviar Imagem (PNG/JPG)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[11px] text-slate-400 font-medium">
                            A logo será exibida na tela de login ao identificar o e-mail/CNPJ, no topo do sistema e no ícone do PWA.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Theme Color Picker */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-blue-400" />
                        <label className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Cor Primária da Empresa
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_THEME_COLORS.map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setCompanyThemeColor(preset.hex)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition border-2 ${
                              companyThemeColor === preset.hex
                                ? 'border-white scale-110 shadow-lg'
                                : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          >
                            {companyThemeColor === preset.hex && <Check className="w-4 h-4 text-white" />}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-slate-400 font-bold">Hex:</span>
                        <input
                          type="text"
                          value={companyThemeColor}
                          onChange={(e) => setCompanyThemeColor(e.target.value)}
                          className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-cyan-300 w-28"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCompany(false);
                        setEditingCompany(null);
                      }}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95"
                    >
                      {editingCompany ? 'Salvar Alterações da Empresa' : 'Cadastrar Empresa com Logo'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Companies Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((c) => {
                const companyUsersCount = users.filter((u) => u.company_id === c.id).length;
                const isCurrentViewing = activeCompany.id === c.id;

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-3xl border transition flex flex-col justify-between relative overflow-hidden shadow-xl ${
                      isCurrentViewing
                        ? 'bg-slate-900 border-cyan-500/80 ring-2 ring-cyan-500/30'
                        : c.status === 'blocked'
                        ? 'bg-rose-950/20 border-rose-900/60'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Accent Line with Theme Color */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: c.theme_color || '#0284c7' }}
                    />

                    <div>
                      {/* Header Logo + Status */}
                      <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-950 rounded-2xl border border-cyan-500/30 p-1 flex items-center justify-center shrink-0 shadow-md">
                            <img
                              src={c.logo_url || chronixLogoImg}
                              alt={c.name}
                              className="w-full h-full object-contain rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-base text-white leading-tight">
                              {c.name}
                            </h4>
                            <span className="text-xs font-mono font-bold text-cyan-400 block mt-0.5">
                              CNPJ: {c.document}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-black rounded-full border shrink-0 ${
                            c.status === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {c.status === 'active' ? 'ATIVA' : 'SUSPENSA'}
                        </span>
                      </div>

                      {/* Info details */}
                      <div className="space-y-1.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                        {c.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </p>
                        )}
                        {c.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{c.phone}</span>
                          </p>
                        )}
                        {c.address && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-2 text-slate-400 font-medium">
                          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{companyUsersCount} Usuário(s) cadastrado(s)</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleSelectCompanyView(c.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                          isCurrentViewing
                            ? 'bg-cyan-500 text-slate-950 shadow-lg font-black'
                            : 'bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-200'
                        }`}
                        title="Alternar para visualizar o sistema como esta empresa"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isCurrentViewing ? 'Empresa Ativa Agora' : 'Visualizar Empresa'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditCompany(c)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                          title="Editar CNPJ, Telefone ou Logotipo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleToggleCompanyStatus(c)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                            c.status === 'active'
                              ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800'
                              : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800'
                          }`}
                        >
                          {c.status === 'active' ? 'Suspender' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: GLOBAL MULTI-COMPANY DASHBOARDS */}
        {activeTab === 'dashboards' && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total de Empresas</span>
                  <div className="text-2xl font-black text-white">{companies.length}</div>
                  <span className="text-[11px] text-emerald-400 font-bold">{activeCompaniesCount} ativas no sistema</span>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total de Usuários</span>
                  <div className="text-2xl font-black text-white">{users.length}</div>
                  <span className="text-[11px] text-slate-400 font-medium">Contas registradas</span>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Produtos de Estoque</span>
                  <div className="text-2xl font-black text-white">{allProducts.length}</div>
                  <span className="text-[11px] text-blue-400 font-bold">Catálogo geral</span>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Patrimônio do Estoque</span>
                  <div className="text-xl font-black text-amber-300">
                    R$ {totalStockValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Valor em mercadorias</span>
                </div>
              </div>
            </div>

            {/* Companies Performance Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <span>Resumo Operacional por Empresa Cadastrada</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-800">
                    <tr>
                      <th className="p-3 rounded-l-xl">Empresa</th>
                      <th className="p-3">CNPJ</th>
                      <th className="p-3">Usuários</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right rounded-r-xl">Ação Direta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {companies.map((c) => {
                      const uCount = users.filter((u) => u.company_id === c.id).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-white flex items-center gap-2.5">
                            <img
                              src={c.logo_url || chronixLogoImg}
                              alt={c.name}
                              className="w-7 h-7 rounded-lg object-contain bg-slate-950 border border-cyan-500/30 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <span>{c.name}</span>
                          </td>
                          <td className="p-3 font-mono text-cyan-300">{c.document}</td>
                          <td className="p-3">{uCount} usuário(s)</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}>
                              {c.status === 'active' ? 'ATIVA' : 'SUSPENSA'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleSelectCompanyView(c.id)}
                              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-[11px] transition"
                            >
                              Visualizar Empresa
                            </button>
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

        {/* TAB 3: USER MANAGEMENT & ACCESS CONTROL */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filter & Add User Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-3xl">
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">Filtrar por Empresa:</span>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none"
                >
                  <option value="all">Todas as Empresas ({users.length})</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
            </div>

            {/* Add User Form */}
            {isAddingUser && (
              <form onSubmit={handleCreateUser} className="p-5 bg-slate-900 border border-emerald-500/30 rounded-3xl space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Cadastrar Novo Usuário no Sistema
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nome Completo *"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="E-mail *"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Senha *"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none"
                  />
                  <select
                    value={newUserCompanyId}
                    onChange={(e) => setNewUserCompanyId(e.target.value)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Salvar Usuário
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Usuário</th>
                      <th className="p-3.5">E-mail</th>
                      <th className="p-3.5">Empresa</th>
                      <th className="p-3.5">Perfil</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredUsers.map((u) => {
                      const isMainSuper = u.email.toLowerCase() === SUPERADMIN_EMAIL;

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            {isMainSuper && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                            <span>{u.name}</span>
                          </td>
                          <td className="p-3.5 font-mono text-cyan-300">{u.email}</td>
                          <td className="p-3.5">
                            <select
                              value={u.company_id || ''}
                              onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                              disabled={isMainSuper}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none cursor-pointer"
                            >
                              {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              disabled={isMainSuper}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-300 outline-none cursor-pointer"
                            >
                              <option value="superadmin">Superadmin</option>
                              <option value="admin">Administrador</option>
                              <option value="funcionario">Funcionário</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.is_blocked
                                ? 'bg-rose-950 text-rose-300'
                                : u.is_approved
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-amber-950 text-amber-300'
                            }`}>
                              {u.is_blocked ? 'BLOQUEADO' : u.is_approved ? 'LIBERADO' : 'PENDENTE'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {!isMainSuper && (
                              <>
                                <button
                                  onClick={() => handleToggleApproval(u)}
                                  className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-200 rounded-lg text-[11px] font-bold"
                                >
                                  {u.is_approved ? 'Pendente' : 'Liberar'}
                                </button>
                                <button
                                  onClick={() => handleToggleBlock(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                    u.is_blocked
                                      ? 'bg-emerald-950 text-emerald-200'
                                      : 'bg-rose-950 text-rose-200'
                                  }`}
                                >
                                  {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-rose-400 hover:text-rose-200 rounded-lg"
                                  title="Excluir Usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
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
      </main>
    </div>
  );
};
