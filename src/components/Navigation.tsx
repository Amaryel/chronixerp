/**
 * Aquinos Frios - Navigation Component
 * Responsive Navigation for Mobile and Desktop matching prompt specifications.
 */

import React from 'react';
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
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'entries'
  | 'exits'
  | 'venda_rapida'
  | 'fiados'
  | 'reports'
  | 'bulk_prices'
  | 'bulk_stock'
  | 'customers'
  | 'history'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  lowStockCount: number;
  expiringCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Início', icon: LayoutDashboard },
    {
      id: 'products' as NavTab,
      label: 'Produtos',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    { id: 'entries' as NavTab, label: 'Entradas', icon: ArrowDownLeft, highlight: 'text-emerald-500' },
    { id: 'exits' as NavTab, label: 'Saídas', icon: ArrowUpRight, highlight: 'text-rose-500' },
    { id: 'venda_rapida' as NavTab, label: 'Venda Rápida', icon: ShoppingCart, highlight: 'text-blue-500' },
    { id: 'fiados' as NavTab, label: 'Fiados', icon: BookOpenCheck, highlight: 'text-amber-500' },
    { id: 'reports' as NavTab, label: 'Relatórios', icon: FileSpreadsheet, highlight: 'text-indigo-400' },
    { id: 'bulk_prices' as NavTab, label: 'Preços em Lote', icon: Percent },
    { id: 'bulk_stock' as NavTab, label: 'Ajuste em Lote', icon: Boxes },
    { id: 'customers' as NavTab, label: 'Clientes', icon: Users },
    { id: 'history' as NavTab, label: 'Histórico', icon: Clock },
    { id: 'settings' as NavTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation Header Bar */}
      <nav className="hidden lg:block bg-slate-900 text-slate-300 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight && !isActive ? item.highlight : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[10px] font-black text-white rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Optimized touch bar for mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-1.5 py-1.5 shadow-lg overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-full gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-bold transition min-w-[54px] ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-0.5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[58px] text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
