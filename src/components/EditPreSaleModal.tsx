import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  Trash2,
  Plus,
  Save,
  User,
  Calendar,
  AlertCircle,
  Package,
} from 'lucide-react';
import { PreSale, PreSaleItem, Product, Customer } from '../types';
import { storage } from '../services/storage';
import { getAvailableUnitsForProduct } from '../lib/unitConverter';

interface EditPreSaleModalProps {
  isOpen: boolean;
  preSale: PreSale | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPreSaleModal: React.FC<EditPreSaleModalProps> = ({
  isOpen,
  preSale,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !preSale) return null;

  const [items, setItems] = useState<PreSaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Add Product State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);
  const [addUnit, setAddUnit] = useState<string>('kg');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const products = storage.getProducts();
  const customers = storage.getCustomers();

  useEffect(() => {
    if (preSale) {
      setItems([...preSale.items]);
      setSelectedCustomerId(preSale.customer_id || '');
      setValidUntil(preSale.valid_until || '');
      setNotes(preSale.notes || '');
      setErrorMessage(null);
      setSelectedProductId('');
    }
  }, [preSale]);

  const selectedProductToAdd = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProductToAdd) {
      setAddUnit(selectedProductToAdd.main_unit || 'kg');
    }
  }, [selectedProductId]);

  const handleQtyChange = (index: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 0) return;
    const updated = [...items];
    const item = updated[index];
    item.quantity = newQty;
    item.total_price = Number((newQty * item.unit_price).toFixed(2));
    setItems(updated);
  };

  const handleUnitPriceChange = (index: number, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    const updated = [...items];
    const item = updated[index];
    item.unit_price = newPrice;
    item.total_price = Number((item.quantity * newPrice).toFixed(2));
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedProductToAdd) {
      setErrorMessage('Selecione um produto.');
      return;
    }

    if (!addQty || addQty <= 0) {
      setErrorMessage('Informe uma quantidade válida.');
      return;
    }

    // Check stock for pre-sale
    if (addQty > selectedProductToAdd.current_stock) {
      const confirmProceed = window.confirm(
        `Atenção: Estoque insuficiente!\n\nProduto: ${selectedProductToAdd.name}\nEstoque Atual: ${selectedProductToAdd.current_stock} ${selectedProductToAdd.main_unit}\nSolicitado: ${addQty} ${addUnit}\n\nDeseja continuar e incluir este item na pré-venda mesmo assim?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    const unitPrice = selectedProductToAdd.sale_price || selectedProductToAdd.unit_price || 0;
    const totalPrice = Number((addQty * unitPrice).toFixed(2));

    const newItem: PreSaleItem = {
      product_id: selectedProductToAdd.id,
      product_name: selectedProductToAdd.name,
      quantity: addQty,
      unit: addUnit,
      unit_price: unitPrice,
      total_price: totalPrice,
    };

    setItems([...items, newItem]);
    setAddQty(1);
    setSelectedProductId('');
    setErrorMessage(null);
  };

  const totalAmount = items.reduce((acc, curr) => acc + curr.total_price, 0);
  const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleSave = () => {
    if (preSale.status !== 'pendente') {
      setErrorMessage('Esta pré-venda já foi finalizada ou cancelada e não pode mais ser editada.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('A pré-venda precisa ter pelo menos um item.');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);

    try {
      storage.savePreSale({
        id: preSale.id,
        code: preSale.code,
        customer_id: selectedCustomerId || undefined,
        customer_name: customer?.name || undefined,
        date: preSale.date,
        valid_until: validUntil || undefined,
        items,
        total_amount: Number(totalAmount.toFixed(2)),
        notes: notes.trim() || undefined,
        status: 'pendente',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar pré-venda.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Editar Pré-Venda {preSale.code}</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase">
                  Pendente
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Altere quantidades, adicione ou remova itens do orçamento.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Customer & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Validade do Orçamento</span>
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs uppercase text-slate-500 tracking-wider">
                Itens do Orçamento ({items.length})
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Package className="w-8 h-8 mx-auto opacity-40 mb-1" />
                <p className="text-xs font-bold">Nenhum item adicionado.</p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-2 grid grid-cols-12 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <div className="col-span-5">Produto</div>
                  <div className="col-span-3 text-center">Quantidade / Un.</div>
                  <div className="col-span-2 text-right">Preço Un.</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-slate-900 grid grid-cols-12 items-center gap-2 text-xs"
                  >
                    <div className="col-span-5 font-extrabold text-slate-800 dark:text-slate-200 truncate">
                      {item.product_name}
                    </div>

                    <div className="col-span-3 flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(index, Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-black text-center text-xs text-slate-900 dark:text-white"
                      />
                      <span className="font-bold text-slate-500 text-[11px]">{item.unit}</span>
                    </div>

                    <div className="col-span-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleUnitPriceChange(index, Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="w-16 px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-right text-xs text-slate-900 dark:text-white inline-block"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                        R$ {item.total_price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Product Form */}
          <form
            onSubmit={handleAddItem}
            className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2"
          >
            <span className="font-extrabold text-[11px] uppercase text-indigo-900 dark:text-indigo-300 block">
              + Adicionar Novo Produto ao Orçamento
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  Produto
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold"
                >
                  <option value="">-- Selecione o Produto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {(p.sale_price || p.unit_price || 0).toFixed(2)} / {p.main_unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                  Quantidade
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={addQty}
                    onChange={(e) => setAddQty(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                  />
                  {selectedProductToAdd && (
                    <select
                      value={addUnit}
                      onChange={(e) => setAddUnit(e.target.value)}
                      className="px-1.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-[11px] font-bold"
                    >
                      {getAvailableUnitsForProduct(selectedProductToAdd).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={!selectedProductToAdd}
                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </form>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações do Orçamento
            </label>
            <input
              type="text"
              placeholder="Ex: Entrega prevista para sexta-feira, pagamento via PIX..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs"
            />
          </div>
        </div>

        {/* Footer & Totals */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-extrabold">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Qtd Total Itens</span>
              <span className="text-slate-800 dark:text-slate-200 text-sm">
                {totalItemsCount.toFixed(2)} un/kg
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Total da Pré-Venda</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">
                R$ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
