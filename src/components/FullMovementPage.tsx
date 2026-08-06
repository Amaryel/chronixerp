/**
 * Aquinos Frios - FullMovementPage Component
 * Full-screen dedicated page for Entradas (Inward) and Saídas (Outward) movements.
 * Provides rich multi-item batch entry, live unit conversion calculator, and real-time history.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Plus,
  Trash2,
  ListPlus,
  CheckCircle2,
  Calculator,
  Search,
  Calendar,
  Layers,
  Sparkles,
  FileText,
  AlertCircle,
  Clock,
  User,
  Building,
} from 'lucide-react';
import { Product, Supplier, Movement, MovementType, PreSale } from '../types';
import { convertToMainUnit, getAvailableUnitsForProduct, formatStockDisplay } from '../lib/unitConverter';
import { storage } from '../services/storage';
import { PriceUpdatePromptModal } from './PriceUpdatePromptModal';
import { ReceiptModal } from './ReceiptModal';

interface FullMovementPageProps {
  type: MovementType; // 'entrada' | 'saida'
  products: Product[];
  suppliers: Supplier[];
  movements: Movement[];
  onOpenCreateProductModal?: () => void;
  onRefresh: () => void;
}

interface BatchQueueItem {
  id: string;
  productId: string;
  productName: string;
  usedQty: number;
  usedUnit: string;
  mainQtyConverted: number;
  mainUnit: string;
  supplierId?: string;
  supplierName?: string;
  totalPrice?: number;
  costPrice?: number;
  salePrice?: number;
  markup?: number;
  batchNumber?: string;
  expirationDate?: string;
  notes?: string;
}

export const FullMovementPage: React.FC<FullMovementPageProps> = ({
  type,
  products,
  suppliers,
  movements,
  onOpenCreateProductModal,
  onRefresh,
}) => {
  const isEntry = type === 'entrada';

  // State for form
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [usedQty, setUsedQty] = useState<number>(1);
  const [usedUnit, setUsedUnit] = useState<string>('kg');

  const [supplierId, setSupplierId] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number | undefined>(undefined);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Price Update State (for Entradas)
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [markup, setMarkup] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');

  // Saída Mode (for Saídas): 'avulsa' | 'pre_venda'
  const [saidaMode, setSaidaMode] = useState<'avulsa' | 'pre_venda'>('avulsa');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

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
  const [pendingEntryItems, setPendingEntryItems] = useState<BatchQueueItem[]>([]);

  // Created Pre-Sale Receipt Modal State
  const [createdPreSaleReceipt, setCreatedPreSaleReceipt] = useState<PreSale | null>(null);

  const customers = storage.getCustomers();

  // Queue of items to submit together
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search/Filter for history table at bottom
  const [historySearch, setHistorySearch] = useState('');

  // Ref for auto-focusing first field
  const productSelectRef = React.useRef<HTMLSelectElement>(null);

  const resetFormAndQueue = () => {
    const autoClear = storage.getSettings().auto_clear_form;
    if (autoClear) {
      setQueue([]);
      setSelectedProductId('');
      setUsedQty(1);
      setSupplierId('');
      setTotalPrice(undefined);
      setBatchNumber('');
      setExpirationDate('');
      setNotes('');
      setSelectedCustomerId('');
      setTimeout(() => {
        productSelectRef.current?.focus();
      }, 100);
    }
  };

  // Keep selected product in sync if selected product is no longer present in products
  useEffect(() => {
    if (selectedProductId && !products.some((p) => p.id === selectedProductId)) {
      setSelectedProductId('');
    }
  }, [products]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Sync available units and prices when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      const units = getAvailableUnitsForProduct(selectedProduct);
      if (!units.includes(usedUnit)) {
        setUsedUnit(selectedProduct.main_unit || units[0] || 'kg');
      }

      const c = selectedProduct.cost_price || 0;
      const s = selectedProduct.sale_price || selectedProduct.unit_price || 0;
      const m = selectedProduct.markup !== undefined ? selectedProduct.markup : (c > 0 ? ((s - c) / c) * 100 : 0);

      setCostPrice(c);
      setSalePrice(s);
      setMarkup(m ? Number(m.toFixed(2)) : 0);
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

  // Live unit conversion
  const liveConversion = selectedProduct ? convertToMainUnit(selectedProduct, usedQty || 0, usedUnit) : null;
  const currentStockMain = selectedProduct?.current_stock || 0;

  // Add current form input to batch queue
  const handleAddItemToQueue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedProduct) {
      setErrorMessage('Selecione ou cadastre um produto primeiro.');
      return;
    }

    if (!usedQty || usedQty <= 0) {
      setErrorMessage('Informe uma quantidade maior que zero.');
      return;
    }

    // Check stock for exit
    if (!isEntry) {
      if (saidaMode === 'avulsa') {
        const allowNeg = storage.getSettings().allow_negative_stock;
        if (!allowNeg && liveConversion && currentStockMain < liveConversion.mainQty) {
          setErrorMessage(
            `Estoque insuficiente para ${selectedProduct.name}! Disponível: ${currentStockMain} ${selectedProduct.main_unit}.`
          );
          return;
        }
      } else if (saidaMode === 'pre_venda') {
        if (liveConversion && currentStockMain < liveConversion.mainQty) {
          const confirmProceed = window.confirm(
            `Atenção: Estoque Insuficiente!\n\nProduto: ${selectedProduct.name}\nEstoque Atual: ${currentStockMain} ${selectedProduct.main_unit}\nSolicitado: ${usedQty} ${usedUnit}\n\nDeseja continuar e incluir este item na Pré-Venda mesmo assim?`
          );
          if (!confirmProceed) {
            return;
          }
        }
      }
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);

    const newItem: BatchQueueItem = {
      id: 'queue-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      usedQty: Number(usedQty),
      usedUnit,
      mainQtyConverted: liveConversion?.mainQty || Number(usedQty),
      mainUnit: selectedProduct.main_unit,
      supplierId: supplierId || undefined,
      supplierName: selectedSupplier?.name,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      costPrice: isEntry && typeof costPrice === 'number' ? costPrice : undefined,
      salePrice: isEntry && typeof salePrice === 'number' ? salePrice : (selectedProduct.sale_price || selectedProduct.unit_price),
      markup: isEntry && typeof markup === 'number' ? markup : undefined,
      batchNumber: batchNumber.trim() || undefined,
      expirationDate: expirationDate || undefined,
      notes: notes.trim() || undefined,
    };

    setQueue([...queue, newItem]);

    // Reset quantity and notes for next item
    setUsedQty(1);
    setNotes('');
    setBatchNumber('');
    setTotalPrice(undefined);
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue(queue.filter((q) => q.id !== id));
  };

  const executeEntries = (items: BatchQueueItem[]) => {
    for (const item of items) {
      storage.registerEntry({
        productId: item.productId,
        usedQty: item.usedQty,
        usedUnit: item.usedUnit,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        totalPrice: item.totalPrice,
        batchNumber: item.batchNumber,
        expirationDate: item.expirationDate,
        origin: 'manual',
        notes: item.notes,
      });
    }

    setQueue([]);
    setSuccessMessage(
      `Entrada de ${items.length} ${
        items.length === 1 ? 'item registrada' : 'itens registradas'
      } com sucesso!`
    );
    resetFormAndQueue();
    onRefresh();
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleConfirmPriceUpdatePermanent = () => {
    // Update permanent product catalog prices
    for (const item of pendingEntryItems) {
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
    executeEntries(pendingEntryItems);
    setPendingEntryItems([]);
  };

  const handleDeclinePriceUpdatePermanent = () => {
    setIsPricePromptOpen(false);
    executeEntries(pendingEntryItems);
    setPendingEntryItems([]);
  };

  const handleDeleteMovement = (mov: Movement) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir este lançamento de ${mov.product_name} (${mov.used_qty} ${mov.used_unit})? O estoque será revertido automaticamente.`
      )
    ) {
      try {
        storage.deleteMovement(mov.id);
        setSuccessMessage('Lançamento excluído e estoque revertido com sucesso.');
        setTimeout(() => setSuccessMessage(null), 3000);
        onRefresh();
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao excluir lançamento.');
      }
    }
  };

  const handleFinalizeAll = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    let itemsToProcess = [...queue];

    // If queue is empty, try to process the current form input
    if (itemsToProcess.length === 0) {
      if (!selectedProduct) {
        setErrorMessage('Nenhum produto selecionado.');
        return;
      }
      if (!usedQty || usedQty <= 0) {
        setErrorMessage('Informe a quantidade ou adicione itens à lista de lançamento.');
        return;
      }

      if (!isEntry && saidaMode === 'avulsa') {
        const allowNeg = storage.getSettings().allow_negative_stock;
        if (!allowNeg && liveConversion && currentStockMain < liveConversion.mainQty) {
          setErrorMessage(
            `Estoque insuficiente para ${selectedProduct.name}! Disponível: ${currentStockMain} ${selectedProduct.main_unit}.`
          );
          return;
        }
      }

      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      itemsToProcess.push({
        id: 'direct-item',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        usedQty: Number(usedQty),
        usedUnit,
        mainQtyConverted: liveConversion?.mainQty || Number(usedQty),
        mainUnit: selectedProduct.main_unit,
        supplierId: supplierId || undefined,
        supplierName: selectedSupplier?.name,
        totalPrice: totalPrice ? Number(totalPrice) : undefined,
        costPrice: isEntry && typeof costPrice === 'number' ? costPrice : undefined,
        salePrice: isEntry && typeof salePrice === 'number' ? salePrice : (selectedProduct.sale_price || selectedProduct.unit_price),
        markup: isEntry && typeof markup === 'number' ? markup : undefined,
        batchNumber: batchNumber.trim() || undefined,
        expirationDate: expirationDate || undefined,
        notes: notes.trim() || undefined,
      });
    }

    if (isEntry) {
      // Check for price changes
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
        setPendingEntryItems(itemsToProcess);
        setChangedPriceItems(changes);
        setIsPricePromptOpen(true);
        return;
      }

      executeEntries(itemsToProcess);
      return;
    }

    // Process Exits
    try {
      if (saidaMode === 'pre_venda') {
        // Create PRÉ-VENDA (no stock deduction!)
        const customer = customers.find((c) => c.id === selectedCustomerId);
        const preSaleItems = itemsToProcess.map((it) => {
          const prod = products.find((p) => p.id === it.productId);
          const unitPrice = it.salePrice || prod?.sale_price || prod?.unit_price || 0;
          return {
            product_id: it.productId,
            product_name: it.productName,
            quantity: it.usedQty,
            unit: it.usedUnit,
            unit_price: unitPrice,
            total_price: it.usedQty * unitPrice,
          };
        });

        const totalAmount = preSaleItems.reduce((acc, i) => acc + i.total_price, 0);

        const savedPreSale = storage.savePreSale({
          customer_id: selectedCustomerId || undefined,
          customer_name: customer?.name || undefined,
          date: new Date().toISOString(),
          valid_until: validUntil || undefined,
          items: preSaleItems,
          total_amount: totalAmount,
          notes: notes || undefined,
        });

        setQueue([]);
        setSuccessMessage('✓ Pré-Venda registrada com sucesso! NENHUM ESTOQUE FOI DEDUZIDO.');
        setCreatedPreSaleReceipt(savedPreSale);
        resetFormAndQueue();
        onRefresh();
        return;
      }

      // Saída Avulsa (immediate stock deduction)
      for (const item of itemsToProcess) {
        storage.registerExit({
          productId: item.productId,
          usedQty: item.usedQty,
          usedUnit: item.usedUnit,
          origin: 'manual',
          notes: item.notes,
        });
      }

      setQueue([]);
      setSuccessMessage(
        `Saída de ${itemsToProcess.length} ${
          itemsToProcess.length === 1 ? 'item registrada' : 'itens registradas'
        } com sucesso!`
      );
      resetFormAndQueue();
      onRefresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar movimentação.');
    }
  };

  // Filter relevant movements for history table below
  const filteredMovements = movements
    .filter((m) => m.type === type)
    .filter((m) => {
      if (!historySearch) return true;
      const term = historySearch.toLowerCase();
      return (
        m.product_name.toLowerCase().includes(term) ||
        (m.batch_number && m.batch_number.toLowerCase().includes(term)) ||
        (m.supplier_name && m.supplier_name.toLowerCase().includes(term)) ||
        (m.notes && m.notes.toLowerCase().includes(term))
      );
    });

  const availableUnits = selectedProduct ? getAvailableUnitsForProduct(selectedProduct) : ['kg', 'g', 'un'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              isEntry
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-rose-500 text-white shadow-rose-500/20'
            }`}
          >
            {isEntry ? <ArrowDownLeft className="w-8 h-8" /> : <ArrowUpRight className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEntry ? 'Página de Entrada de Estoque' : 'Página de Pré-Venda'}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isEntry
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {isEntry ? 'Módulo Compra / Recebimento' : 'Módulo Venda / Baixa'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isEntry
                ? 'Registre compras, entradas de fornecedores e doações com conversão automática de caixas/fardos em quilos/gramas.'
                : 'Registre saídas de vendas, fatiamento e baixas com deduções automáticas do estoque.'}
            </p>
          </div>
        </div>

        {/* Quick Product Creator Button if needed */}
        {onOpenCreateProductModal && (
          <button
            onClick={onOpenCreateProductModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shrink-0 shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Produto</span>
          </button>
        )}
      </div>

      {/* Main Form Workspace & Batch List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>1. Lançamento de Item</span>
            </h3>
            {selectedProduct && (
              <span className="text-xs text-slate-500 font-semibold">
                Estoque Atual: <strong className="text-slate-900 dark:text-white font-extrabold">{selectedProduct.current_stock} {selectedProduct.main_unit}</strong>
              </span>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Saída Mode Selection (Avulsa vs Pré-Venda) */}
          {!isEntry && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Selecione o Tipo de Saída:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSaidaMode('avulsa')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    saidaMode === 'avulsa'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-xs block">Saída Avulsa</span>
                    <span className="text-[10px] opacity-80 leading-tight block mt-0.5">
                      Baixa e movimentação de estoque imediata.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSaidaMode('pre_venda')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    saidaMode === 'pre_venda'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-xs block">Pré-Venda / Orçamento</span>
                    <span className="text-[10px] opacity-80 leading-tight block mt-0.5">
                      Salva pedido sem movimentar estoque agora.
                    </span>
                  </div>
                </button>
              </div>

              {saidaMode === 'pre_venda' && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block font-extrabold text-indigo-950 dark:text-indigo-200 mb-1 text-[11px]">
                      Cliente (Opcional)
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs"
                    >
                      <option value="">Cliente Avulso / Não informado</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-indigo-950 dark:text-indigo-200 mb-1 text-[11px]">
                      Validade do Orçamento
                    </label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No products alert state */}
          {products.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-200">
                Nenhum Produto Cadastrado
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sua lista de cadastro está limpa. Cadastre seu primeiro produto para registrar entradas e saídas.
              </p>
              {onOpenCreateProductModal && (
                <button
                  onClick={onOpenCreateProductModal}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs inline-flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Produto</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddItemToQueue} className="space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                  Selecione o Produto *
                </label>
                <select
                  ref={productSelectRef}
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-extrabold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Selecione o Produto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — (Estoque Atual: {p.current_stock} {p.main_unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    value={usedQty}
                    onChange={(e) => setUsedQty(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-black text-base outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={usedUnit}
                    onChange={(e) => setUsedUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-extrabold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Conversion Box */}
              {selectedProduct && liveConversion && (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 dark:text-indigo-300 uppercase">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Calculadora de Conversão</span>
                  </div>
                  <div className="text-sm font-black text-indigo-900 dark:text-indigo-100">
                    {usedQty} {usedUnit} = {liveConversion.mainQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {selectedProduct.main_unit}
                  </div>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 italic">
                    {liveConversion.explanation}
                  </p>
                </div>
              )}

              {/* Specific fields for Entrada (including PRICE UPDATE fields) */}
              {isEntry && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {/* Price Update Box */}
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                    <span className="font-extrabold text-emerald-900 dark:text-emerald-300 block text-[11px] uppercase">
                      Atualização de Preços do Produto (Opcional)
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Preço Custo (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={costPrice}
                          onChange={(e) => handleCostPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Markup (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="30%"
                          value={markup}
                          onChange={(e) => handleMarkupChange(e.target.value === '' ? '' : Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Preço Venda (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={salePrice}
                          onChange={(e) => handleSalePriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-extrabold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fornecedor
                      </label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">Nenhum / Não informado</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Valor Total da Entrada (R$)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0,00"
                        value={totalPrice || ''}
                        onChange={(e) => setTotalPrice(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Número do Lote
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: LOTE-202"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Data de Validade
                      </label>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Detalhes da Operação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nota Fiscal #1092, Venda Balcão, Transferência"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Add to Queue Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adicionar Item à Lista de Lançamento</span>
              </button>
            </form>
          )}
        </div>

        {/* Queue Summary Column (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-emerald-600" />
                <span>2. Itens em Lote ({queue.length})</span>
              </h3>
              {queue.length > 0 && (
                <button
                  onClick={() => setQueue([])}
                  className="text-[11px] text-rose-500 hover:underline font-bold"
                >
                  Limpar Lista
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ListPlus className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs font-semibold">
                  Nenhum item adicionado à lista temporária ainda.
                </p>
                <p className="text-[11px] text-slate-500">
                  Você pode lançar um único produto ou reunir vários produtos para dar baixa/entrada de uma só vez.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-3 max-h-[380px] overflow-y-auto pr-1">
                {queue.map((item, index) => {
                  const unitP = item.salePrice || item.costPrice || 0;
                  const itemSubtotal = item.usedQty * unitP;
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                          {index + 1}. {item.productName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                          <span>
                            Qtd: <strong className="text-slate-800 dark:text-slate-200">{item.usedQty} {item.usedUnit}</strong> ({item.mainQtyConverted} {item.mainUnit})
                          </span>
                          {!isEntry && unitP > 0 && (
                            <>
                              <span>• Preço Un: <strong className="text-slate-800 dark:text-slate-200">R$ {unitP.toFixed(2)}</strong></span>
                              <span>• Subtotal: <strong className="text-emerald-600 dark:text-emerald-400 font-black">R$ {itemSubtotal.toFixed(2)}</strong></span>
                            </>
                          )}
                        </div>
                        {item.notes && <span className="text-[10px] text-slate-400 italic block">{item.notes}</span>}
                      </div>

                      <button
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals Summary Card */}
          {(!isEntry || queue.length > 0) && (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 my-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Quantidade Total de Itens:</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {queue.length > 0
                    ? queue.reduce((acc, i) => acc + i.usedQty, 0).toLocaleString('pt-BR')
                    : (usedQty || 0).toLocaleString('pt-BR')}{' '}
                  {queue.length > 0 ? 'itens' : usedUnit}
                </span>
              </div>

              {!isEntry && (
                <div className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-700 dark:text-slate-200 uppercase font-black text-[11px]">
                    Valor Total ({saidaMode === 'pre_venda' ? 'Pré-Venda' : 'Saída'}):
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                    R${' '}
                    {(queue.length > 0
                      ? queue.reduce((acc, i) => acc + i.usedQty * (i.salePrice || 0), 0)
                      : (usedQty || 0) * (selectedProduct?.sale_price || selectedProduct?.unit_price || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Confirm Final Batch Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={handleFinalizeAll}
              disabled={products.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition ${
                products.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : isEntry
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {queue.length > 0
                  ? `Confirmar Lançamento de ${queue.length} ${queue.length === 1 ? 'Item' : 'Itens'}`
                  : `Confirmar Lançamento Único (${isEntry ? 'Entrada' : 'Saída'})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* History Table directly below for immediate visibility */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Histórico Recente de {isEntry ? 'Entradas' : 'Saídas'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredMovements.length} Registros
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por produto, lote..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhuma {isEntry ? 'entrada' : 'saída'} encontrada no histórico.
          </div>
        ) : (
          <div>
            {/* Mobile History Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMovements.slice(0, 15).map((mov) => (
                <div key={`mob-hist-${mov.id}`} className="py-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500">
                      {new Date(mov.date).toLocaleString('pt-BR')}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isEntry ? '+' : '-'}{mov.used_qty} {mov.used_unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {mov.product_name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({mov.converted_qty} {mov.main_unit})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Por: {mov.user_name}</span>
                    <div className="flex items-center gap-2">
                      {mov.notes || mov.batch_number ? (
                        <span className="text-[11px] truncate max-w-[140px]">
                          {mov.batch_number ? `Lote: ${mov.batch_number} ` : ''}
                          {mov.notes}
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleDeleteMovement(mov)}
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                        title="Excluir e Reverter Estoque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop History Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3">Lançamento</th>
                    <th className="py-3 px-3">Conversão Estoque</th>
                    <th className="py-3 px-3">Usuário</th>
                    <th className="py-3 px-3">Detalhes</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {filteredMovements.slice(0, 15).map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(mov.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                        {mov.product_name}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-black ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isEntry ? '+' : '-'}{mov.used_qty} {mov.used_unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {mov.converted_qty} {mov.main_unit}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {mov.user_name}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {mov.notes || mov.batch_number ? (
                          <span>
                            {mov.batch_number ? `Lote: ${mov.batch_number} ` : ''}
                            {mov.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteMovement(mov)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Excluir Lançamento e Reverter Estoque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PRICE UPDATE PROMPT MODAL FOR ENTRADAS */}
      <PriceUpdatePromptModal
        isOpen={isPricePromptOpen}
        items={changedPriceItems}
        onConfirmPermanent={handleConfirmPriceUpdatePermanent}
        onKeepCurrent={handleDeclinePriceUpdatePermanent}
        onClose={() => setIsPricePromptOpen(false)}
      />

      {/* CREATED PRE-SALE RECEIPT MODAL */}
      {createdPreSaleReceipt && (
        <ReceiptModal
          isOpen={!!createdPreSaleReceipt}
          type="pre_venda"
          preSale={createdPreSaleReceipt}
          onClose={() => setCreatedPreSaleReceipt(null)}
        />
      )}
    </div>
  );
};
