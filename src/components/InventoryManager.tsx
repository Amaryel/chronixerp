/**
 * Aquinos Frios - Inventory Counting & Adjustment Component (Modo Inventário / Balanço)
 */

import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Calculator,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Product, User } from '../types';
import { convertToMainUnit, getAvailableUnitsForProduct } from '../lib/unitConverter';
import { storage } from '../services/storage';

interface InventoryManagerProps {
  products: Product[];
  currentUser: User;
  onRefresh: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  currentUser,
  onRefresh,
}) => {
  const [isCounting, setIsCounting] = useState(false);

  // Map of counts per product_id: { countedQty, countedUnit }
  const [counts, setCounts] = useState<
    Record<
      string,
      {
        countedQty: number | '';
        countedUnit: string;
      }
    >
  >({});

  const handleStartInventory = () => {
    const initialCounts: Record<string, any> = {};
    products.forEach((p) => {
      initialCounts[p.id] = {
        countedQty: p.current_stock, // Default to current stock
        countedUnit: p.main_unit,
      };
    });
    setCounts(initialCounts);
    setIsCounting(true);
  };

  const handleCountChange = (productId: string, val: number | '', unit?: string) => {
    const current = counts[productId] || { countedQty: '', countedUnit: 'kg' };
    setCounts({
      ...counts,
      [productId]: {
        countedQty: val,
        countedUnit: unit || current.countedUnit,
      },
    });
  };

  const handleFinalizeInventory = () => {
    if (currentUser.role !== 'admin') {
      alert('⚠️ Apenas Administradores podem finalizar inventário e aplicar ajustes.');
      return;
    }

    if (confirm('Deseja finalizar o inventário e atualizar o estoque com as contagens físicas?')) {
      const itemsToSave: any[] = [];

      products.forEach((p) => {
        const c = counts[p.id];
        if (c && c.countedQty !== '') {
          const conversion = convertToMainUnit(p, Number(c.countedQty), c.countedUnit);
          const diff = conversion.mainQty - p.current_stock;

          itemsToSave.push({
            product_id: p.id,
            product_name: p.name,
            main_unit: p.main_unit,
            system_qty: p.current_stock,
            counted_qty: Number(c.countedQty),
            counted_unit: c.countedUnit,
            converted_counted_qty: conversion.mainQty,
            diff_qty: diff,
          });
        }
      });

      storage.saveInventory({
        date: new Date().toISOString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        status: 'concluido',
        notes: 'Inventário Geral Físico',
        items: itemsToSave,
      });

      setIsCounting(false);
      onRefresh();
      alert('✅ Inventário concluído com sucesso! Ajustes gravados e histórico atualizado.');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title & Start/Cancel Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Modo Inventário & Balanço Físico</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Informe a contagem encontrada em qualquer unidade e o sistema calcula divergências e ajustes.
          </p>
        </div>

        <div>
          {!isCounting ? (
            <button
              onClick={handleStartInventory}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Sessão de Inventário</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCounting(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 font-bold text-xs rounded-xl text-slate-800 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeInventory}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar & Aplicar Ajustes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!isCounting ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center space-y-3 max-w-xl mx-auto my-8">
          <ClipboardList className="w-12 h-12 text-blue-500 mx-auto" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
            Pronto para iniciar a contagem física?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Clique em <strong>Iniciar Sessão de Inventário</strong> para abrir a lista de contagem.
            Você poderá informar a quantidade encontrada na unidade que preferir (caixa, peça, kg, g, etc.).
          </p>
        </div>
      ) : (
        /* Inventory Counting Table */
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Sessão em andamento. Ao finalizar, qualquer diferença resultará em um registro automático de Ajuste de Estoque.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Estoque Sistema</th>
                  <th className="py-3 px-4">Qtd Encontrada Físico</th>
                  <th className="py-3 px-4">Unidade Usada</th>
                  <th className="py-3 px-4 text-right">Diferença / Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {products.map((p) => {
                  const c = counts[p.id] || { countedQty: p.current_stock, countedUnit: p.main_unit };
                  const availableUnits = getAvailableUnitsForProduct(p);

                  const conversion = convertToMainUnit(p, Number(c.countedQty) || 0, c.countedUnit);
                  const diff = conversion.mainQty - p.current_stock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        {p.name}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {p.current_stock} {p.main_unit}
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="any"
                          value={c.countedQty}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            handleCountChange(p.id, e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-black text-sm"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={c.countedUnit}
                          onChange={(e) => handleCountChange(p.id, c.countedQty, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-xs"
                        >
                          {availableUnits.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right font-black">
                        {diff === 0 ? (
                          <span className="text-slate-400">Sem alteração</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-600 font-extrabold">
                            +{diff.toLocaleString('pt-BR')} {p.main_unit}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-extrabold">
                            {diff.toLocaleString('pt-BR')} {p.main_unit}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
