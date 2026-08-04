/**
 * Aquinos Frios - Dashboard Component
 * Clean, fast KPI summary cards, big action buttons, low stock & expiry warnings, and recent feed.
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
  Camera,
  ChevronRight,
  Boxes,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, Batch, Movement } from '../types';
import { formatStockDisplay } from '../lib/unitConverter';

interface DashboardProps {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  onOpenEntryModal: (prod?: Product) => void;
  onOpenExitModal: (prod?: Product) => void;
  onOpenXmlModal: () => void;
  onOpenScanner: () => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  batches,
  movements,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenXmlModal,
  onOpenScanner,
  onNavigateTab,
}) => {
  // Calculators
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock);
  const outOfStockProducts = products.filter((p) => p.current_stock <= 0);

  // Expiry calculators
  const now = new Date();
  const exp30d = new Date(now.getTime() + 30 * 86400000);

  const expiringBatches = batches.filter((b) => {
    if (b.current_qty <= 0) return false;
    const expDate = new Date(b.expiration_date);
    return expDate <= exp30d;
  });

  const expiredBatchesCount = batches.filter((b) => b.current_qty > 0 && new Date(b.expiration_date) < now).length;

  // Movements today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMovements = movements.filter((m) => m.date.startsWith(todayStr));
  const todayEntries = todayMovements.filter((m) => m.type === 'entrada');
  const todayExits = todayMovements.filter((m) => m.type === 'saida');

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2 backdrop-blur-sm border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel de Controle Inteligente</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Controle de Estoque Aquinos Frios
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Registro instantâneo de entradas, saídas e importações de XML com conversão automática de unidades.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenScanner}
              className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Escanear Código</span>
            </button>
          </div>
        </div>
      </div>

      {/* Big Touch Action Buttons (<5s speed) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => onOpenEntryModal()}
          className="group p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block uppercase tracking-wider">
              Reg. Entrada
            </span>
            <span className="text-lg font-extrabold text-emerald-950 dark:text-emerald-100 block">
              + Nova Entrada
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              Registrar em segundos
            </span>
          </div>
        </button>

        <button
          onClick={() => onOpenExitModal()}
          className="group p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block uppercase tracking-wider">
              Reg. Saída
            </span>
            <span className="text-lg font-extrabold text-rose-950 dark:text-rose-100 block">
              - Nova Saída
            </span>
            <span className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 block">
              Baixa automática FIFO
            </span>
          </div>
        </button>

        <button
          onClick={onOpenXmlModal}
          className="group p-4 sm:p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <FileCode2 className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block uppercase tracking-wider">
              Nota Fiscal
            </span>
            <span className="text-lg font-extrabold text-indigo-950 dark:text-indigo-100 block">
              Importar XML
            </span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5 block">
              Leitura de NFe e vínculos
            </span>
          </div>
        </button>

        <button
          onClick={onOpenScanner}
          className="group p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-left transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
              Código EAN
            </span>
            <span className="text-lg font-extrabold text-amber-950 dark:text-amber-100 block">
              Leitor Câmera
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 block">
              Consulta e bipagem rápida
            </span>
          </div>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div
          onClick={() => onNavigateTab('products')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Produtos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalProducts}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">cadastrados</span>
          </div>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => onNavigateTab('products')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Estoque Baixo
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {lowStockProducts.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">abaixo do mínimo</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => onNavigateTab('products')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-rose-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sem Estoque
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {outOfStockProducts.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">zerados</span>
          </div>
        </div>

        {/* Expiring / Expired */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="cursor-pointer bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Alertas Lote
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {expiringBatches.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {expiredBatchesCount > 0 ? `(${expiredBatchesCount} vencidos)` : 'próximos da validade'}
            </span>
          </div>
        </div>
      </div>

      {/* Quantidades Atuais de Estoque dos Produtos - Dashboard View */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Quantidades Atuais do Estoque de Produtos</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Visão geral consolidada dos saldos de todos os produtos do inventário.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('products')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Ver em Produtos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">Nenhum produto cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Marca</th>
                  <th className="py-2.5 px-3">Quantidade em Estoque</th>
                  <th className="py-2.5 px-3">Estoque Mínimo</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {products.map((p) => {
                  const isOut = p.current_stock <= 0;
                  const isLow = p.current_stock > 0 && p.current_stock <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {p.brand || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-black text-sm text-blue-600 dark:text-blue-400">
                        {formatStockDisplay(p, p.current_stock)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400">
                        {p.min_stock} {p.main_unit}
                      </td>
                      <td className="py-2.5 px-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                            SEM ESTOQUE
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold text-[10px]">
                            ESTOQUE BAIXO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenEntryModal(p)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition"
                          >
                            + Entrada
                          </button>
                          <button
                            onClick={() => onOpenExitModal(p)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 transition"
                          >
                            - Saída
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Summary Today & Low Stock Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today Summary */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>Movimentação Hoje</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {todayStr}
            </span>
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600 text-white">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">Entradas Hoje</span>
                  <span className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100">
                    {todayEntries.length} registro(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-600 text-white">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-rose-800 dark:text-rose-300 font-bold block">Saídas Hoje</span>
                  <span className="text-sm font-extrabold text-rose-950 dark:text-rose-100">
                    {todayExits.length} registro(s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Produtos que Exigem Reposição</span>
            </h3>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {[...lowStockProducts, ...outOfStockProducts].length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              👍 Excelente! Nenhum produto está com estoque baixo ou zerado no momento.
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
              {[...outOfStockProducts, ...lowStockProducts].slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Atual: <strong className={p.current_stock <= 0 ? 'text-rose-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                        {formatStockDisplay(p, p.current_stock)}
                      </strong> | Mínimo: {p.min_stock} {p.main_unit}
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenEntryModal(p)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shrink-0"
                  >
                    + Entrada
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
            <span>Últimas Movimentações em Tempo Real</span>
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
