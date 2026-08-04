import React, { useState } from 'react';
import {
  FileText,
  Search,
  ShoppingCart,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Package,
  Edit,
} from 'lucide-react';
import { PreSale, PreSaleStatus } from '../types';
import { storage } from '../services/storage';
import { ReceiptModal } from './ReceiptModal';
import { EditPreSaleModal } from './EditPreSaleModal';

interface PreVendasProps {
  onRefresh: () => void;
  onLoadPreSaleToPDV: (preSale: PreSale) => void;
  onOpenNewPreSale: () => void;
}

export const PreVendas: React.FC<PreVendasProps> = ({
  onRefresh,
  onLoadPreSaleToPDV,
  onOpenNewPreSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | PreSaleStatus | 'expirada'>('todas');
  const [selectedPreSaleForReceipt, setSelectedPreSaleForReceipt] = useState<PreSale | null>(null);
  const [editingPreSale, setEditingPreSale] = useState<PreSale | null>(null);

  const preSales = storage.getPreSales();
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered Pre-Sales
  const filteredPreSales = preSales.filter((pv) => {
    const matchesSearch =
      pv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pv.customer_name && pv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const isExpired = pv.status === 'pendente' && pv.valid_until && pv.valid_until < todayStr;

    if (statusFilter === 'todas') return matchesSearch;
    if (statusFilter === 'expirada') return matchesSearch && isExpired;
    if (statusFilter === 'pendente') return matchesSearch && pv.status === 'pendente' && !isExpired;
    return matchesSearch && pv.status === statusFilter;
  });

  const handleCancelPreSale = (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja cancelar a pré-venda ${code}?`)) {
      storage.updatePreSaleStatus(id, 'cancelada');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-blue-500/40 text-blue-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Gestão de Pedidos
          </span>
          <h1 className="text-2xl font-black tracking-tight">Pré-Vendas & Orçamentos</h1>
          <p className="text-xs text-blue-100/90 font-medium mt-0.5">
            Consulte orçamentos pendentes e converta em vendas no PDV com 1 toque.
          </p>
        </div>

        <button
          onClick={onOpenNewPreSale}
          className="w-full sm:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-95"
        >
          <FileText className="w-5 h-5" />
          <span>+ Nova Pré-Venda</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por número (#PV-1001) ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'expirada', label: 'Expiradas' },
                { id: 'finalizada', label: 'Finalizadas' },
                { id: 'cancelada', label: 'Canceladas' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pre-Sales Cards List */}
      <div className="space-y-3">
        {filteredPreSales.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 space-y-3">
            <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 stroke-1" />
            <p className="font-bold text-sm">Nenhuma pré-venda encontrada</p>
            <p className="text-xs text-slate-400">
              Crie orçamentos em &quot;Saídas &gt; Pré-Venda&quot; para consultar aqui.
            </p>
          </div>
        ) : (
          filteredPreSales.map((pv) => {
            const isExpired = pv.status === 'pendente' && pv.valid_until && pv.valid_until < todayStr;

            return (
              <div
                key={pv.id}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Info block */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      {pv.code}
                    </span>

                    {/* Status Badge */}
                    {isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Expirada
                      </span>
                    ) : pv.status === 'pendente' ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-[11px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        Pendente
                      </span>
                    ) : pv.status === 'finalizada' ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Finalizada no PDV
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-[11px] flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        Cancelada
                      </span>
                    )}

                    <span className="text-xs text-slate-400 font-medium ml-auto md:ml-0">
                      {new Date(pv.date || pv.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{pv.customer_name || 'Cliente Avulso'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>{pv.items.length} item(ns)</span>
                    </div>

                    {pv.valid_until && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Válido até: {new Date(pv.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    {pv.items.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(' • ')}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Valor Estimado
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      R$ {pv.total_amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* View Receipt */}
                    <button
                      onClick={() => setSelectedPreSaleForReceipt(pv)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                      title="Ver Comprovante / PDF"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Comprovante</span>
                    </button>

                    {/* Edit Pre-Sale */}
                    {pv.status === 'pendente' && (
                      <button
                        onClick={() => setEditingPreSale(pv)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                        title="Editar Quantidades e Itens"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                    )}

                    {/* Convert in PDV */}
                    {pv.status === 'pendente' && (
                      <button
                        onClick={() => onLoadPreSaleToPDV(pv)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Carregar no PDV</span>
                      </button>
                    )}

                    {/* Cancel Pre-Sale */}
                    {pv.status === 'pendente' && (
                      <button
                        onClick={() => handleCancelPreSale(pv.id, pv.code)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition"
                        title="Cancelar Pré-Venda"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT PRE-SALE MODAL */}
      <EditPreSaleModal
        isOpen={!!editingPreSale}
        preSale={editingPreSale}
        onClose={() => setEditingPreSale(null)}
        onSuccess={onRefresh}
      />

      {/* RECEIPT MODAL */}
      {selectedPreSaleForReceipt && (
        <ReceiptModal
          isOpen={!!selectedPreSaleForReceipt}
          type="pre_venda"
          preSale={selectedPreSaleForReceipt}
          onClose={() => setSelectedPreSaleForReceipt(null)}
        />
      )}
    </div>
  );
};
