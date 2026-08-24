/**
 * Aquinos Frios - Header Component
 * Bar do aplicativo com identificação de perfil (Superadmin/Admin/Funcionário), atalho de usuários, Supabase e Logout.
 */

import React from 'react';
import {
  Smartphone,
  Moon,
  Sun,
  Database,
  Crown,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  Users,
  Building2,
  ChevronDown,
  HelpCircle,
  LifeBuoy,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import { User, Company } from '../types';
import { SUPERADMIN_EMAIL, chronixLogoImg } from '../services/storage';

interface HeaderProps {
  user: User;
  activeCompany?: Company;
  companies?: Company[];
  onSelectCompany?: (companyId: string) => void;
  onOpenSidebar?: () => void;
  onOpenSupabaseModal: () => void;
  onOpenUserManagement?: () => void;
  onOpenProfileModal: () => void;
  onOpenScanner: () => void;
  onOpenContextHelp?: () => void;
  onOpenSupport?: () => void;
  impersonatedCompanyId?: string | null;
  onClearImpersonation?: () => void;
  onLogout: () => void;
  onBrandClick?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeCompany,
  companies = [],
  onSelectCompany,
  onOpenSidebar,
  onOpenSupabaseModal,
  onOpenUserManagement,
  onOpenProfileModal,
  onOpenScanner,
  onOpenContextHelp,
  onOpenSupport,
  impersonatedCompanyId,
  onClearImpersonation,
  onLogout,
  onBrandClick,
  darkMode,
  setDarkMode,
}) => {
  const isSuperadmin =
    user.email.toLowerCase() === SUPERADMIN_EMAIL || user.role === 'superadmin';

  const companyDisplayName = activeCompany?.name || 'Chronix ERP';
  const companyLogo = activeCompany?.logo_url || chronixLogoImg;

  return (
    <div className="w-full">
      {/* Superadmin Impersonation Banner */}
      {isSuperadmin && impersonatedCompanyId && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 font-black text-xs py-2 px-4 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-2 max-w-2xl truncate">
            <Crown className="w-4 h-4 shrink-0" />
            <span>
              Acesso Impersonado Super Admin: Você está acessando a empresa{' '}
              <u className="font-extrabold">{companyDisplayName}</u>
            </span>
          </div>
          <button
            onClick={onClearImpersonation}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 rounded-lg text-[11px] font-extrabold transition shadow shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Painel Super Admin</span>
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Brand logo & Title + Sidebar Hamburger Toggle */}
          <div className="flex items-center gap-2.5">
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
                title="Abrir Menu Lateral de Navegação"
              >
                <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            )}

            <button
              onClick={onBrandClick}
              className="flex items-center gap-3 text-left group transition hover:opacity-90 active:scale-98"
              title="Clique para ir à Tela Inicial (Início)"
            >
              <img
                src={companyLogo}
                alt={companyDisplayName}
                className="w-10 h-10 rounded-xl object-contain shadow-md shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition bg-slate-950/80 p-0.5"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {companyDisplayName}
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                    Chronix ERP
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                  {activeCompany?.document ? (
                    <span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">
                      CNPJ: {activeCompany.document}
                    </span>
                  ) : (
                    <span>Gestão Inteligente • Resultados Reais</span>
                  )}
                </p>
              </div>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Como Usar Button */}
            {onOpenContextHelp && (
              <button
                onClick={onOpenContextHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition text-xs font-bold"
                title="Como usar esta funcionalidade"
              >
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline">Como Usar</span>
              </button>
            )}

            {/* Preciso de Ajuda Support Button */}
            {onOpenSupport && (
              <button
                onClick={onOpenSupport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition text-xs font-bold"
                title="Preciso de Ajuda / Suporte Técnico"
              >
                <LifeBuoy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Preciso de Ajuda</span>
              </button>
            )}

            {/* Superadmin User Management shortcut */}
            {isSuperadmin && onOpenUserManagement && (
              <button
                onClick={onOpenUserManagement}
                className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition relative flex items-center gap-1"
                title="Painel Super Admin (Exclusivo)"
              >
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden lg:inline text-xs font-black">Painel Super Admin</span>
              </button>
            )}

            {/* Supabase Status Button */}
            <button
              onClick={onOpenSupabaseModal}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title={
                isSuperadmin
                  ? 'Configurar Supabase (Superadmin)'
                  : 'Status da Conexão Supabase'
              }
            >
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Theme Switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenProfileModal}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-400 transition"
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                    isSuperadmin
                      ? 'bg-amber-500 shadow-md'
                      : user.role === 'admin'
                      ? 'bg-blue-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {isSuperadmin ? (
                    <Crown className="w-4 h-4" />
                  ) : user.role === 'admin' ? (
                    'A'
                  ) : (
                    'F'
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-black leading-tight text-slate-800 dark:text-slate-200">
                    {user.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    {isSuperadmin ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Superadmin
                      </span>
                    ) : user.role === 'admin' ? (
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        Admin
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Operador
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                title="Sair do Sistema (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
