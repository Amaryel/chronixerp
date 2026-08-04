/**
 * Aquinos Frios - Atualização de Preços em Lote (Spreadsheet-like Price Editor)
 */

import React, { useState, useMemo } from 'react';
import {
  Percent,
  Search,
  Save,
  CheckCircle2,
  DollarSign,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { Product } from '../types';
import { storage } from '../services/storage';

interface BulkPriceUpdateProps {
  products: Product[];
  onRefresh: () => void;
}

interface RowPriceState {
  productId: string;
  name: string;
  mainUnit: string;
  categoryName: string;
  categoryId: string;
  currentStock: number;
  minStock: number;
  costPrice: number | string;
  markup: number | string;
  salePrice: number | string;
  isModified: boolean;
}

export const BulkPriceUpdate: React.FC<BulkPriceUpdateProps> = ({ products, onRefresh }) => {
  const categories = storage.getCategories();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Mass percentage adjustment tools
  const [massField, setMassField] = useState<'sale_price' | 'cost_price' | 'markup'>('sale_price');
  const [massPercentage, setMassPercentage] = useState<string>('10');

  // Toast / Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize editable table state
  const [tableRows, setTableRows] = useState<RowPriceState[]>(() =>
    products.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id);
      const cost = p.cost_price || 0;
      const sale = p.sale_price || p.unit_price || 0;
      const mk = p.markup !== undefined && p.markup !== null ? p.markup : (cost > 0 ? ((sale - cost) / cost) * 100 : 0);

      return {
        productId: p.id,
        name: p.name,
        mainUnit: p.main_unit || 'UN',
        categoryName: cat?.name || 'Geral',
        categoryId: p.category_id || '',
        currentStock: p.current_stock || 0,
        minStock: p.min_stock || 0,
        costPrice: cost,
        markup: Math.round(mk * 100) / 100,
        salePrice: sale,
        isModified: false,
      };
    })
  );

  // Sync rows if products array changes from outside and no pending edits
  React.useEffect(() => {
    const hasModified = tableRows.some((r) => r.isModified);
    if (!hasModified) {
      setTableRows(
        products.map((p) => {
          const cat = categories.find((c) => c.id === p.category_id);
          const cost = p.cost_price || 0;
          const sale = p.sale_price || p.unit_price || 0;
          const mk = p.markup !== undefined && p.markup !== null ? p.markup : (cost > 0 ? ((sale - cost) / cost) * 100 : 0);

          return {
            productId: p.id,
            name: p.name,
            mainUnit: p.main_unit || 'UN',
            categoryName: cat?.name || 'Geral',
            categoryId: p.category_id || '',
            currentStock: p.current_stock || 0,
            minStock: p.min_stock || 0,
            costPrice: cost,
            markup: Math.round(mk * 100) / 100,
            salePrice: sale,
            isModified: false,
          };
        })
      );
    }
  }, [products]);

  // Handle cell edit: Cost Price changed
  const handleCostChange = (productId: string, valStr: string) => {
    const newCost = valStr === '' ? 0 : parseFloat(valStr);
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const validCost = isNaN(newCost) ? 0 : Math.max(0, newCost);
        const mkNum = typeof row.markup === 'number' ? row.markup : parseFloat(row.markup as string) || 0;
        const calculatedSale = validCost > 0 ? validCost * (1 + mkNum / 100) : (typeof row.salePrice === 'number' ? row.salePrice : 0);

        return {
          ...row,
          costPrice: valStr === '' ? '' : validCost,
          salePrice: Math.round(calculatedSale * 100) / 100,
          isModified: true,
        };
      })
    );
  };

  // Handle cell edit: Markup (%) changed
  const handleMarkupChange = (productId: string, valStr: string) => {
    const newMarkup = valStr === '' ? 0 : parseFloat(valStr);
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const validMarkup = isNaN(newMarkup) ? 0 : newMarkup;
        const costNum = typeof row.costPrice === 'number' ? row.costPrice : parseFloat(row.costPrice as string) || 0;
        const calculatedSale = costNum > 0 ? costNum * (1 + validMarkup / 100) : (typeof row.salePrice === 'number' ? row.salePrice : 0);

        return {
          ...row,
          markup: valStr === '' ? '' : validMarkup,
          salePrice: Math.round(calculatedSale * 100) / 100,
          isModified: true,
        };
      })
    );
  };

  // Handle cell edit: Sale Price changed
  const handleSalePriceChange = (productId: string, valStr: string) => {
    const newSale = valStr === '' ? 0 : parseFloat(valStr);
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const validSale = isNaN(newSale) ? 0 : Math.max(0, newSale);
        const costNum = typeof row.costPrice === 'number' ? row.costPrice : parseFloat(row.costPrice as string) || 0;
        const calculatedMarkup = costNum > 0 ? ((validSale - costNum) / costNum) * 100 : (typeof row.markup === 'number' ? row.markup : 0);

        return {
          ...row,
          salePrice: valStr === '' ? '' : validSale,
          markup: Math.round(calculatedMarkup * 100) / 100,
          isModified: true,
        };
      })
    );
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'all' || r.categoryId === selectedCategory;
      const matchesUnit = selectedUnit === 'all' || r.mainUnit.toUpperCase() === selectedUnit.toUpperCase();

      const saleNum = typeof r.salePrice === 'number' ? r.salePrice : parseFloat(r.salePrice as string) || 0;
      const minP = minPrice !== '' ? parseFloat(minPrice) : null;
      const maxP = maxPrice !== '' ? parseFloat(maxPrice) : null;

      let matchesMinPrice = true;
      if (minP !== null && !isNaN(minP)) matchesMinPrice = saleNum >= minP;

      let matchesMaxPrice = true;
      if (maxP !== null && !isNaN(maxP)) matchesMaxPrice = saleNum <= maxP;

      let matchesStock = true;
      if (stockStatus === 'in_stock') matchesStock = r.currentStock > r.minStock;
      if (stockStatus === 'low_stock') matchesStock = r.currentStock > 0 && r.currentStock <= r.minStock;
      if (stockStatus === 'out_of_stock') matchesStock = r.currentStock <= 0;

      return matchesSearch && matchesCat && matchesUnit && matchesMinPrice && matchesMaxPrice && matchesStock;
    });
  }, [tableRows, searchTerm, selectedCategory, selectedUnit, minPrice, maxPrice, stockStatus]);

  // Handle select all filtered
  const handleSelectAllFiltered = () => {
    if (filteredRows.length === 0) return;
    const allFilteredSelected = filteredRows.every((r) => selectedProductIds.includes(r.productId));

    if (allFilteredSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !filteredRows.some((fr) => fr.productId === id)));
    } else {
      const filteredIds = filteredRows.map((r) => r.productId);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectRow = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Apply Mass Percentage Adjustment to Selected Products
  const handleApplyMassPercentage = (factor: number) => {
    if (selectedProductIds.length === 0) {
      alert('Por favor, selecione os produtos na tabela para aplicar o reajuste em massa.');
      return;
    }

    const pct = parseFloat(massPercentage);
    if (isNaN(pct) || pct === 0) {
      alert('Informe uma porcentagem válida.');
      return;
    }

    const multiplier = 1 + (pct / 100) * factor;

    setTableRows((prev) =>
      prev.map((row) => {
        if (!selectedProductIds.includes(row.productId)) return row;

        let costNum = typeof row.costPrice === 'number' ? row.costPrice : parseFloat(row.costPrice as string) || 0;
        let saleNum = typeof row.salePrice === 'number' ? row.salePrice : parseFloat(row.salePrice as string) || 0;
        let mkNum = typeof row.markup === 'number' ? row.markup : parseFloat(row.markup as string) || 0;

        if (massField === 'sale_price') {
          saleNum = Math.round(saleNum * multiplier * 100) / 100;
          mkNum = costNum > 0 ? Math.round((((saleNum - costNum) / costNum) * 100) * 100) / 100 : mkNum;
        } else if (massField === 'cost_price') {
          costNum = Math.round(costNum * multiplier * 100) / 100;
          saleNum = costNum > 0 ? Math.round(costNum * (1 + mkNum / 100) * 100) / 100 : saleNum;
        } else if (massField === 'markup') {
          mkNum = Math.round(mkNum * multiplier * 100) / 100;
          saleNum = costNum > 0 ? Math.round(costNum * (1 + mkNum / 100) * 100) / 100 : saleNum;
        }

        return {
          ...row,
          costPrice: costNum,
          salePrice: saleNum,
          markup: mkNum,
          isModified: true,
        };
      })
    );
  };

  // Save all modified rows to storage
  const handleSaveAll = () => {
    const modifiedRows = tableRows.filter((r) => r.isModified);
    if (modifiedRows.length === 0) {
      alert('Nenhuma alteração de preço pendente.');
      return;
    }

    try {
      const updates = modifiedRows.map((r) => ({
        id: r.productId,
        cost_price: typeof r.costPrice === 'number' ? r.costPrice : parseFloat(r.costPrice as string) || 0,
        markup: typeof r.markup === 'number' ? r.markup : parseFloat(r.markup as string) || 0,
        sale_price: typeof r.salePrice === 'number' ? r.salePrice : parseFloat(r.salePrice as string) || 0,
        unit_price: typeof r.salePrice === 'number' ? r.salePrice : parseFloat(r.salePrice as string) || 0,
      }));

      storage.bulkUpdatePricesBatch(updates);
      onRefresh();

      setSuccessMsg(`✓ ${modifiedRows.length} preços atualizados com sucesso e sincronizados com o PDV!`);
      setTimeout(() => setSuccessMsg(null), 4000);

      setTableRows((prev) => prev.map((r) => ({ ...r, isModified: false })));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar reajuste em lote.');
    }
  };

  const modifiedCount = tableRows.filter((r) => r.isModified).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-emerald-500/40 text-emerald-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Gestão de Preços
          </span>
          <h1 className="text-2xl font-black tracking-tight">Atualização de Preços em Lote</h1>
          <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
            Edite preços de custo, margens (markup) e venda. Selecione produtos para reajustes % em massa.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={modifiedCount === 0}
          className={`px-5 py-3 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition active:scale-95 ${
            modifiedCount > 0
              ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 animate-pulse'
              : 'bg-emerald-800 text-emerald-300 opacity-60 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Salvar Alterações ({modifiedCount})</span>
        </button>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {/* MASS PERCENTAGE TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>Reajuste Percentual em Massa (Apenas nos {selectedProductIds.length} selecionados)</span>
          </div>

          <span className="text-xs text-slate-500 font-bold">
            {selectedProductIds.length} selecionado(s)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold shrink-0">Aplicar no:</span>
            <select
              value={massField}
              onChange={(e: any) => setMassField(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
            >
              <option value="sale_price">Preço de Venda</option>
              <option value="cost_price">Preço de Custo</option>
              <option value="markup">Markup (%)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={massPercentage}
              onChange={(e) => setMassPercentage(e.target.value)}
              className="w-20 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-xs text-slate-900 dark:text-white text-center"
              placeholder="10"
            />
            <span className="text-xs font-bold text-slate-500">%</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleApplyMassPercentage(1)}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition"
            >
              + Aumentar %
            </button>
            <button
              onClick={() => handleApplyMassPercentage(-1)}
              className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow transition"
            >
              - Reduzir %
            </button>
          </div>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-slate-200">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filtros de Busca ({filteredRows.length} resultados)</span>
          </span>
          {(searchTerm || selectedCategory !== 'all' || selectedUnit !== 'all' || minPrice || maxPrice || stockStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedUnit('all');
                setMinPrice('');
                setMaxPrice('');
                setStockStatus('all');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Name Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
          >
            <option value="all">Todas Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Unit */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
          >
            <option value="all">Todas Unidades</option>
            <option value="UN">Unidade (UN)</option>
            <option value="KG">Quilograma (KG)</option>
            <option value="CX">Caixa (CX)</option>
          </select>

          {/* Price Range */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Preço Mín"
              onFocus={(e) => e.target.select()}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="number"
              placeholder="Preço Máx"
              onFocus={(e) => e.target.select()}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
            />
          </div>

          {/* Stock Status */}
          <select
            value={stockStatus}
            onChange={(e: any) => setStockStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
          >
            <option value="all">Todo Estoque</option>
            <option value="in_stock">Em Estoque Normal</option>
            <option value="low_stock">Estoque Baixo</option>
            <option value="out_of_stock">Sem Estoque</option>
          </select>
        </div>
      </div>

      {/* SPREADSHEET TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllFiltered}
              className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              {filteredRows.length > 0 && filteredRows.every((r) => selectedProductIds.includes(r.productId))
                ? 'Desmarcar Todos do Filtro'
                : 'Selecionar Todos do Filtro'}
            </button>
            <span className="text-slate-500 font-medium">
              Exibindo {filteredRows.length} de {tableRows.length} produtos
            </span>
          </div>

          {modifiedCount > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full font-black text-[11px]">
              ⚠️ {modifiedCount} alteração(ões) pendente(s)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredRows.length > 0 &&
                      filteredRows.every((r) => selectedProductIds.includes(r.productId))
                    }
                    onChange={handleSelectAllFiltered}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Produto</th>
                <th className="p-3.5">Unid.</th>
                <th className="p-3.5">Preço Custo (R$)</th>
                <th className="p-3.5">Markup (%)</th>
                <th className="p-3.5">Preço Venda (R$)</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRows.map((row) => {
                const isSelected = selectedProductIds.includes(row.productId);

                return (
                  <tr
                    key={row.productId}
                    className={`transition ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                        : row.isModified
                        ? 'bg-amber-50/50 dark:bg-amber-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="p-3.5 pl-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.productId)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-900 dark:text-white">{row.name}</p>
                      <p className="text-[10px] text-slate-400">{row.categoryName}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black rounded text-[10px]">
                        {row.mainUnit}
                      </span>
                    </td>

                    {/* Cost Price Cell */}
                    <td className="p-3.5">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={row.costPrice}
                        onChange={(e) => handleCostChange(row.productId, e.target.value)}
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Markup Cell */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          onFocus={(e) => e.target.select()}
                          value={row.markup}
                          onChange={(e) => handleMarkupChange(row.productId, e.target.value)}
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-slate-400 font-bold">%</span>
                      </div>
                    </td>

                    {/* Sale Price Cell */}
                    <td className="p-3.5">
                      <input
                        type="number"
                        step="0.01"
                        onFocus={(e) => e.target.select()}
                        value={row.salePrice}
                        onChange={(e) => handleSalePriceChange(row.productId, e.target.value)}
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Status Indicator */}
                    <td className="p-3.5 text-center">
                      {row.isModified ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black rounded-lg">
                          Alterado
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Salvo</span>
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
