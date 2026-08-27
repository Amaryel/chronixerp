/**
 * Chronix ERP - Navigation Component
 * Responsive Navigation with Cadastros & Movimentações submenus and updated module labels.
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Users,
  Clock,
  Settings,
  BookOpenCheck,
  Percent,
  Boxes,
  FileSpreadsheet,
  ChevronDown,
  FolderKanban,
  ArrowRightLeft,
  CheckCircle2,
  Truck,
  Menu,
} from 'lucide-react';
import { User, isUserAuthorizedForModule } from '../types';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'customers'
  | 'drivers'
  | 'entries'
  | 'exits'
  | 'venda_rapida'
  | 'fiados'
  | 'bulk_stock'
  | 'carga_vendedor'
  | 'reports'
  | 'history'
  | 'settings'
  | 'bulk_prices'
  | 'help_center';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  lowStockCount: number;
  expiringCount?: number;
  onOpenSidebar?: () => void;
  currentUser?: User | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  onOpenSidebar,
  currentUser,
}) => {
  const [cadastrosOpen, setCadastrosOpen] = useState(false);
  const [movimentacoesOpen, setMovimentacoesOpen] = useState(false);

  const isCadastrosActive = ['products', 'customers', 'drivers', 'bulk_prices'].includes(activeTab);
  const isMovimentacoesActive = ['entries', 'exits'].includes(activeTab);

  const canCadastros = ['customers', 'drivers', 'products', 'bulk_prices'].some((t) =>
    isUserAuthorizedForModule(currentUser, t as NavTab)
  );

  const canMovimentacoes = ['entries', 'exits'].some((t) =>
    isUserAuthorizedForModule(currentUser, t as NavTab)
  );

  return (
    <>
      {/* Invisible backdrop when any dropdown is open to handle click outside */}
      {(cadastrosOpen || movimentacoesOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setCadastrosOpen(false);
            setMovimentacoesOpen(false);
          }}
        />
      )}

      {/* Desktop Navigation Header Bar */}
      <nav className="hidden lg:block bg-slate-900 text-slate-300 border-b border-slate-800 relative z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 py-2 flex-wrap sm:flex-nowrap">
            {/* 1. Início */}
            {isUserAuthorizedForModule(currentUser, 'dashboard') && (
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setCadastrosOpen(false);
                  setMovimentacoesOpen(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Início</span>
              </button>
            )}

            {/* 2. Cadastros Submenu Dropdown */}
            {canCadastros && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCadastrosOpen((prev) => !prev);
                    setMovimentacoesOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isCadastrosActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>Cadastros</span>
                  {lowStockCount > 0 && isUserAuthorizedForModule(currentUser, 'products') && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cadastrosOpen ? 'rotate-180' : ''}`} />
                </button>

                {cadastrosOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                    {isUserAuthorizedForModule(currentUser, 'customers') && (
                      <button
                        onClick={() => {
                          setActiveTab('customers');
                          setCadastrosOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'customers' ? 'text-blue-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Clientes</span>
                      </button>
                    )}

                    {isUserAuthorizedForModule(currentUser, 'drivers') && (
                      <button
                        onClick={() => {
                          setActiveTab('drivers');
                          setCadastrosOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'drivers' ? 'text-blue-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-blue-400" />
                        <span>Motoristas</span>
                      </button>
                    )}

                    {isUserAuthorizedForModule(currentUser, 'products') && (
                      <button
                        onClick={() => {
                          setActiveTab('products');
                          setCadastrosOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'products' ? 'text-blue-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-blue-400" />
                          <span>Produtos</span>
                        </div>
                        {lowStockCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white rounded-full font-black">
                            {lowStockCount}
                          </span>
                        )}
                      </button>
                    )}

                    {isUserAuthorizedForModule(currentUser, 'bulk_prices') && (
                      <button
                        onClick={() => {
                          setActiveTab('bulk_prices');
                          setCadastrosOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'bulk_prices' ? 'text-blue-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <Percent className="w-4 h-4 text-amber-400" />
                        <span>Alteração de Preços</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Movimentações Submenu Dropdown */}
            {canMovimentacoes && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMovimentacoesOpen((prev) => !prev);
                    setCadastrosOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isMovimentacoesActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Movimentações</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${movimentacoesOpen ? 'rotate-180' : ''}`} />
                </button>

                {movimentacoesOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                    {isUserAuthorizedForModule(currentUser, 'entries') && (
                      <button
                        onClick={() => {
                          setActiveTab('entries');
                          setMovimentacoesOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'entries' ? 'text-emerald-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        <span>Estoque</span>
                      </button>
                    )}

                    {isUserAuthorizedForModule(currentUser, 'exits') && (
                      <button
                        onClick={() => {
                          setActiveTab('exits');
                          setMovimentacoesOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-bold transition hover:bg-slate-700 ${
                          activeTab === 'exits' ? 'text-rose-400 font-extrabold bg-slate-750' : 'text-slate-200'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        <span>Pré-Venda</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. PDV */}
            {isUserAuthorizedForModule(currentUser, 'venda_rapida') && (
              <button
                onClick={() => setActiveTab('venda_rapida')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'venda_rapida'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <span>PDV</span>
              </button>
            )}

            {/* 5. Contas a Receber */}
            {isUserAuthorizedForModule(currentUser, 'fiados') && (
              <button
                onClick={() => setActiveTab('fiados')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'fiados'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BookOpenCheck className="w-4 h-4 text-amber-400" />
                <span>Contas a Receber</span>
              </button>
            )}

            {/* 6. Ajuste de Estoque */}
            {isUserAuthorizedForModule(currentUser, 'bulk_stock') && (
              <button
                onClick={() => setActiveTab('bulk_stock')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'bulk_stock'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Ajuste de Estoque</span>
              </button>
            )}

            {/* 7. Rota de Vendas */}
            {isUserAuthorizedForModule(currentUser, 'carga_vendedor') && (
              <button
                onClick={() => setActiveTab('carga_vendedor')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'carga_vendedor'
                    ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                    : 'hover:bg-slate-800 text-emerald-400 font-bold'
                }`}
              >
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Rota de Vendas</span>
              </button>
            )}

            {/* 8. Relatórios */}
            {isUserAuthorizedForModule(currentUser, 'reports') && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Relatórios</span>
              </button>
            )}

            {/* 9. Histórico */}
            {isUserAuthorizedForModule(currentUser, 'history') && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Histórico</span>
              </button>
            )}

            {/* 10. Configurações */}
            {isUserAuthorizedForModule(currentUser, 'settings') && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-1.5 py-1.5 shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-full gap-1">
          {isUserAuthorizedForModule(currentUser, 'dashboard') && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Início</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'products') && (
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'products'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Package className="w-5 h-5 mb-0.5" />
              <span>Produtos</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'venda_rapida') && (
            <button
              onClick={() => setActiveTab('venda_rapida')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'venda_rapida'
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ShoppingCart className="w-5 h-5 mb-0.5 text-blue-500" />
              <span>PDV</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'exits') && (
            <button
              onClick={() => setActiveTab('exits')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'exits'
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-5 h-5 mb-0.5 text-rose-500" />
              <span>Pré-Venda</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'carga_vendedor') && (
            <button
              onClick={() => setActiveTab('carga_vendedor')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'carga_vendedor'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Truck className="w-5 h-5 mb-0.5 text-emerald-500" />
              <span>Rota</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'fiados') && (
            <button
              onClick={() => setActiveTab('fiados')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'fiados'
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BookOpenCheck className="w-5 h-5 mb-0.5 text-amber-500" />
              <span>Contas</span>
            </button>
          )}

          {isUserAuthorizedForModule(currentUser, 'reports') && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[50px] ${
                activeTab === 'reports'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 mb-0.5 text-indigo-500" />
              <span>Relatórios</span>
            </button>
          )}

          {/* Menu Lateral Hamburger Drawer Button */}
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-black transition min-w-[50px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60"
            >
              <Menu className="w-5 h-5 mb-0.5 text-blue-600 dark:text-blue-400" />
              <span>Menu</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
