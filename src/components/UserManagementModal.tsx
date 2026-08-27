/**
 * Chronix ERP - Superadmin & Multi-Tenant Management Panel
 * Painel em Tela Cheia para Controle Total do Superadmin:
 * - Visão Geral & Aprovação Rápida de Clientes Pendentes
 * - Gestão de Empresas por CNPJ & Upload de Logotipos (PWA & Sistema)
 * - Cores de Tema & Título PWA
 * - Dashboards Globais & Métricas Multi-Empresas
 * - Gestão de Usuários, Senhas, Acessos e Exclusão Segura
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
  Search,
  UserCheck,
  UserX,
  Lock,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Truck,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpenCheck,
  Boxes,
  FileSpreadsheet,
  Clock,
  Settings,
  HelpCircle,
  Percent,
  LayoutDashboard,
  CheckSquare,
  Square,
  Sliders,
  Layers,
  Save,
} from 'lucide-react';
import { User, UserRole, Company, NavTab, SYSTEM_MODULES, ALL_NAV_TAB_IDS, getUserAllowedModules } from '../types';
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

const renderModuleIcon = (iconName: string, className = 'w-4 h-4') => {
  switch (iconName) {
    case 'LayoutDashboard':
      return <LayoutDashboard className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'ShoppingCart':
      return <ShoppingCart className={className} />;
    case 'ArrowUpRight':
      return <ArrowUpRight className={className} />;
    case 'BookOpenCheck':
      return <BookOpenCheck className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'Percent':
      return <Percent className={className} />;
    case 'ArrowDownLeft':
      return <ArrowDownLeft className={className} />;
    case 'Boxes':
      return <Boxes className={className} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'Settings':
      return <Settings className={className} />;
    case 'HelpCircle':
      return <HelpCircle className={className} />;
    default:
      return <Layers className={className} />;
  }
};

interface ModulePermissionSelectorProps {
  selectedModules: NavTab[];
  onChange: (modules: NavTab[]) => void;
  userRole?: UserRole;
}

const ModulePermissionSelector: React.FC<ModulePermissionSelectorProps> = ({
  selectedModules,
  onChange,
  userRole,
}) => {
  const isAllSelected = selectedModules.length === ALL_NAV_TAB_IDS.length;

  const toggleModule = (tab: NavTab) => {
    if (selectedModules.includes(tab)) {
      onChange(selectedModules.filter((t) => t !== tab));
    } else {
      onChange([...selectedModules, tab]);
    }
  };

  const applyPreset = (preset: 'all' | 'carga' | 'pdv' | 'stock' | 'none') => {
    switch (preset) {
      case 'all':
        onChange([...ALL_NAV_TAB_IDS]);
        break;
      case 'carga':
        onChange(['carga_vendedor', 'customers']);
        break;
      case 'pdv':
        onChange(['venda_rapida', 'fiados', 'customers', 'products']);
        break;
      case 'stock':
        onChange(['products', 'entries', 'exits', 'bulk_stock']);
        break;
      case 'none':
        onChange([]);
        break;
    }
  };

  return (
    <div className="space-y-3 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs font-black text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Módulos de Acesso Permitidos ({selectedModules.length} de {ALL_NAV_TAB_IDS.length} liberados)</span>
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Selecione quais telas este usuário poderá visualizar. Ao logar, o sistema abrirá automaticamente no primeiro módulo liberado.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition ${
              isAllSelected
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({ALL_NAV_TAB_IDS.length})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('carga')}
            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60 transition"
            title="Apenas Rota de Vendas (Carga do Vendedor)"
          >
            🚚 Só Carga / Rota
          </button>
          <button
            type="button"
            onClick={() => applyPreset('pdv')}
            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-950/80 text-blue-300 hover:bg-blue-900 border border-blue-800/60 transition"
            title="Frente de Caixa (PDV) e Contas a Receber"
          >
            🛒 Só PDV / Caixa
          </button>
          <button
            type="button"
            onClick={() => applyPreset('stock')}
            className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900 border border-cyan-800/60 transition"
            title="Estoque & Entradas/Saídas"
          >
            📦 Só Estoque
          </button>
          <button
            type="button"
            onClick={() => applyPreset('none')}
            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800 text-rose-300 hover:bg-slate-700 transition"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Grid of Checkbox Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
        {SYSTEM_MODULES.map((mod) => {
          const isSelected = selectedModules.includes(mod.id);
          return (
            <div
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              className={`p-2.5 rounded-xl border cursor-pointer transition select-none flex items-start gap-2.5 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`p-1 rounded-lg ${
                      isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {renderModuleIcon(mod.icon, 'w-3.5 h-3.5')}
                  </div>
                  <span className={`text-xs font-black truncate ${isSelected ? 'text-amber-200' : 'text-slate-300'}`}>
                    {mod.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">
                  {mod.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'dashboards'>(
    currentUser.role === 'superadmin' ? 'overview' : 'users'
  );
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User Deletion Modal Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Direct Module Permissions Quick Configuration State
  const [configuringModulesUser, setConfiguringModulesUser] = useState<User | null>(null);
  const [configuringModulesList, setConfiguringModulesList] = useState<NavTab[]>(ALL_NAV_TAB_IDS);

  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('admin');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');
  const [newUserAllowedModules, setNewUserAllowedModules] = useState<NavTab[]>(ALL_NAV_TAB_IDS);

  // Edit User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('funcionario');
  const [editUserCompanyId, setEditUserCompanyId] = useState('');
  const [editUserAllowedModules, setEditUserAllowedModules] = useState<NavTab[]>(ALL_NAV_TAB_IDS);

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
    const loadedUsers = storage.getUsers();
    const loadedComps = storage.getCompanies();
    setUsers(loadedUsers);
    setCompanies(loadedComps);
    if (loadedComps.length > 0 && !newUserCompanyId) {
      setNewUserCompanyId(loadedComps[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFeedback(null);
      setUserToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
  const handleApproveUser = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal já possui acesso total liberado.' });
      return;
    }

    const res = storage.toggleUserApproval(targetUser.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Acesso do cliente ${targetUser.name} (${targetUser.email}) foi LIBERADO com sucesso!`,
      });
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao liberar acesso do cliente.' });
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
        message: `Status de liberação do usuário ${targetUser.name} alterado para: ${res.is_approved ? 'LIBERADO' : 'PENDENTE'}.`,
      });
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar liberação de acesso.' });
    }
  };

  const handleToggleBlock = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal não pode ser bloqueado.' });
      return;
    }

    const res = storage.toggleBlockUser(targetUser.id);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Status de bloqueio do usuário ${targetUser.name} alterado para: ${res.is_blocked ? 'BLOQUEADO' : 'ATIVO'}.`,
      });
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao alterar bloqueio.' });
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

  const confirmDeleteUser = (targetUser: User) => {
    if (targetUser.email.toLowerCase() === SUPERADMIN_EMAIL) {
      setFeedback({ type: 'error', message: 'O Superadmin Principal não pode ser excluído.' });
      return;
    }
    setUserToDelete(targetUser);
  };

  const executeDeleteUser = () => {
    if (!userToDelete) return;
    const target = userToDelete;
    const res = storage.deleteUser(target.id);
    if (res.success) {
      setFeedback({ type: 'success', message: `Usuário ${target.name} (${target.email}) foi excluído permanentemente.` });
      setUserToDelete(null);
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

    const assignedCompanyId =
      currentUser.role !== 'superadmin'
        ? currentUser.company_id || 'comp-aquino'
        : newUserCompanyId || currentUser.company_id || 'comp-aquino';

    const res = storage.registerUser({
      name: newUserName,
      email: newUserEmail,
      username: newUserUsername || undefined,
      password: newUserPassword || '123456',
      role: newUserRole,
      company_id: assignedCompanyId,
      is_approved: true,
      allowed_modules: newUserAllowedModules,
    });

    if (res.success) {
      setFeedback({ type: 'success', message: `Usuário ${newUserName} cadastrado com sucesso e liberado para login!` });
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserAllowedModules(ALL_NAV_TAB_IDS);
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao cadastrar usuário.' });
    }
  };

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserUsername(u.username || '');
    setEditUserEmail(u.email);
    setEditUserPassword('');
    setEditUserRole(u.role);
    setEditUserCompanyId(u.company_id || '');
    setEditUserAllowedModules(u.allowed_modules && u.allowed_modules.length > 0 ? [...u.allowed_modules] : [...ALL_NAV_TAB_IDS]);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      setFeedback({ type: 'error', message: 'Preencha o nome e o e-mail do usuário.' });
      return;
    }

    const res = storage.updateUserFull(editingUser.id, {
      name: editUserName,
      username: editUserUsername,
      email: editUserEmail,
      password: editUserPassword || undefined,
      role: editUserRole,
      company_id: editUserCompanyId || editingUser.company_id,
      allowed_modules: editUserAllowedModules,
    });

    if (res.success) {
      setFeedback({ type: 'success', message: `Usuário ${editUserName} atualizado com sucesso!` });
      setEditingUser(null);
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao atualizar usuário.' });
    }
  };

  const handleOpenModuleConfig = (u: User) => {
    setConfiguringModulesUser(u);
    const existing = u.allowed_modules && u.allowed_modules.length > 0 ? [...u.allowed_modules] : [...ALL_NAV_TAB_IDS];
    setConfiguringModulesList(existing);
  };

  const handleSaveModuleConfig = () => {
    if (!configuringModulesUser) return;
    const res = storage.updateUserAllowedModules(configuringModulesUser.id, configuringModulesList);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Módulos de ${configuringModulesUser.name} atualizados com sucesso (${configuringModulesList.length} módulos liberados)!`,
      });
      setConfiguringModulesUser(null);
      loadData();
      onRefresh?.();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erro ao salvar módulos do usuário.' });
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
      setFeedback({ type: 'error', message: res.error || 'Erro ao redefinir senha.' });
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
    setActiveTab('companies');
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
    setActiveTab('companies');
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
        message: `Status da empresa ${comp.name} alterado para: ${res.status === 'active' ? 'ATIVA' : 'SUSPENSA'}.`,
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
        ? `Visão alternada com sucesso para a empresa: ${selectedComp.name} (CNPJ: ${selectedComp.document}).`
        : 'Visão do sistema restaurada para a empresa padrão.',
    });
    loadData();
    onRefresh?.();
  };

  const currentSelectedCompanyId = storage.getSuperadminSelectedCompanyId();
  const activeCompany = storage.getCurrentUserCompany();

  // Metrics & Calculated Lists
  const pendingUsers = users.filter((u) => u.is_approved === false && !u.is_blocked && u.email.toLowerCase() !== SUPERADMIN_EMAIL);
  const blockedUsers = users.filter((u) => u.is_blocked && u.email.toLowerCase() !== SUPERADMIN_EMAIL);
  const activeUsersCount = users.filter((u) => u.is_approved !== false && !u.is_blocked).length;

  const filteredUsers = users.filter((u) => {
    if (currentUser.role !== 'superadmin' && currentUser.company_id) {
      if (u.company_id && u.company_id !== currentUser.company_id) {
        return false;
      }
    }
    const matchesCompany = companyFilter === 'all' || u.company_id === companyFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? u.is_approved === false && !u.is_blocked
        : statusFilter === 'approved'
        ? u.is_approved !== false && !u.is_blocked
        : statusFilter === 'blocked'
        ? u.is_blocked
        : true;
    const matchesSearch =
      searchTerm.trim() === '' ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCompany && matchesStatus && matchesSearch;
  });

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
                {currentUser.role === 'superadmin' ? 'Painel Superadmin Chronix ERP' : 'Gestão de Usuários & Operadores'}
              </h2>
              {currentUser.role === 'superadmin' ? (
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Controle Master
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Users className="w-3 h-3 text-emerald-400" />
                  Acesso da Empresa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {currentUser.role === 'superadmin'
                ? 'Gestão de Empresas, Aprovação de Clientes, Senhas & Exclusão de Acessos'
                : 'Crie, edite e gerencie os usuários e operadores autorizados para acessar o sistema'}
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

            {currentSelectedCompanyId && currentUser.role === 'superadmin' && (
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
            title="Fechar Painel"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Fechar Painel</span>
          </button>
        </div>
      </header>

      {/* FULLSCREEN NAVIGATION TABS */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex gap-2">
          {/* TAB 1: OVERVIEW / HOMEPAGE (Only Superadmin) */}
          {currentUser.role === 'superadmin' && (
            <button
              onClick={() => {
                setActiveTab('overview');
                setFeedback(null);
              }}
              className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition shrink-0 ${
                activeTab === 'overview'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Visão Geral & Clientes Pendentes</span>
              {pendingUsers.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full animate-pulse shadow-md">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}

          {/* TAB 2: USERS & ACCESS */}
          <button
            onClick={() => {
              setActiveTab('users');
              setFeedback(null);
            }}
            className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition shrink-0 ${
              activeTab === 'users'
                ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Gestão de Usuários & Operadores ({filteredUsers.length})</span>
          </button>

          {/* TAB 3: COMPANIES & LOGOS (Only Superadmin) */}
          {currentUser.role === 'superadmin' && (
            <button
              onClick={() => {
                setActiveTab('companies');
                setFeedback(null);
              }}
              className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition shrink-0 ${
                activeTab === 'companies'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Empresas & Logotipos CNPJ ({companies.length})</span>
            </button>
          )}

          {/* TAB 4: DASHBOARDS (Only Superadmin) */}
          {currentUser.role === 'superadmin' && (
            <button
              onClick={() => {
                setActiveTab('dashboards');
                setFeedback(null);
              }}
              className={`py-3.5 px-5 text-xs font-black flex items-center gap-2 border-b-2 transition shrink-0 ${
                activeTab === 'dashboards'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-950 rounded-t-2xl border-t border-x border-slate-800'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Analytics & Métricas Globais</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => {
              setIsAddingUser(true);
              setEditingUser(null);
              setActiveTab('users');
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
          {currentUser.role === 'superadmin' && (
            <button
              onClick={handleOpenNewCompany}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa</span>
            </button>
          )}
        </div>
      </div>

      {/* FULLSCREEN MAIN CONTENT BODY */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-6">
        {/* Toast Feedback Messages */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl transition border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80 ring-1 ring-emerald-500/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-700/80 ring-1 ring-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-extrabold hover:underline opacity-80 bg-slate-900/50 px-3 py-1 rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW (HOME DASHBOARD DO SUPERADMIN) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Pending Approvals */}
              <div
                onClick={() => {
                  if (pendingUsers.length > 0) {
                    setStatusFilter('pending');
                    setActiveTab('users');
                  }
                }}
                className={`p-5 rounded-3xl border transition shadow-xl flex items-center justify-between cursor-pointer ${
                  pendingUsers.length > 0
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl border ${
                    pendingUsers.length > 0 ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Clientes Pendentes</span>
                    <div className="text-2xl font-black text-white">{pendingUsers.length}</div>
                    <span className={`text-[11px] font-bold ${pendingUsers.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {pendingUsers.length > 0 ? 'Aguardando sua liberação' : 'Todos liberados'}
                    </span>
                  </div>
                </div>
                {pendingUsers.length > 0 && <ArrowRight className="w-5 h-5 text-amber-400" />}
              </div>

              {/* Card 2: Total Companies */}
              <div
                onClick={() => setActiveTab('companies')}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-3xl shadow-xl flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Empresas Cadastradas</span>
                    <div className="text-2xl font-black text-white">{companies.length}</div>
                    <span className="text-[11px] text-emerald-400 font-bold">{activeCompaniesCount} ativas no sistema</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Users */}
              <div
                onClick={() => {
                  setStatusFilter('all');
                  setActiveTab('users');
                }}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-3xl shadow-xl flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Usuários do Sistema</span>
                    <div className="text-2xl font-black text-white">{users.length}</div>
                    <span className="text-[11px] text-emerald-400 font-bold">{activeUsersCount} ativos e liberados</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Multi-tenant Stock Valuation */}
              <div
                onClick={() => setActiveTab('dashboards')}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-3xl shadow-xl flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
                    <DollarSign className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Patrimônio Geral</span>
                    <div className="text-xl font-black text-amber-300">
                      R$ {totalStockValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Estoque total em R$</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO PRINCIPAL: CLIENTES AGUARDANDO LIBERAÇÃO (PAINEL DE LIBERAÇÃO RÁPIDA) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>Liberação de Clientes & Novos Cadastros</span>
                      {pendingUsers.length > 0 && (
                        <span className="px-2.5 py-0.5 text-xs font-black bg-amber-500 text-slate-950 rounded-full">
                          {pendingUsers.length} PENDENTE(S)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Novos clientes que solicitaram acesso ou se cadastraram aguardando sua autorização master
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter('pending');
                      setActiveTab('users');
                    }}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Todos no Filtro</span>
                  </button>
                </div>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-white">Todos os clientes estão devidamente liberados!</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Nenhum novo cadastro está pendente de aprovação no momento. Quando um novo usuário solicitar acesso, ele aparecerá aqui com destaque para 1-clique de liberação.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUsers.map((u) => {
                    const comp = companies.find((c) => c.id === u.company_id);
                    return (
                      <div
                        key={u.id}
                        className="p-5 bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/40 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-base text-white">{u.name}</h4>
                              <span className="text-xs font-mono font-bold text-cyan-300 block">{u.email}</span>
                            </div>
                            <span className="px-2.5 py-1 text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full uppercase">
                              PENDENTE
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                            <p className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="font-bold text-white">{comp ? comp.name : 'Sem Empresa'}</span>
                            </p>
                            <p className="flex items-center gap-2 text-slate-400">
                              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Perfil: <strong className="text-amber-300 uppercase">{u.role}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Direct Action Buttons for Pending Users */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                          <button
                            onClick={() => handleApproveUser(u)}
                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition active:scale-95"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>LIBERAR ACESSO</span>
                          </button>

                          <button
                            onClick={() => confirmDeleteUser(u)}
                            className="px-3 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-extrabold flex items-center gap-1 transition active:scale-95"
                            title="Rejeitar e Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* QUICK OVERVIEW TABLES: EMPRESAS & USUÁRIOS RECENTES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Empresas Ativas Quick Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Empresas Ativas no Sistema</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('companies')}
                    className="text-xs text-cyan-400 hover:underline font-bold"
                  >
                    Gerenciar Todas ({companies.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {companies.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={c.logo_url || chronixLogoImg}
                          alt={c.name}
                          className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-cyan-500/30 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="font-extrabold text-xs text-white">{c.name}</h4>
                          <span className="text-[10px] font-mono text-cyan-300">CNPJ: {c.document}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectCompanyView(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1 ${
                          activeCompany.id === c.id
                            ? 'bg-cyan-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{activeCompany.id === c.id ? 'Ativa Agora' : 'Visualizar'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usuários Cadastrados Quick Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Últimos Usuários Cadastrados</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Ver Todos os Usuários ({users.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => {
                    const isMainSuper = u.email.toLowerCase() === SUPERADMIN_EMAIL;
                    return (
                      <div
                        key={u.id}
                        className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          {isMainSuper ? (
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center font-bold text-xs text-slate-300">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isMainSuper && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 rounded">SUPER</span>}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400">{u.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.is_blocked
                                ? 'bg-rose-950 text-rose-300'
                                : u.is_approved
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-amber-950 text-amber-300'
                            }`}
                          >
                            {u.is_blocked ? 'BLOQUEADO' : u.is_approved ? 'LIBERADO' : 'PENDENTE'}
                          </span>

                          {!isMainSuper && (
                            <button
                              onClick={() => confirmDeleteUser(u)}
                              className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950 rounded-lg transition"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GESTÃO COMPLETA DE USUÁRIOS & ACESSOS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filter, Search & Add User Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-800 rounded-3xl shadow-xl">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar usuário por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Company Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="all">Todas as Empresas ({users.length})</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendentes de Liberação ({pendingUsers.length})</option>
                    <option value="approved">Liberados / Ativos</option>
                    <option value="blocked">Bloqueados ({blockedUsers.length})</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Usuário</span>
              </button>
            </div>

            {/* Form for Creating New User */}
            {isAddingUser && (
              <form onSubmit={handleCreateUser} className="p-6 bg-slate-900 border border-emerald-500/40 rounded-3xl space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Novo Usuário / Operador</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Carlos Silva"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Usuário (Login) *</label>
                    <input
                      type="text"
                      placeholder="ex: carlos, vendedor1"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-300 font-mono font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">E-mail de Acesso *</label>
                    <input
                      type="email"
                      required
                      placeholder="ex: carlos@empresa.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Senha Inicial *</label>
                    <input
                      type="password"
                      placeholder="ex: 123456"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  {currentUser.role === 'superadmin' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Empresa *</label>
                      <select
                        value={newUserCompanyId}
                        onChange={(e) => setNewUserCompanyId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Perfil de Acesso *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 outline-none cursor-pointer"
                    >
                      <option value="admin">Administrador</option>
                      <option value="funcionario">Funcionário / Vendedor</option>
                      {currentUser.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                    </select>
                  </div>
                </div>

                {/* Module Permissions Selector for New User */}
                <ModulePermissionSelector
                  selectedModules={newUserAllowedModules}
                  onChange={setNewUserAllowedModules}
                  userRole={newUserRole}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95"
                  >
                    Salvar Usuário
                  </button>
                </div>
              </form>
            )}

            {/* Form for Editing Existing User */}
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="p-6 bg-slate-900 border border-amber-500/40 rounded-3xl space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    <span>Editar Usuário: {editingUser.name}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nome de Usuário (Login)</label>
                    <input
                      type="text"
                      placeholder="ex: carlos, vendedor1"
                      value={editUserUsername}
                      onChange={(e) => setEditUserUsername(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Nova Senha (opcional)</label>
                    <input
                      type="password"
                      placeholder="Deixe em branco para manter"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  {currentUser.role === 'superadmin' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Empresa *</label>
                      <select
                        value={editUserCompanyId}
                        onChange={(e) => setEditUserCompanyId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Perfil *</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 outline-none cursor-pointer"
                    >
                      <option value="admin">Administrador</option>
                      <option value="funcionario">Funcionário / Vendedor</option>
                      {currentUser.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                    </select>
                  </div>
                </div>

                {/* Module Permissions Selector for Edit User */}
                <ModulePermissionSelector
                  selectedModules={editUserAllowedModules}
                  onChange={setEditUserAllowedModules}
                  userRole={editUserRole}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95"
                  >
                    Salvar Alterações
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
                      <th className="p-4">Usuário / Nome</th>
                      <th className="p-4">E-mail</th>
                      <th className="p-4">Empresa Vinculada</th>
                      <th className="p-4">Função / Perfil</th>
                      <th className="p-4">Status Acesso</th>
                      <th className="p-4">Módulos Liberados</th>
                      <th className="p-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                          Nenhum usuário encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isMainSuper = u.email.toLowerCase() === SUPERADMIN_EMAIL;
                        const isResettingThisUser = resettingUserId === u.id;
                        const isUserSuper = u.role === 'superadmin' || isMainSuper;
                        const userModList = u.allowed_modules || ALL_NAV_TAB_IDS;
                        const isAllMods = userModList.length === ALL_NAV_TAB_IDS.length;

                        return (
                          <React.Fragment key={u.id}>
                            <tr className={`hover:bg-slate-800/40 transition ${u.is_approved === false && !u.is_blocked ? 'bg-amber-950/20' : ''}`}>
                              <td className="p-4 font-bold text-white">
                                <div className="flex items-center gap-2.5">
                                  {isMainSuper ? (
                                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-cyan-300">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className="block text-sm text-white font-extrabold">{u.name}</span>
                                    {u.username && (
                                      <span className="block text-[11px] font-mono text-emerald-400 font-bold">
                                        @{u.username}
                                      </span>
                                    )}
                                    {isMainSuper && <span className="text-[10px] text-amber-400 font-bold">Superadmin Principal</span>}
                                  </div>
                                </div>
                              </td>

                              <td className="p-4 font-mono text-cyan-300 font-semibold">{u.email}</td>

                              <td className="p-4">
                                <select
                                  value={u.company_id || ''}
                                  onChange={(e) => handleCompanyChange(u.id, e.target.value)}
                                  disabled={isMainSuper}
                                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer disabled:opacity-50"
                                >
                                  {companies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-4">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                  disabled={isMainSuper}
                                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-black text-amber-300 outline-none cursor-pointer disabled:opacity-50"
                                >
                                  <option value="superadmin">Superadmin</option>
                                  <option value="admin">Administrador</option>
                                  <option value="funcionario">Funcionário</option>
                                </select>
                              </td>

                              <td className="p-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    u.is_blocked
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : u.is_approved === false
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  }`}
                                >
                                  {u.is_blocked ? 'BLOQUEADO' : u.is_approved === false ? 'PENDENTE' : 'LIBERADO'}
                                </span>
                              </td>

                              {/* Módulos Liberados */}
                              <td className="p-4">
                                {isUserSuper ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-950/60 border border-amber-800/80 text-amber-300">
                                    <Crown className="w-3 h-3 text-amber-400" />
                                    <span>Todos ({ALL_NAV_TAB_IDS.length})</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenModuleConfig(u)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black transition border ${
                                      isAllMods
                                        ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500'
                                        : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-700/60 hover:border-amber-400 shadow-sm'
                                    }`}
                                    title="Clique para escolher os módulos deste usuário"
                                  >
                                    <Sliders className="w-3 h-3 text-amber-400" />
                                    <span>
                                      {isAllMods
                                        ? `Todos (${ALL_NAV_TAB_IDS.length})`
                                        : `${userModList.length} de ${ALL_NAV_TAB_IDS.length} módulos`}
                                    </span>
                                  </button>
                                )}
                              </td>

                              {/* BOTÕES DE AÇÕES REVISADOS E DESTACADOS */}
                              <td className="p-4 text-right">
                                {!isMainSuper ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Botão de Configuração Direta de Módulos */}
                                    <button
                                      onClick={() => handleOpenModuleConfig(u)}
                                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-950 text-amber-300 border border-slate-700 hover:border-amber-600 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1"
                                      title="Escolher Módulos Permitidos para Este Usuário"
                                    >
                                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="hidden sm:inline">Módulos</span>
                                    </button>

                                    {/* Botão de Liberação de Cliente */}
                                    {u.is_approved === false ? (
                                      <button
                                        onClick={() => handleApproveUser(u)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1 transition active:scale-95"
                                        title="Liberar Acesso do Cliente"
                                      >
                                        <UserCheck className="w-4 h-4" />
                                        <span>LIBERAR</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleToggleApproval(u)}
                                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition"
                                        title="Tornar Pendente Novamente"
                                      >
                                        Revogar
                                      </button>
                                    )}

                                    {/* Botão de Bloqueio */}
                                    <button
                                      onClick={() => handleToggleBlock(u)}
                                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                                        u.is_blocked
                                          ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800'
                                          : 'bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800'
                                      }`}
                                      title={u.is_blocked ? 'Desbloquear Usuário' : 'Bloquear Acesso'}
                                    >
                                      {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                                    </button>

                                    {/* Botão de Redefinir Senha */}
                                    <button
                                      onClick={() => {
                                        if (isResettingThisUser) {
                                          setResettingUserId(null);
                                        } else {
                                          setResettingUserId(u.id);
                                          setResetPasswordValue('');
                                        }
                                      }}
                                      className="p-1.5 bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-700 rounded-xl text-xs font-bold transition"
                                      title="Redefinir Senha"
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </button>

                                    {/* Botão de Editar Usuário */}
                                    <button
                                      onClick={() => handleStartEditUser(u)}
                                      className="p-1.5 bg-slate-800 hover:bg-amber-950 text-amber-300 border border-slate-700 hover:border-amber-700 rounded-xl text-xs font-bold transition"
                                      title="Editar Dados do Usuário"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>

                                    {/* Botão de Excluir Usuário */}
                                    <button
                                      onClick={() => confirmDeleteUser(u)}
                                      className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl transition active:scale-95"
                                      title="Excluir Usuário Permanentemente"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-amber-400 font-bold italic">Protegido (Superadmin)</span>
                                )}
                              </td>
                            </tr>

                            {/* Row Inline para Redefinição de Senha */}
                            {isResettingThisUser && (
                              <tr className="bg-slate-950/90 border-b border-cyan-500/30">
                                <td colSpan={7} className="p-4">
                                  <div className="flex items-center justify-between gap-4 max-w-xl mx-auto bg-slate-900 p-3 rounded-2xl border border-cyan-500/40 shadow-inner">
                                    <div className="flex items-center gap-2">
                                      <KeyRound className="w-4 h-4 text-cyan-400" />
                                      <span className="text-xs font-bold text-white">Nova Senha para {u.name}:</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="password"
                                        placeholder="Digite a nova senha..."
                                        value={resetPasswordValue}
                                        onChange={(e) => setResetPasswordValue(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-cyan-500 w-48"
                                      />
                                      <button
                                        onClick={() => handleSaveResetPassword(u.id)}
                                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow transition"
                                      >
                                        Salvar Senha
                                      </button>
                                      <button
                                        onClick={() => setResettingUserId(null)}
                                        className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EMPRESAS & LOGOTIPOS CNPJ */}
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

        {/* TAB 4: GLOBAL MULTI-COMPANY DASHBOARDS */}
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
                      <th className="p-3.5 rounded-l-xl">Empresa</th>
                      <th className="p-3.5">CNPJ</th>
                      <th className="p-3.5">Usuários Vinculados</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right rounded-r-xl">Ação Direta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {companies.map((c) => {
                      const uCount = users.filter((u) => u.company_id === c.id).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                            <img
                              src={c.logo_url || chronixLogoImg}
                              alt={c.name}
                              className="w-7 h-7 rounded-lg object-contain bg-slate-950 border border-cyan-500/30 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <span>{c.name}</span>
                          </td>
                          <td className="p-3.5 font-mono text-cyan-300">{c.document}</td>
                          <td className="p-3.5">{uCount} usuário(s)</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              c.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}>
                              {c.status === 'active' ? 'ATIVA' : 'SUSPENSA'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleSelectCompanyView(c.id)}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs transition shadow-md"
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
      </main>

      {/* MODAL DE CONFIGURAÇÃO DE MÓDULOS DE ACESSO */}
      {configuringModulesUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-3xl w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Permissões de Módulos: {configuringModulesUser.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono font-bold">
                      {configuringModulesUser.email}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina individualmente os módulos do sistema que este usuário pode acessar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfiguringModulesUser(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              <ModulePermissionSelector
                selectedModules={configuringModulesList}
                onChange={setConfiguringModulesList}
                userRole={configuringModulesUser.role}
              />
            </div>

            {/* Note & Action Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>
                  O usuário entrará direto no primeiro módulo habilitado (ex: Rota de Vendas, PDV ou Estoque).
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringModulesUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModuleConfig}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Módulos Permitidos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO DE USUÁRIO */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Excluir Usuário Permanentemente</h3>
                <p className="text-xs text-rose-300/80">Ação irreversível de remoção de conta</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-300 font-medium">
                Tem certeza que deseja remover o usuário <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <p className="text-slate-400 text-[11px]">
                Ele perderá imediatamente o acesso ao Chronix ERP e todas as permissões associadas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
