/**
 * Chronix ERP / Aquinos Frios - Configurações & Ferramentas do Sistema
 * Layout Reorganizado com UX/UI moderna, Categorias Estruturadas e 100% Mobile-First.
 */

import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Users,
  Building2,
  User,
  FileCode2,
  Calendar,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Database,
  Search,
  ChevronRight,
  ArrowLeft,
  Crown,
  Sparkles,
  Info,
  CheckCircle2,
  Trash2,
  KeyRound,
  Package,
} from 'lucide-react';
import { Product, Batch, Movement, Category, User as UserType } from '../types';
import { XmlImportModal } from './XmlImportModal';
import { BatchManager } from './BatchManager';
import { InventoryManager } from './InventoryManager';
import { Reports } from './Reports';
import { AuditLogView } from './AuditLogView';
import { UserProfileModal } from './UserProfileModal';
import { SupabaseModal } from './SupabaseModal';
import { UserManagementModal } from './UserManagementModal';
import { OperationalPreferences } from './OperationalPreferences';
import { storage, SUPERADMIN_EMAIL } from '../services/storage';

interface SettingsPageProps {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  categories: Category[];
  currentUser: UserType;
  onRefresh: () => void;
}

type SettingCategoryKey = 'geral' | 'equipe' | 'estoque' | 'relatorios' | 'sistema';

type SettingItemKey =
  | 'preferences'
  | 'profile'
  | 'users'
  | 'companies'
  | 'batches'
  | 'inventory'
  | 'xml'
  | 'reports'
  | 'audit'
  | 'supabase';

interface SettingItemDef {
  id: SettingItemKey;
  category: SettingCategoryKey;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  isSuperadminOnly?: boolean;
  type: 'inline' | 'modal';
}

const SETTING_ITEMS: SettingItemDef[] = [
  // 1. Geral & Empresa
  {
    id: 'preferences',
    category: 'geral',
    title: 'Preferências Operacionais',
    subtitle: 'Estoque negativo, juros de fiado, regras de PDV e conversões',
    icon: Sliders,
    type: 'inline',
  },
  {
    id: 'profile',
    category: 'geral',
    title: 'Meu Perfil & Senha',
    subtitle: 'Alterar nome de exibição, e-mail e chave de acesso pessoal',
    icon: User,
    type: 'modal',
  },
  {
    id: 'companies',
    category: 'geral',
    title: 'Multi-Empresas & White Label',
    subtitle: 'Logotipos, CNPJs, cores do tema e exclusão de bases de teste',
    icon: Building2,
    badge: 'Super Admin',
    isSuperadminOnly: true,
    type: 'modal',
  },

  // 2. Equipe & Acessos
  {
    id: 'users',
    category: 'equipe',
    title: 'Usuários, Operadores & Permissões',
    subtitle: 'Controle de logins, cargos, bloqueios e liberação de módulos',
    icon: Users,
    badge: 'Controle',
    type: 'modal',
  },

  // 3. Estoque & Operações
  {
    id: 'batches',
    category: 'estoque',
    title: 'Lotes & Validades (FIFO)',
    subtitle: 'Controle rigoroso de datas de vencimento e conferência de baixas',
    icon: Calendar,
    type: 'inline',
  },
  {
    id: 'inventory',
    category: 'estoque',
    title: 'Inventário Físico & Ajuste Rápido',
    subtitle: 'Balanço de estoque, conferência física e correções imediatas',
    icon: Layers,
    type: 'inline',
  },
  {
    id: 'xml',
    category: 'estoque',
    title: 'Importar Nota Fiscal XML',
    subtitle: 'Entrada automática em lote de produtos e fornecedores por XML',
    icon: FileCode2,
    type: 'modal',
  },

  // 4. Relatórios & Auditoria
  {
    id: 'reports',
    category: 'relatorios',
    title: 'Relatórios Gerenciais',
    subtitle: 'Curva ABC, faturamento, margem de lucro e exportação de dados',
    icon: FileSpreadsheet,
    type: 'inline',
  },
  {
    id: 'audit',
    category: 'relatorios',
    title: 'Logs de Auditoria & Segurança',
    subtitle: 'Rastreabilidade de quem alterou preços, excluiu ou fez lançamentos',
    icon: ShieldCheck,
    type: 'inline',
  },

  // 5. Nuvem & Sistema
  {
    id: 'supabase',
    category: 'sistema',
    title: 'Sincronização Nuvem (Supabase)',
    subtitle: 'Status da conexão em tempo real, backup e sincronização online',
    icon: Database,
    badge: 'Nuvem',
    type: 'modal',
  },
];

