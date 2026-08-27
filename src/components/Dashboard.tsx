/**
 * Chronix ERP - Dashboard Component
 * Clean, lively interactive KPIs for sales, stock valuation, movement feeds, and direct shortcuts.
 */

import React from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  FileCode2,
  ChevronRight,
  Boxes,
  Sparkles,
  ShoppingCart,
  BookOpenCheck,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Product, Batch, Movement, User, isUserAuthorizedForModule } from '../types';
import { formatStockDisplay } from '../lib/unitConverter';
import { NavTab } from './Navigation';

interface DashboardProps {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  onOpenEntryModal: (prod?: Product) => void;
  onOpenExitModal: (prod?: Product) => void;
  onOpenXmlModal: () => void;
  onNavigateTab: (tab: NavTab) => void;
  currentUser?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  batches,
  movements,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenXmlModal,
  onNavigateTab,
  currentUser,
}) => {
  // Calculators
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock);
  const outOfStockProducts = products.filter((p) => p.current_stock <= 0);

  // Total stock financial valuation
  const totalStockValuation = products.reduce(
    (acc, p) => acc + (p.current_stock || 0) * (p.unit_price || p.sale_price || 0),
    0
  );

  // Expiry calculators
  const now = new Date();
  const exp30d = new Date(now.getTime() + 30 * 86400000);

  const expiringBatches = batches.filter((b) => {
    if (b.current_qty <= 0) return false;
    const expDate = new Date(b.expiration_date);
    return expDate <= exp30d;
  });

  const expiredBatchesCount = batches.filter(
    (b) => b.current_qty > 0 && new Date(b.expiration_date) < now
  ).length;

  // Movements today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMovements = movements.filter((m) => m.date.startsWith(todayStr));
  const todayEntries = todayMovements.filter((m) => m.type === 'entrada');
  const todayExits = todayMovements.filter((m) => m.type === 'saida');

  // Today's total sales estimation
  const todaySalesValue = todayExits.reduce(
    (acc, m) => acc + (m.used_qty || 0) * (m.unit_price || 0),
    0
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold mb-2 backdrop-blur-sm border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Painel de Gestão Inteligente • Chronix ERP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Visão Geral de Vendas e Estoque
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Monitore movimentações em tempo real, acesse atalhos rápidos de PDV, Pré-Venda e Carga do Vendedor.
            </p>
          </div>

          {isUserAuthorizedForModule(currentUser, 'carga_vendedor') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('carga_vendedor')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Carga do Vendedor</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Shortcuts Bar: Atalhos Solicitados (Pré-Venda, PDV, Contas a Receber, Relatórios, Carga) */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <span>Acesso Rápido e Operações</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Pré-Venda */}
          {isUserAuthorizedForModule(currentUser, 'exits') && (
            <button
              onClick={() => onNavigateTab('exits')}
              className="group p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 block uppercase tracking-wider">
                  Operação
                </span>
                <span className="text-base font-black text-rose-950 dark:text-rose-100 block leading-tight">
                  Pré-Venda
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5 block font-semibold">
                  Emitir orçamentos e saídas
                </span>
              </div>
            </button>
          )}

          {/* 2. PDV */}
          {isUserAuthorizedForModule(currentUser, 'venda_rapida') && (
            <button
              onClick={() => onNavigateTab('venda_rapida')}
              className="group p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block uppercase tracking-wider">
                  Caixa Rápido
                </span>
                <span className="text-base font-black text-blue-950 dark:text-blue-100 block leading-tight">
                  PDV
                </span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5 block font-semibold">
                  Vendas de balcão diretas
                </span>
              </div>
            </button>
          )}

          {/* 3. Contas a Receber */}
          {isUserAuthorizedForModule(currentUser, 'fiados') && (
            <button
              onClick={() => onNavigateTab('fiados')}
              className="group p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
                <BookOpenCheck className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
                  Financeiro
                </span>
                <span className="text-base font-black text-amber-950 dark:text-amber-100 block leading-tight">
                  Contas a Receber
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 block font-semibold">
                  Controle de fiados e parcelas
                </span>
              </div>
            </button>
          )}

          {/* 4. Carga do Vendedor */}
          {isUserAuthorizedForModule(currentUser, 'carga_vendedor') && (
            <button
              onClick={() => onNavigateTab('carga_vendedor')}
              className="group p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
                  Conferência
                </span>
                <span className="text-base font-black text-emerald-950 dark:text-emerald-100 block leading-tight">
                  Carga Vendedor
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 block font-semibold">
                  Fechamento físico e caixa
                </span>
              </div>
            </button>
          )}

          {/* 5. Relatórios */}
          {isUserAuthorizedForModule(currentUser, 'reports') && (
            <button
              onClick={() => onNavigateTab('reports')}
              className="group p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 block uppercase tracking-wider">
                  Gerencial
                </span>
                <span className="text-base font-black text-indigo-950 dark:text-indigo-100 block leading-tight">
                  Relatórios
                </span>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-0.5 block font-semibold">
                  Análises e exportações
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards - Vivo e Completo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock Value */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Valor em Estoque
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white block">
              R$ {totalStockValuation.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
              {totalProducts} produtos cadastrados
            </span>
          </div>
        </div>

        {/* Vendas Hoje */}
        <div
          onClick={() => onNavigateTab('carga_vendedor')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saídas / Vendas Hoje
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
              R$ {todaySalesValue.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
              {todayExits.length} lançamento(s) de saída hoje
            </span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigateTab('products')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estoque Baixo
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {lowStockProducts.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">abaixo do mínimo</span>
          </div>
        </div>

        {/* Expiring Batches */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Alertas Lotes
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {expiringBatches.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {expiredBatchesCount > 0 ? `(${expiredBatchesCount} vencidos)` : 'próximos do vencimento'}
            </span>
          </div>
        </div>
      </div>

      {/* Movement Summary Today & Low Stock Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today Summary */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>Movimentações de Hoje</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {todayStr.split('-').reverse().join('/')}
            </span>
          </h3>

          <div className="space-y-3">
            <div
              onClick={() => onNavigateTab('entries')}
              className="cursor-pointer p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-between hover:bg-emerald-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600 text-white font-black">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">Entradas de Estoque</span>
                  <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100">
                    {todayEntries.length} registro(s)
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </div>

            <div
              onClick={() => onNavigateTab('exits')}
              className="cursor-pointer p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-between hover:bg-rose-100 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-600 text-white font-black">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-rose-800 dark:text-rose-300 font-bold block">Pré-Vendas e Saídas</span>
                  <span className="text-sm font-extrabold text-rose-950 dark:text-rose-100">
                    {todayExits.length} registro(s)
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-600" />
            </div>

            <button
              onClick={onOpenXmlModal}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
            >
              <FileCode2 className="w-4 h-4 text-indigo-600" />
              <span>Importar Nota Fiscal XML</span>
            </button>
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Produtos com Estoque Crítico ou Zerado</span>
            </h3>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Ver em Cadastros</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {[...lowStockProducts, ...outOfStockProducts].length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              👍 Excelente! Todos os produtos do catálogo estão com estoque adequado.
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar pr-1">
              {[...outOfStockProducts, ...lowStockProducts].slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Atual: <strong className={p.current_stock <= 0 ? 'text-rose-600 font-black' : 'text-amber-600 font-black'}>
                        {formatStockDisplay(p, p.current_stock)}
                      </strong> | Mínimo: {p.min_stock} {p.main_unit}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenEntryModal(p)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shrink-0"
                  >
                    + Repor Entrada
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Movements Feed */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Últimas Movimentações do Sistema</span>
          </h3>
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Ver Histórico Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {movements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Nenhuma movimentação registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {movements.slice(0, 5).map((m) => {
              const isEntry = m.type === 'entrada';
              const isExit = m.type === 'saida';
              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isExit
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {isEntry ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {m.product_name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                        Por: {m.user_name} ({m.origin.toUpperCase()}) {m.notes ? `• ${m.notes}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-black text-xs block ${
                        isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isEntry ? '+' : '-'}{m.used_qty} {m.used_unit}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                      {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
