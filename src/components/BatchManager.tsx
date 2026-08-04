/**
 * Aquinos Frios - Batch & Expiration Control Component (Controle de Lotes PEPS/FIFO)
 */

import React, { useState } from 'react';
import {
  Boxes,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Batch, Product, User } from '../types';

interface BatchManagerProps {
  batches: Batch[];
  products: Product[];
  currentUser?: User;
  onRefresh?: () => void;
}

export const BatchManager: React.FC<BatchManagerProps> = ({ batches, products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | '7d' | '15d' | '30d'>('all');

  const now = new Date();
  const d7 = new Date(now.getTime() + 7 * 86400000);
  const d15 = new Date(now.getTime() + 15 * 86400000);
  const d30 = new Date(now.getTime() + 30 * 86400000);

  const activeBatches = batches.filter((b) => b.current_qty > 0);

  const filteredBatches = activeBatches.filter((b) => {
    const prodName = b.product_name || products.find((p) => p.id === b.product_id)?.name || '';
    const matchesSearch =
      prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(searchTerm.toLowerCase());

    const expDate = new Date(b.expiration_date);

    let matchesStatus = true;
    if (statusFilter === 'expired') matchesStatus = expDate < now;
    if (statusFilter === '7d') matchesStatus = expDate >= now && expDate <= d7;
    if (statusFilter === '15d') matchesStatus = expDate >= now && expDate <= d15;
    if (statusFilter === '30d') matchesStatus = expDate >= now && expDate <= d30;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Controle de Lotes & Validade (PEPS / FIFO)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoramento preventivo de lotes com consumo automático do estoque mais antigo.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar lote ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Todos ({activeBatches.length})
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === 'expired'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              🔴 Vencidos
            </button>

            <button
              onClick={() => setStatusFilter('7d')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === '7d'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-orange-600 dark:text-orange-400'
              }`}
            >
              🟠 &le; 7 dias
            </button>

            <button
              onClick={() => setStatusFilter('15d')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === '15d'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              🟡 &le; 15 dias
            </button>

            <button
              onClick={() => setStatusFilter('30d')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition whitespace-nowrap ${
                statusFilter === '30d'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              🔵 &le; 30 dias
            </button>
          </div>
        </div>
      </div>

      {/* Batches Table / Grid */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            Nenhum lote localizado com o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Número do Lote</th>
                  <th className="py-3 px-4">Data de Validade</th>
                  <th className="py-3 px-4">Qtd. em Lote</th>
                  <th className="py-3 px-4 text-right">Status do Lote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredBatches.map((b) => {
                  const prod = products.find((p) => p.id === b.product_id);
                  const expDate = new Date(b.expiration_date);
                  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);

                  let badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                  let statusText = 'Normal';

                  if (daysLeft < 0) {
                    badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-extrabold';
                    statusText = `Vencido há ${Math.abs(daysLeft)} dia(s)`;
                  } else if (daysLeft <= 7) {
                    badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-extrabold';
                    statusText = `Vence em ${daysLeft} dia(s)!`;
                  } else if (daysLeft <= 15) {
                    badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold';
                    statusText = `Vence em ${daysLeft} dia(s)`;
                  } else if (daysLeft <= 30) {
                    badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold';
                    statusText = `Vence em ${daysLeft} dia(s)`;
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        {b.product_name || prod?.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold">
                        {b.batch_number}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {new Date(b.expiration_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        {b.current_qty} {prod?.main_unit || 'un'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${badgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
