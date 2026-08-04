/**
 * Aquinos Frios - Ajuste de Estoque em Lote (Inventário e Auditoria)
 */

import React, { useState } from 'react';
import {
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Product } from '../types';
import { storage } from '../services/storage';
import { formatStockDisplay } from '../lib/unitConverter';

interface BulkStockAdjustmentProps {
  products: Product[];
  onRefresh: () => void;
}

interface StockRowState {
  productId: string;
  name: string;
  categoryName: string;
  mainUnit: string;
  currentStock: number;
  newStock: number;
  isModified: boolean;
}

export const BulkStockAdjustment: React.FC<BulkStockAdjustmentProps> = ({
  products,
  onRefresh,
}) => {
  const categories = storage.getCategories();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Inventário físico rotativo');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize stock rows
  const [tableRows, setTableRows] = useState<StockRowState[]>(() =>
    products.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      return {
        productId: p.id,
        name: p.name,
        categoryName: cat?.name || 'Geral',
        mainUnit: p.main_unit || 'UN',
        currentStock: p.current_stock || 0,
        newStock: p.current_stock || 0,
        isModified: false,
      };
    })
  );

  // Sync rows when products prop changes
  React.useEffect(() => {
    const hasModified = tableRows.some((r) => r.isModified);
    if (!hasModified) {
      setTableRows(
        products.map((p) => {
          const cat = categories.find((c) => c.id === p.category_id);
          return {
            productId: p.id,
            name: p.name,
            categoryName: cat?.name || 'Geral',
            mainUnit: p.main_unit || 'UN',
            currentStock: p.current_stock || 0,
            newStock: p.current_stock || 0,
            isModified: false,
          };
        })
      );
    }
  }, [products]);

  const handleStockChange = (productId: string, val: number) => {
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const validVal = Math.max(0, val);
        const isModified = validVal !== row.currentStock;
        return {
          ...row,
          newStock: validVal,
          isModified,
        };
      })
    );
  };

  const handleSaveAdjustments = () => {
    const modifiedRows = tableRows.filter((r) => r.isModified);
    if (modifiedRows.length === 0) {
      alert('Nenhuma alteração de estoque para aplicar.');
      return;
    }

    if (!adjustmentReason.trim()) {
      alert('É obrigatório informar o Motivo do Ajuste de Estoque para auditoria.');
      return;
    }

    try {
      const adjustments = modifiedRows.map((r) => ({
        productId: r.productId,
        newStock: r.newStock,
      }));

      storage.bulkAdjustStockBatch(adjustments, adjustmentReason.trim());
      onRefresh();

      setSuccessMsg(`${modifiedRows.length} produtos tiveram o estoque reajustado! Audit log gravado.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reset modified flags
      setTableRows((prev) => prev.map((r) => ({ ...r, currentStock: r.newStock, isModified: false })));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao reajustar estoque.');
    }
  };

  const filteredRows = tableRows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || r.categoryName === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const modifiedCount = tableRows.filter((r) => r.isModified).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-blue-500/40 text-blue-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Auditoria & Inventário
          </span>
          <h1 className="text-2xl font-black tracking-tight">Ajuste de Estoque em Lote</h1>
          <p className="text-xs text-blue-100/90 font-medium mt-0.5">
            Realize contagens físicas e acertos de inventário com registro automático de auditoria.
          </p>
        </div>

        <button
          onClick={handleSaveAdjustments}
          disabled={modifiedCount === 0}
          className={`px-5 py-3 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition active:scale-95 ${
            modifiedCount > 0
              ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 animate-pulse'
              : 'bg-indigo-800 text-indigo-300 opacity-60 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Confirmar Ajustes ({modifiedCount})</span>
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* MANDATORY REASON BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Motivo do Ajuste (Obrigatório para Auditoria):</span>
        </label>
        <select
          value={adjustmentReason}
          onChange={(e) => setAdjustmentReason(e.target.value)}
          className="w-full sm:w-96 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
        >
          <option value="Inventário físico rotativo">Inventário físico rotativo</option>
          <option value="Avaria ou perda de mercadoria">Avaria ou perda de mercadoria</option>
          <option value="Data de validade vencida">Data de validade vencida</option>
          <option value="Diferença de contagem de balcão">Diferença de contagem de balcão</option>
          <option value="Ajuste inicial de cadastro">Ajuste inicial de cadastro</option>
        </select>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs w-full sm:w-auto"
        >
          <option value="all">Todas Categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                <th className="p-3">Produto</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Estoque Atual</th>
                <th className="p-3">Novo Estoque (Físico)</th>
                <th className="p-3">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRows.map((row) => {
                const diff = row.newStock - row.currentStock;

                return (
                  <tr
                    key={row.productId}
                    className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      row.isModified ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="p-3">
                      <p className="font-extrabold text-slate-900 dark:text-white">{row.name}</p>
                      <p className="text-[10px] text-slate-400">{row.categoryName}</p>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black rounded text-[10px]">
                        {row.mainUnit}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-slate-600 dark:text-slate-400">
                      {row.currentStock} {row.mainUnit}
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        step={row.mainUnit === 'UN' ? '1' : '0.01'}
                        value={row.newStock}
                        onChange={(e) =>
                          handleStockChange(row.productId, parseFloat(e.target.value) || 0)
                        }
                        className="w-32 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>

                    <td className="p-3 font-bold">
                      {diff === 0 ? (
                        <span className="text-slate-400">Sem alteração</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-600 font-black">+ {diff.toFixed(2)} {row.mainUnit}</span>
                      ) : (
                        <span className="text-rose-600 font-black">{diff.toFixed(2)} {row.mainUnit}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
