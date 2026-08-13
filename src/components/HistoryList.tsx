/**
 * Aquinos Frios - Movement History Component
 * Immutable audit log of all stock movements with filters & conversion math view.
 */

import React, { useState } from 'react';
import {
  Clock,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Calendar,
  UserCheck,
  ChevronRight,
  X,
  Layers,
  Trash2,
} from 'lucide-react';
import { Movement } from '../types';
import { storage } from '../services/storage';

interface HistoryListProps {
  movements: Movement[];
  onRefresh?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ movements, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida' | 'ajuste'>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'manual' | 'xml' | 'inventario'>('all');

  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeleteMovement = () => {
    if (!selectedMovement) return;
    setDeleteError(null);
    try {
      storage.deleteMovement(selectedMovement.id);
      setDeleteSuccess(`✓ Lançamento do produto "${selectedMovement.product_name}" excluído e estoque revertido com sucesso!`);
      setConfirmDeleteOpen(false);
      setSelectedMovement(null);
      setTimeout(() => setDeleteSuccess(null), 5000);
      onRefresh?.();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir movimentação.');
    }
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.supplier_name && m.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    const matchesOrigin = originFilter === 'all' || m.origin === originFilter;

    return matchesSearch && matchesType && matchesOrigin;
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Histórico de Movimentações Imutável</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro detalhado com rastro do usuário, unidade utilizada e saldos antes/depois.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {deleteSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-sm flex items-center justify-between">
          <span>{deleteSuccess}</span>
          <button onClick={() => setDeleteSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar produto, usuário ou nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none"
            >
              <option value="all">Todos os Tipos (Entrada/Saída/Ajuste)</option>
              <option value="entrada">Apenas Entradas (+)</option>
              <option value="saida">Apenas Saídas (-)</option>
              <option value="ajuste">Ajustes de Inventário (&plusmn;)</option>
            </select>
          </div>

          <div>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none"
            >
              <option value="all">Todas as Origens</option>
              <option value="manual">Manual</option>
              <option value="xml">Importação XML</option>
              <option value="inventario">Inventário / Balanço</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
            Nenhuma movimentação registrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Tipo & Qtd Utilizada</th>
                  <th className="py-3 px-4">Qtd Convertida</th>
                  <th className="py-3 px-4">Saldos (Ant. &rarr; Atual)</th>
                  <th className="py-3 px-4">Usuário / Origem</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMovements.map((m) => {
                  const isEntry = m.type === 'entrada';
                  const isExit = m.type === 'saida';

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMovement(m)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('pt-BR')}{' '}
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        {m.product_name}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-extrabold text-xs px-2 py-0.5 rounded-full ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isExit
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          {isEntry ? '+' : isExit ? '-' : '&plusmn;'}
                          {m.used_qty} {m.used_unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {m.converted_qty} {m.main_unit}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {m.prev_stock} &rarr; <strong>{m.current_stock}</strong> {m.main_unit}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold block">{m.user_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {m.origin}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Details Drawer / Modal */}
      {selectedMovement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Comprovante de Movimentação</span>
              </h3>
              <button
                onClick={() => setSelectedMovement(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Produto</span>
                <strong className="text-sm font-extrabold text-slate-900 dark:text-white block">
                  {selectedMovement.product_name}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-400 block">Tipo & Qtd Utilizada</span>
                  <strong className="text-xs font-black text-blue-600">
                    {selectedMovement.type.toUpperCase()}: {selectedMovement.used_qty} {selectedMovement.used_unit}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-[10px] font-bold text-slate-400 block">Qtd Convertida Estoque</span>
                  <strong className="text-xs font-black text-slate-900 dark:text-white">
                    {selectedMovement.converted_qty} {selectedMovement.main_unit}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 space-y-1 font-mono">
                <span className="text-[10px] font-bold text-slate-400 uppercase block font-sans">
                  Saldos de Estoque
                </span>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Saldo Anterior:</span>
                  <span>{selectedMovement.prev_stock} {selectedMovement.main_unit}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-1">
                  <span>Saldo Atual:</span>
                  <span>{selectedMovement.current_stock} {selectedMovement.main_unit}</span>
                </div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <div><strong>Usuário Responsável:</strong> {selectedMovement.user_name} ({selectedMovement.user_role.toUpperCase()})</div>
                <div><strong>Origem do Registro:</strong> {selectedMovement.origin.toUpperCase()}</div>
                <div><strong>Data & Hora:</strong> {new Date(selectedMovement.date).toLocaleString('pt-BR')}</div>
                {selectedMovement.supplier_name && <div><strong>Fornecedor:</strong> {selectedMovement.supplier_name}</div>}
                {selectedMovement.batch_number && <div><strong>Lote:</strong> {selectedMovement.batch_number}</div>}
                {selectedMovement.notes && <div><strong>Observações:</strong> {selectedMovement.notes}</div>}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir e Reverter Estoque</span>
              </button>

              <button
                onClick={() => setSelectedMovement(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal for Movement Deletion */}
      {confirmDeleteOpen && selectedMovement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  Excluir Lançamento e Reverter Estoque
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirmação irreversível de estorno
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p className="font-medium">
                Você está prestes a excluir a movimentação do produto:
              </p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                {selectedMovement.product_name}
              </p>
              <p className="text-[11px] text-slate-500">
                Quantidade: <strong className="text-slate-800 dark:text-slate-200">{selectedMovement.used_qty} {selectedMovement.used_unit}</strong> ({selectedMovement.converted_qty} {selectedMovement.main_unit})
              </p>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                ⚠️ O estoque principal deste produto será automaticamente ajustado/revertido para o saldo anterior.
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteMovement}
                className="px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir e Reverter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
