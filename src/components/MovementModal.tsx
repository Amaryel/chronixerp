/**
 * Aquinos Frios - Movement Modal Component (Entrada & Saída - Lançamento Individual ou em Lote)
 * Suporta lançamento de múltiplos produtos em uma única transação rápida.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  X,
  AlertCircle,
  Plus,
  Trash2,
  ListPlus,
  CheckCircle2,
} from 'lucide-react';
import { Product, Supplier, MovementType } from '../types';
import { convertToMainUnit, getAvailableUnitsForProduct, formatStockDisplay } from '../lib/unitConverter';
import { storage } from '../services/storage';
import { PriceUpdatePromptModal } from './PriceUpdatePromptModal';

interface MovementModalProps {
  isOpen: boolean;
  type: MovementType; // 'entrada' | 'saida'
  initialProduct?: Product | null;
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PendingItem {
  id: string;
  productId: string;
  productName: string;
  usedQty: number;
  usedUnit: string;
  supplierId?: string;
  unitPrice?: number;
  totalPrice?: number;
  costPrice?: number;
  salePrice?: number;
  markup?: number;
  batchNumber?: string;
  expirationDate?: string;
  notes?: string;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  type,
  initialProduct,
  products,
  suppliers,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const isEntry = type === 'entrada';

  // State for form
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct ? initialProduct.id : ''
  );
  const [usedQty, setUsedQty] = useState<string>('1');
  const [usedUnit, setUsedUnit] = useState<string>('kg');

  // Optional Entry Fields
  const [supplierId, setSupplierId] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Price Update State (for Entradas)
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [markup, setMarkup] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');

  // Price Prompt Modal State
  const [isPricePromptOpen, setIsPricePromptOpen] = useState(false);
  const [changedPriceItems, setChangedPriceItems] = useState<{
    productName: string;
    oldCost?: number;
    newCost?: number;
    oldSale?: number;
    newSale?: number;
    markup?: number;
  }[]>([]);
  const [pendingSubmitItems, setPendingSubmitItems] = useState<PendingItem[]>([]);

  // Queue of items to submit together
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableUnits = selectedProduct ? getAvailableUnitsForProduct(selectedProduct) : ['kg', 'g', 'UN', 'cx', 'fardo'];
  const currentStockMain = selectedProduct ? selectedProduct.current_stock : 0;

  // Sync available units and prices when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setUsedUnit(selectedProduct.main_unit || 'kg');
      setErrorMessage(null);

      const c = selectedProduct.cost_price || 0;
      const s = selectedProduct.sale_price || selectedProduct.unit_price || 0;
      const m = selectedProduct.markup !== undefined ? selectedProduct.markup : (c > 0 ? ((s - c) / c) * 100 : 0);

      setCostPrice(c || '');
      setSalePrice(s || '');
      setMarkup(m ? Number(m.toFixed(2)) : '');
    } else {
      setCostPrice('');
      setSalePrice('');
      setMarkup('');
    }
  }, [selectedProductId, selectedProduct]);

  // Dynamic Price Calculations
  const handleCostPriceChange = (val: number | '') => {
    setCostPrice(val);
    if (typeof val === 'number' && val > 0) {
      if (typeof markup === 'number') {
        const calculatedSale = val * (1 + markup / 100);
        setSalePrice(Number(calculatedSale.toFixed(2)));
      } else if (typeof salePrice === 'number' && salePrice > 0) {
        const calculatedMarkup = ((salePrice - val) / val) * 100;
        setMarkup(Number(calculatedMarkup.toFixed(2)));
      }
    }
  };

  const handleMarkupChange = (val: number | '') => {
    setMarkup(val);
    if (typeof costPrice === 'number' && costPrice > 0) {
      if (typeof val === 'number') {
        const calculatedSale = costPrice * (1 + val / 100);
        setSalePrice(Number(calculatedSale.toFixed(2)));
      }
    }
  };

  const handleSalePriceChange = (val: number | '') => {
    setSalePrice(val);
    if (typeof val === 'number' && typeof costPrice === 'number' && costPrice > 0) {
      const calculatedMarkup = ((val - costPrice) / costPrice) * 100;
      setMarkup(Number(calculatedMarkup.toFixed(2)));
    }
  };

  // Reset queue when modal opens
  useEffect(() => {
    setPendingItems([]);
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    }
  }, [isOpen, initialProduct]);

  if (!selectedProduct) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full text-center space-y-4">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            Nenhum produto cadastrado para movimentação.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Add current form item to pending queue
  const handleAddItemToQueue = () => {
    setErrorMessage(null);

    if (!selectedProduct) {
      setErrorMessage('Selecione um produto.');
      return;
    }

    const numericQty = parseFloat(usedQty);
    if (!usedQty || isNaN(numericQty) || numericQty <= 0) {
      setErrorMessage('Informe uma quantidade válida.');
      return;
    }

    if (!isEntry) {
      const allowNeg = storage.getSettings().allow_negative_stock;
      const conversion = convertToMainUnit(selectedProduct, numericQty, usedUnit);
      if (!allowNeg && currentStockMain < conversion.mainQty) {
        setErrorMessage(
          `Estoque insuficiente para ${selectedProduct.name}! Saldo disponível: ${currentStockMain} ${selectedProduct.main_unit}.`
        );
        return;
      }
    }

    const newItem: PendingItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      usedQty: numericQty,
      usedUnit,
      supplierId: supplierId || undefined,
      totalPrice: totalPrice ? parseFloat(totalPrice) : undefined,
      costPrice: isEntry && typeof costPrice === 'number' ? costPrice : undefined,
      salePrice: isEntry && typeof salePrice === 'number' ? salePrice : (selectedProduct.sale_price || selectedProduct.unit_price),
      markup: isEntry && typeof markup === 'number' ? markup : undefined,
      batchNumber: batchNumber.trim() || undefined,
      expirationDate: expirationDate || undefined,
      notes: notes.trim() || undefined,
    };

    setPendingItems([...pendingItems, newItem]);

    // Reset current form for next product
    setUsedQty('1');
    setNotes('');
  };

  const handleRemovePendingItem = (id: string) => {
    setPendingItems(pendingItems.filter((item) => item.id !== id));
  };

  const executeEntriesInModal = (items: PendingItem[]) => {
    try {
      for (const item of items) {
        if (isEntry) {
          const selectedSupplier = suppliers.find((s) => s.id === item.supplierId);
          storage.registerEntry({
            productId: item.productId,
            usedQty: item.usedQty,
            usedUnit: item.usedUnit,
            supplierId: item.supplierId,
            supplierName: selectedSupplier?.name,
            totalPrice: item.totalPrice,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate,
            origin: 'manual',
            notes: item.notes,
          });
        } else {
          storage.registerExit({
            productId: item.productId,
            usedQty: item.usedQty,
            usedUnit: item.usedUnit,
            origin: 'manual',
            notes: item.notes,
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar movimentação.');
    }
  };

  const handleConfirmPermanentModal = () => {
    for (const item of pendingSubmitItems) {
      if (item.costPrice !== undefined || item.salePrice !== undefined) {
        storage.updateProductPrices(
          item.productId,
          item.costPrice,
          item.salePrice,
          item.markup
        );
      }
    }
    setIsPricePromptOpen(false);
    executeEntriesInModal(pendingSubmitItems);
    setPendingSubmitItems([]);
  };

  const handleDeclinePermanentModal = () => {
    setIsPricePromptOpen(false);
    executeEntriesInModal(pendingSubmitItems);
    setPendingSubmitItems([]);
  };

  const handleFinalizeBatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    let itemsToProcess = [...pendingItems];

    // If queue is empty, try to include the current form input
    if (itemsToProcess.length === 0) {
      if (!selectedProduct) {
        setErrorMessage('Selecione um produto.');
        return;
      }

      const numericQty = parseFloat(usedQty);
      if (!usedQty || isNaN(numericQty) || numericQty <= 0) {
        setErrorMessage('Informe a quantidade ou adicione itens à lista.');
        return;
      }

      if (!isEntry) {
        const allowNeg = storage.getSettings().allow_negative_stock;
        const conversion = convertToMainUnit(selectedProduct, numericQty, usedUnit);
        if (!allowNeg && currentStockMain < conversion.mainQty) {
          setErrorMessage(
            `Estoque insuficiente para ${selectedProduct.name}! Saldo disponível: ${currentStockMain} ${selectedProduct.main_unit}.`
          );
          return;
        }
      }

      itemsToProcess.push({
        id: 'item-direct',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        usedQty: numericQty,
        usedUnit,
        supplierId: supplierId || undefined,
        totalPrice: totalPrice ? parseFloat(totalPrice) : undefined,
        costPrice: isEntry && typeof costPrice === 'number' ? costPrice : undefined,
        salePrice: isEntry && typeof salePrice === 'number' ? salePrice : (selectedProduct.sale_price || selectedProduct.unit_price),
        markup: isEntry && typeof markup === 'number' ? markup : undefined,
        batchNumber: batchNumber.trim() || undefined,
        expirationDate: expirationDate || undefined,
        notes: notes.trim() || undefined,
      });
    }

    if (isEntry) {
      const changes: {
        productName: string;
        oldCost?: number;
        newCost?: number;
        oldSale?: number;
        newSale?: number;
        markup?: number;
      }[] = [];

      for (const item of itemsToProcess) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const oldC = prod.cost_price || 0;
          const oldS = prod.sale_price || prod.unit_price || 0;
          const newC = item.costPrice !== undefined ? item.costPrice : oldC;
          const newS = item.salePrice !== undefined ? item.salePrice : oldS;

          if (Math.abs(oldC - newC) > 0.001 || Math.abs(oldS - newS) > 0.001) {
            changes.push({
              productName: item.productName,
              oldCost: oldC,
              newCost: newC,
              oldSale: oldS,
              newSale: newS,
              markup: item.markup,
            });
          }
        }
      }

      if (changes.length > 0) {
        setPendingSubmitItems(itemsToProcess);
        setChangedPriceItems(changes);
        setIsPricePromptOpen(true);
        return;
      }
    }

    executeEntriesInModal(itemsToProcess);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl text-white font-bold shadow-md ${
                isEntry ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
              }`}
            >
              {isEntry ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEntry ? 'Registrar Entradas (Em Lote / Múltiplos)' : 'Registrar Saídas (Em Lote / Múltiplos)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione um ou vários produtos ao mesmo lançamento antes de confirmar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleFinalizeBatch} className="space-y-4 text-xs">
          {/* Add Product Section */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
              Selecionar Produto & Quantidade
            </span>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Produto *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Selecione o Produto --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Atual: {p.current_stock} {p.main_unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={usedQty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setUsedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-sm outline-none"
                  placeholder="Informe a quantidade"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unidade *
                </label>
                <select
                  value={usedUnit}
                  onChange={(e) => setUsedUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs outline-none"
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Entry details & Price Update */}
            {isEntry && (
              <div className="space-y-3 pt-1">
                {/* Price Update Box */}
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-300 block text-[10px] uppercase">
                    Atualização de Preços do Produto (Opcional)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Custo (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={costPrice}
                        onChange={(e) => handleCostPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Markup (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={markup}
                        onChange={(e) => handleMarkupChange(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        Venda (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => handleSalePriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-extrabold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                      Lote (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="LOTE-101"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                      Validade (opcional)
                    </label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Observações (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Entrega parcial, venda rápida"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddItemToQueue}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Item à Lista de Lançamento</span>
            </button>
          </div>

          {/* Pending Batch Items List */}
          {pendingItems.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-blue-600" />
                <span>Itens na Lista ({pendingItems.length})</span>
              </span>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pendingItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">
                        {index + 1}. {item.productName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Qtd: <strong>{item.usedQty} {item.usedUnit}</strong> {item.notes ? `• ${item.notes}` : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePendingItem(item.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 font-bold text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition text-xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-white font-extrabold shadow-md transition text-xs flex items-center gap-1.5 ${
                isEntry
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {pendingItems.length > 0
                  ? `Finalizar Lançamento (${pendingItems.length} Itens)`
                  : isEntry
                  ? 'Confirmar Entrada'
                  : 'Confirmar Saída'}
              </span>
            </button>
          </div>
        </form>
      </div>

      <PriceUpdatePromptModal
        isOpen={isPricePromptOpen}
        items={changedPriceItems}
        onConfirmPermanent={handleConfirmPermanentModal}
        onKeepCurrent={handleDeclinePermanentModal}
        onClose={() => setIsPricePromptOpen(false)}
      />
    </div>
  );
};
