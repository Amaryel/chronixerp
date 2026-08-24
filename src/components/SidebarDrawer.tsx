/**
 * Aquinos Frios / Chronix ERP - Sidebar Drawer Component
 * Menu Lateral Responsivo para Navegação Completa em Celulares e Tablets.
 */

import React, { useState } from 'react';
import {
  X,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  BookOpenCheck,
  Boxes,
  FileSpreadsheet,
  Clock,
  Settings,
  Percent,
  HelpCircle,
  LifeBuoy,
  Database,
  Crown,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Building2,
  FolderKanban,
  ArrowRightLeft,
  BarChart2,
} from 'lucide-react';
import { NavTab } from './Navigation';
import { User, Company } from '../types';
import { SUPERADMIN_EMAIL, chronixLogoImg } from '../services/storage';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  activeCompany?: Company;
  lowStockCount: number;
  expiringCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenProfileModal: () => void;
  onOpenUserManagement?: () => void;
  onOpenSupabaseModal: () => void;
  onOpenContextHelp?: () => void;
  onOpenSupport?: () => void;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentUser,
  activeCompany,
  lowStockCount,
  expiringCount,
  darkMode,
  setDarkMode,
  onOpenProfileModal,
  onOpenUserManagement,
  onOpenSupabaseModal,
  onOpenContextHelp,
  onOpenSupport,
  onLogout,
}) => {
  const [cadastrosExpanded, setCadastrosExpanded] = useState(true);
  const [movimentacoesExpanded, setMovimentacoesExpanded] = useState(true);

  if (!isOpen) {
    return null;
  }

  const isSuperadmin =
    currentUser.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser.role === 'superadmin';

  const companyDisplayName = activeCompany?.name || 'Chronix ERP';
  const companyLogo = activeCompany?.logo_url || chronixLogoImg;

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer content panel (Left-aligned) */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 border-r border-slate-800 text-slate-100 h-full flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-left duration-300">
        
        {/* HEADER: Company Logo & Close Button */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={companyLogo}
              alt={companyDisplayName}
              className="w-10 h-10 rounded-xl object-contain border border-blue-500/30 bg-slate-900 p-0.5 shadow-md shadow-blue-500/20"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h2 className="font-extrabold text-base text-white tracking-tight truncate leading-tight">
                {companyDisplayName}
              </h2>
              <p className="text-[11px] text-blue-400 font-semibold truncate">
                {activeCompany?.document ? `CNPJ: ${activeCompany.document}` : 'Chronix ERP'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fechar menu lateral"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* USER PROFILE CARD */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 shrink-0">
          <div
            onClick={() => {
              onOpenProfileModal();
              onClose();
            }}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                  isSuperadmin
                    ? 'bg-amber-500 shadow-md shadow-amber-500/30'
                    : currentUser.role === 'admin'
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white truncate group-hover:text-blue-400 transition">
                    {currentUser.name}
                  </span>
                  {isSuperadmin ? (
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : currentUser.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <span className="w-0 h-0" />
                  )}
                </div>
                <span className="block text-[10px] text-slate-400 truncate">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </div>
        </div>

        {/* SCROLLABLE NAVIGATION LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          
          {/* SUPERADMIN BANNER (if applicable) */}
          {isSuperadmin && onOpenUserManagement && (
            <button
              onClick={() => {
                onOpenUserManagement();
                onClose();
              }}
              className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-amber-900/40 to-slate-950 border border-amber-500/40 hover:border-amber-400 transition flex items-center justify-between shadow-lg group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-amber-300">
                    Painel Super Admin
                  </span>
                  <span className="text-[10px] text-amber-200/70 font-medium">
                    Gestão Master de Empresas & Acessos
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition" />
            </button>
          )}

          {/* SECTION 1: DADOS PRINCIPAIS */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1.5">
              Geral & Vendas
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  <span>Início / Visão Geral</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigate('venda_rapida')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'venda_rapida'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Frente de Caixa (PDV)</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigate('carga_vendedor')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'carga_vendedor'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>Rota de Vendas (Carga)</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: CADASTROS */}
          <div>
            <button
              onClick={() => setCadastrosExpanded(!cadastrosExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1.5 hover:text-slate-300 transition"
            >
              <span>Cadastros Base</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  cadastrosExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>

            {cadastrosExpanded && (
              <div className="space-y-1 pl-1">
                <button
                  onClick={() => handleNavigate('customers')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'customers'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Clientes & Parceiros</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('drivers')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'drivers'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span>Motoristas & Entregadores</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('products')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'products'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-cyan-400" />
                    <span>Produtos & Estoque</span>
                  </div>
                  {lowStockCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full">
                      {lowStockCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavigate('bulk_prices')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'bulk_prices'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span>Alteração de Preços em Massa</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: MOVIMENTAÇÕES & ESTOQUE */}
          <div>
            <button
              onClick={() => setMovimentacoesExpanded(!movimentacoesExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1.5 hover:text-slate-300 transition"
            >
              <span>Movimentações & Financeiro</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  movimentacoesExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>

            {movimentacoesExpanded && (
              <div className="space-y-1 pl-1">
                <button
                  onClick={() => handleNavigate('entries')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'entries'
                      ? 'bg-emerald-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    <span>Entrada de Estoque</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('exits')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'exits'
                      ? 'bg-rose-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    <span>Saída / Pré-Venda</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('fiados')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'fiados'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpenCheck className="w-4 h-4 text-amber-400" />
                    <span>Contas a Receber (Fiados)</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavigate('bulk_stock')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'bulk_stock'
                      ? 'bg-blue-600 text-white font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Boxes className="w-4 h-4 text-purple-400" />
                    <span>Ajuste de Estoque em Lote</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: RELATÓRIOS & AUDITORIA */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1.5">
              Análise & Histórico
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('reports')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span>Relatórios Gerenciais</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigate('history')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Histórico de Vendas & Operações</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 5: AJUDA & UTILITÁRIOS */}
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 px-2 mb-1.5">
              Suporte & Ajustes
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('settings')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Configurações do Sistema</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigate('help_center')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'help_center'
                    ? 'bg-blue-600 text-white font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Centro de Ajuda & Tutoriais</span>
                </div>
              </button>

              {onOpenContextHelp && (
                <button
                  onClick={() => {
                    onOpenContextHelp();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>Como Usar Esta Tela</span>
                </button>
              )}

              {onOpenSupport && (
                <button
                  onClick={() => {
                    onOpenSupport();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-950/40 border border-emerald-800/40 transition"
                >
                  <LifeBuoy className="w-4 h-4 text-emerald-400" />
                  <span>Preciso de Ajuda / Suporte</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenSupabaseModal();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Banco Supabase Online</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Dark Mode Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition"
            >
              {darkMode ? (
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Modo Claro</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-slate-400" />
                  <span>Modo Escuro</span>
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-xs font-black text-rose-300 flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sair</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
