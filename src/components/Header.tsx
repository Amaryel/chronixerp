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
} from 'lucide-react';
import { User, Company } from '../types';
import { SUPERADMIN_EMAIL, chronixLogoImg } from '../services/storage';

interface HeaderProps {
  user: User;
  activeCompany?: Company;
  companies?: Company[];
  onSelectCompany?: (companyId: string) => void;
  onOpenSupabaseModal: () => void;
  onOpenUserManagement?: () => void;
  onOpenProfileModal: () => void;
  onOpenScanner: () => void;
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
  onOpenSupabaseModal,
  onOpenUserManagement,
  onOpenProfileModal,
  onOpenScanner,
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand logo & Title (Clickable to go home) */}
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
                <>
                  <span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">CNPJ: {activeCompany.document}</span>
                </>
              ) : (
                <span>Gestão Inteligente • Resultados Reais</span>
              )}
            </p>
          </div>
        </button>

        {/* Company Selector for Superadmin */}
        {isSuperadmin && companies.length > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-sm">
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
              Empresa Ativa:
            </span>
            <select
              value={activeCompany?.id || ''}
              onChange={(e) => onSelectCompany?.(e.target.value)}
              className="bg-transparent font-black text-slate-900 dark:text-white outline-none cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition"
              title="Alternar empresa em modo Superadmin"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">
                  {c.name} ({c.document})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-amber-500 pointer-events-none -ml-1" />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Scanner shortcut button */}
          <button
            onClick={onOpenScanner}
            title="Escanear Código de Barras"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Câmera / EAN</span>
          </button>

          {/* Superadmin User Management shortcut */}
          {isSuperadmin && onOpenUserManagement && (
            <button
              onClick={onOpenUserManagement}
              className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition relative flex items-center gap-1"
              title="Gerenciamento de Usuários (Exclusivo Superadmin)"
            >
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden lg:inline text-xs font-black">Usuários</span>
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
  );
};