const CATEGORIES: { key: SettingCategoryKey; label: string; desc: string; icon: React.ElementType }[] = [
  {
    key: 'geral',
    label: 'Empresa & Preferências',
    desc: 'Regras operacionais e personalização',
    icon: Building2,
  },
  {
    key: 'equipe',
    label: 'Equipe & Acessos',
    desc: 'Usuários, operadores e permissões',
    icon: Users,
  },
  {
    key: 'estoque',
    label: 'Estoque & Ferramentas',
    desc: 'Lotes, inventário e notas XML',
    icon: Package,
  },
  {
    key: 'relatorios',
    label: 'Relatórios & Auditoria',
    desc: 'Histórico gerencial e logs',
    icon: FileSpreadsheet,
  },
  {
    key: 'sistema',
    label: 'Nuvem & Sistema',
    desc: 'Sincronização e banco de dados',
    icon: Database,
  },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  products,
  batches,
  movements,
  categories,
  currentUser,
  onRefresh,
}) => {
  const [activeInlineSubTab, setActiveInlineSubTab] = useState<
    'preferences' | 'batches' | 'inventory' | 'reports' | 'audit'
  >('preferences');

  const [activeCategory, setActiveCategory] = useState<SettingCategoryKey>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

  // Modals state
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [userManagementDefaultTab, setUserManagementDefaultTab] = useState<'users' | 'companies' | 'permissions'>('users');

  const isSuperadmin =
    currentUser.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser.role === 'superadmin';

  // Filter items based on user role and search query
  const filteredItems = useMemo(() => {
    return SETTING_ITEMS.filter((item) => {
      if (item.isSuperadminOnly && !isSuperadmin) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, isSuperadmin]);

  const handleSelectItem = (item: SettingItemDef) => {
    if (item.id === 'xml') {
      setIsXmlModalOpen(true);
    } else if (item.id === 'profile') {
      setIsProfileModalOpen(true);
    } else if (item.id === 'supabase') {
      setIsSupabaseModalOpen(true);
    } else if (item.id === 'users') {
      setUserManagementDefaultTab('users');
      setIsUserManagementModalOpen(true);
    } else if (item.id === 'companies') {
      setUserManagementDefaultTab('companies');
      setIsUserManagementModalOpen(true);
    } else {
      setActiveInlineSubTab(item.id as any);
      setActiveCategory(item.category);
      setIsMobileDetailView(true);
    }
  };

  const activeItemDef = SETTING_ITEMS.find((i) => i.id === activeInlineSubTab);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-[11px] font-black uppercase tracking-wider">
                Painel de Configurações
              </span>
              {isSuperadmin && (
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Super Admin
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Configurações & Ferramentas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
              Personalize regras de negócios, gerencie equipes e permissões, configure multi-empresas e consulte relatórios gerenciais.
            </p>
          </div>

          {/* Quick Stats / Short actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setUserManagementDefaultTab('companies');
                setIsUserManagementModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Gerenciar Empresas</span>
            </button>

            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>Conexão Nuvem</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar configuração, lote, relatório, usuário..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Quick Category Chips for Desktop */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isCatActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE BACK BUTTON (When viewing a specific sub-screen on small screens) */}
      {isMobileDetailView && (
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileDetailView(false)}
            className="w-full p-3 bg-blue-600 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Lista de Configurações</span>
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN / RESPONSIVE VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Organized Settings Navigation (Hidden on mobile when in detail view) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            isMobileDetailView ? 'hidden lg:block' : 'block'
          }`}
        >
          {CATEGORIES.map((cat) => {
            const itemsInCat = filteredItems.filter((i) => i.category === cat.key);
            if (itemsInCat.length === 0) return null;

            const CatIcon = cat.icon;

            return (
              <div
                key={cat.key}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2.5 px-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {cat.label}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">{cat.desc}</p>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pt-1">
                  {itemsInCat.map((item) => {
                    const ItemIcon = item.icon;
                    const isInlineActive =
                      item.type === 'inline' && activeInlineSubTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full p-3 rounded-2xl text-left transition flex items-start justify-between gap-3 group ${
                          isInlineActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-extrabold'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-xl shrink-0 mt-0.5 transition ${
                              isInlineActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:text-blue-500'
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-bold leading-snug truncate ${
                                  isInlineActive ? 'text-white' : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.badge && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                                    isInlineActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] font-normal line-clamp-2 mt-0.5 leading-tight ${
                                isInlineActive
                                  ? 'text-blue-100'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-4 h-4 shrink-0 mt-2 transition-transform ${
                            isInlineActive
                              ? 'text-white translate-x-0.5'
                              : 'text-slate-400 group-hover:translate-x-0.5'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Active Setting Workspace Content */}
        <div
          className={`lg:col-span-8 ${
            !isMobileDetailView ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Active Item Header Card */}
          {activeItemDef && (
            <div className="mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-xl">
                  {React.createElement(activeItemDef.icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    {activeItemDef.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {activeItemDef.subtitle}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-bold">
                <span>Módulo Ativo</span>
              </div>
            </div>
          )}

          {/* Render Active Inline Component */}
          {activeInlineSubTab === 'preferences' && (
            <OperationalPreferences onRefresh={onRefresh} />
          )}

          {activeInlineSubTab === 'batches' && (
            <BatchManager
              products={products}
              batches={batches}
              currentUser={currentUser}
              onRefresh={onRefresh}
            />
          )}

          {activeInlineSubTab === 'inventory' && (
            <InventoryManager
              products={products}
              currentUser={currentUser}
              onRefresh={onRefresh}
            />
          )}

          {activeInlineSubTab === 'reports' && (
            <Reports
              products={products}
              batches={batches}
              movements={movements}
              categories={categories}
            />
          )}

          {activeInlineSubTab === 'audit' && (
            <AuditLogView logs={storage.getAuditLogs()} />
          )}
        </div>
      </div>

      {/* ALL INTERACTIVE MODALS */}
      <XmlImportModal
        isOpen={isXmlModalOpen}
        products={products}
        onClose={() => setIsXmlModalOpen(false)}
        onSuccess={onRefresh}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onRefresh={onRefresh}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        currentUser={currentUser}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        currentUser={currentUser}
        initialTab={userManagementDefaultTab}
        onClose={() => setIsUserManagementModalOpen(false)}
        onRefresh={onRefresh}
      />
    </div>
  );
};
