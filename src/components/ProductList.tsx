/**
 * Aquinos Frios - Product Catalog & Unit Conversions Component
 * Fast product entry (<30s), unit conversion setup, stock view, and filter panel with pagination.
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  X,
  Layers,
  Sparkles,
  Barcode,
  Settings,
  Check,
  List,
  LayoutGrid,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Product, Category, User, UnitConversion, ConversionPreset } from '../types';
import { formatStockDisplay, STANDARD_UNITS } from '../lib/unitConverter';
import { OperationalPreferences } from './OperationalPreferences';
import { storage } from '../services/storage';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  onOpenEntryModal: (prod: Product) => void;
  onOpenExitModal: (prod: Product) => void;
  onRefresh: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  categories,
  currentUser,
  onOpenEntryModal,
  onOpenExitModal,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Active Applied Filters
  const [appliedFilters, setAppliedFilters] = useState<{
    name: string;
    category: string;
    unit: string;
    stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
    sortBy: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';
  }>({
    name: '',
    category: 'all',
    unit: 'all',
    stockStatus: 'all',
    sortBy: 'name-asc',
  });

  // Filter Drawer/Modal state & Pending Filters
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState(appliedFilters);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Batch Selection & Operations State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkMainUnit, setBulkMainUnit] = useState('');
  const [bulkMinStock, setBulkMinStock] = useState<string>('');
  const [bulkConversionMode, setBulkConversionMode] = useState<'none' | 'preset' | 'custom'>('none');
  const [bulkConversionPreset, setBulkConversionPreset] = useState<string>('none');
  const [bulkCustomFrom, setBulkCustomFrom] = useState('caixa');
  const [bulkCustomTo, setBulkCustomTo] = useState('kg');
  const [bulkCustomFactor, setBulkCustomFactor] = useState<number>(20);
  const [bulkReplaceConversions, setBulkReplaceConversions] = useState(false);
  const [bulkSaveAsGlobal, setBulkSaveAsGlobal] = useState(false);
  const [bulkGlobalRuleName, setBulkGlobalRuleName] = useState('');

  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Conversion Rules Preset Modal State
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetFrom, setPresetFrom] = useState('caixa');
  const [presetTo, setPresetTo] = useState('kg');
  const [presetFactor, setPresetFactor] = useState<number>(20);
  const [presetDesc, setPresetDesc] = useState('');

  // Form Fields for Product
  const [name, setName] = useState('');
  const [mainUnit, setMainUnit] = useState<string>('UN');
  const [boxConvUnit, setBoxConvUnit] = useState<string>('KG');
  const [boxConvValue, setBoxConvValue] = useState<string>('');
  const [allowFractional, setAllowFractional] = useState<boolean>(false);
  const [unitPrice, setUnitPrice] = useState<string>('0');
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');

  // Unit Conversions Manager state inside product modal
  const [conversions, setConversions] = useState<Array<Omit<UnitConversion, 'id' | 'product_id'>>>([]);
  const [convFrom, setConvFrom] = useState('caixa');
  const [convTo, setConvTo] = useState('kg');
  const [convFactor, setConvFactor] = useState<number>(20);
  const [saveAsGlobalPreset, setSaveAsGlobalPreset] = useState(false);

  // Get presets from storage
  const conversionPresets = storage.getConversionPresets();

  // Open modal for creating or editing product
  const handleOpenModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setMainUnit(prod.main_unit || 'UN');
      setBoxConvUnit(prod.box_conversion_unit || 'KG');
      setBoxConvValue(prod.box_conversion_value ? prod.box_conversion_value.toString() : '');
      setAllowFractional(prod.allow_fractional ?? false);
      setUnitPrice((prod.sale_price ?? prod.unit_price ?? 0).toString());
      setMinStock(prod.min_stock);
      setInitialStock(prod.current_stock);
      setBarcode(prod.barcode || '');
      setCategoryId(prod.category_id || '');
      setBrand(prod.brand || '');
      setNotes(prod.notes || '');
      setConversions(prod.conversions || []);
    } else {
      setEditingProduct(null);
      setName('');
      setMainUnit('UN');
      setBoxConvUnit('KG');
      setBoxConvValue('');
      setAllowFractional(storage.getSettings().default_allow_fractional || false);
      setUnitPrice('0');
      setMinStock(10);
      setInitialStock(0);
      setBarcode('');
      setCategoryId(categories[0]?.id || '');
      setBrand('');
      setNotes('');
      setConversions([]);
    }
    setIsModalOpen(true);
  };

  const handleApplyPresetToProduct = (preset: ConversionPreset) => {
    const exists = conversions.some(
      (c) => c.from_unit.toLowerCase() === preset.from_unit.toLowerCase() && c.to_unit.toLowerCase() === preset.to_unit.toLowerCase()
    );
    if (!exists) {
      setConversions([
        ...conversions,
        {
          from_unit: preset.from_unit.toLowerCase().trim(),
          to_unit: preset.to_unit.toLowerCase().trim(),
          factor: preset.factor,
        },
      ]);
    }
  };

  const handleAddConversionToForm = () => {
    if (!convFrom || !convTo || !convFactor || convFactor <= 0) return;
    const newConv = {
      from_unit: convFrom.toLowerCase().trim(),
      to_unit: convTo.toLowerCase().trim(),
      factor: Number(convFactor),
    };

    setConversions([...conversions, newConv]);

    if (saveAsGlobalPreset) {
      storage.saveConversionPreset({
        name: `${convFrom.toUpperCase()} ${convFactor}${convTo}`,
        from_unit: convFrom.toLowerCase().trim(),
        to_unit: convTo.toLowerCase().trim(),
        factor: Number(convFactor),
        description: `1 ${convFrom} = ${convFactor} ${convTo}`,
      });
      setSaveAsGlobalPreset(false);
    }
  };

  const handleRemoveConversionFromForm = (index: number) => {
    setConversions(conversions.filter((_, i) => i !== index));
  };

  const handleSaveGlobalPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim() || !presetFrom || !presetTo || !presetFactor || presetFactor <= 0) {
      alert('Por favor, preencha todos os campos da regra de conversão.');
      return;
    }
    storage.saveConversionPreset({
      name: presetName.trim(),
      from_unit: presetFrom.toLowerCase().trim(),
      to_unit: presetTo.toLowerCase().trim(),
      factor: Number(presetFactor),
      description: presetDesc.trim() || `1 ${presetFrom} = ${presetFactor} ${presetTo}`,
    });
    setPresetName('');
    setPresetDesc('');
    onRefresh();
  };

  const handleDeleteGlobalPreset = (id: string) => {
    storage.deleteConversionPreset(id);
    onRefresh();
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (paginatedProducts.length === 0) return;
    const allSelected = paginatedProducts.every((p) => selectedProductIds.includes(p.id));
    if (allSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(paginatedProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do produto.');
      return;
    }

    const priceVal = parseFloat(unitPrice) || 0;

    try {
      storage.saveProduct({
        id: editingProduct?.id,
        name: name.trim(),
        main_unit: mainUnit,
        unit_price: priceVal,
        sale_price: priceVal,
        box_conversion_unit: boxConvValue ? boxConvUnit : undefined,
        box_conversion_value: boxConvValue ? parseFloat(boxConvValue) : undefined,
        allow_fractional: allowFractional,
        min_stock: Number(minStock) || 0,
        current_stock: editingProduct ? editingProduct.current_stock : Number(initialStock) || 0,
        barcode: barcode.trim() || undefined,
        category_id: categoryId || undefined,
        brand: brand.trim() || undefined,
        notes: notes.trim() || undefined,
        conversions: conversions as any,
      });

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto.');
    }
  };

  const handleDeleteProduct = (prod: Product) => {
    if (currentUser.role !== 'admin') {
      alert('⚠️ Apenas Administradores têm permissão para excluir produtos.');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o produto "${prod.name}"?`)) {
      try {
        storage.deleteProduct(prod.id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Performance-optimized Filter & Sort with useMemo
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Name / Barcode / Brand
        const matchesName =
          !appliedFilters.name ||
          p.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
          (p.barcode && p.barcode.includes(appliedFilters.name)) ||
          (p.brand && p.brand.toLowerCase().includes(appliedFilters.name.toLowerCase()));

        // Category
        const matchesCategory =
          appliedFilters.category === 'all' || p.category_id === appliedFilters.category;

        // Unit
        const matchesUnit =
          appliedFilters.unit === 'all' ||
          (p.main_unit && p.main_unit.toUpperCase() === appliedFilters.unit.toUpperCase());

        // Stock Status
        let matchesStock = true;
        if (appliedFilters.stockStatus === 'in_stock') matchesStock = p.current_stock > p.min_stock;
        if (appliedFilters.stockStatus === 'low_stock')
          matchesStock = p.current_stock > 0 && p.current_stock <= p.min_stock;
        if (appliedFilters.stockStatus === 'out_of_stock') matchesStock = p.current_stock <= 0;

        return matchesName && matchesCategory && matchesUnit && matchesStock;
      })
      .sort((a, b) => {
        const priceA = a.sale_price ?? a.unit_price ?? 0;
        const priceB = b.sale_price ?? b.unit_price ?? 0;

        if (appliedFilters.sortBy === 'name-asc') return a.name.localeCompare(b.name, 'pt-BR');
        if (appliedFilters.sortBy === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
        if (appliedFilters.sortBy === 'price-asc') return priceA - priceB;
        if (appliedFilters.sortBy === 'price-desc') return priceB - priceA;
        if (appliedFilters.sortBy === 'stock-asc') return a.current_stock - b.current_stock;
        if (appliedFilters.sortBy === 'stock-desc') return b.current_stock - a.current_stock;
        return 0;
      });
  }, [products, appliedFilters]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Open Filter Modal
  const handleOpenFilterModal = () => {
    setPendingFilters(appliedFilters);
    setIsFilterModalOpen(true);
  };

  // Apply Pending Filters
  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  // Clear Filters
  const handleClearFilters = () => {
    const defaultF = {
      name: '',
      category: 'all',
      unit: 'all',
      stockStatus: 'all' as const,
      sortBy: 'name-asc' as const,
    };
    setPendingFilters(defaultF);
    setAppliedFilters(defaultF);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const hasActiveFilters =
    appliedFilters.name !== '' ||
    appliedFilters.category !== 'all' ||
    appliedFilters.unit !== 'all' ||
    appliedFilters.stockStatus !== 'all' ||
    appliedFilters.sortBy !== 'name-asc';

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Cadastro de Produtos & Regras de Conversão</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre produtos e defina regras de conversão (ex: cx 20kg) reutilizáveis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPresetsModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Settings className="w-4 h-4 text-indigo-500" />
            <span>Regras Globais ({conversionPresets.length})</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, marca ou código..."
              value={appliedFilters.name}
              onChange={(e) => {
                setAppliedFilters((prev) => ({ ...prev, name: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>

          {/* Filter Modal Toggle Button */}
          <button
            onClick={handleOpenFilterModal}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
              hasActiveFilters
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            Exibindo <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> produtos
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Lista</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCT LIST / CARDS */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">Nenhum produto encontrado</h3>
          <p className="text-xs text-slate-400 mt-1">Tente ajustar seus filtros de pesquisa.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Mobile Product Card List (Visible on mobile screens) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    paginatedProducts.length > 0 &&
                    paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Selecionar Todos ({paginatedProducts.length})</span>
              </label>
            </div>
            {paginatedProducts.map((p) => {
              const isLow = p.current_stock > 0 && p.current_stock <= p.min_stock;
              const isOut = p.current_stock <= 0;
              const isSelected = selectedProductIds.includes(p.id);
              const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'Geral';
              const salePrice = p.sale_price ?? p.unit_price ?? 0;

              return (
                <div
                  key={`mob-${p.id}`}
                  className={`p-4 transition space-y-3 ${
                    isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {categoryName}
                          </span>
                          {p.barcode && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                              <Barcode className="w-3 h-3" />
                              <span>{p.barcode}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isOut ? (
                      <span className="shrink-0 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Sem Estoque</span>
                      </span>
                    ) : isLow ? (
                      <span className="shrink-0 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Baixo</span>
                      </span>
                    ) : (
                      <span className="shrink-0 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Normal
                      </span>
                    )}
                  </div>

                  {/* Stock & Price info cards */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Preço Venda</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        R$ {salePrice.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">/ {p.main_unit}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Estoque</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400 block mt-0.5">
                        {formatStockDisplay(p, p.current_stock)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons full-width touch friendly */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => onOpenEntryModal(p)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition"
                      title="Registrar Entrada"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Entrada</span>
                    </button>

                    <button
                      onClick={() => onOpenExitModal(p)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition"
                      title="Registrar Saída"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Saída</span>
                    </button>

                    <button
                      onClick={() => handleOpenModal(p)}
                      className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition"
                      title="Editar Produto"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-center transition"
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((p) => selectedProductIds.includes(p.id))
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Produto & Categoria</th>
                  <th className="p-3.5">Preço Venda</th>
                  <th className="p-3.5">Saldo em Estoque</th>
                  <th className="p-3.5">Estoque Mín.</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right pr-4">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {paginatedProducts.map((p) => {
                  const isLow = p.current_stock > 0 && p.current_stock <= p.min_stock;
                  const isOut = p.current_stock <= 0;
                  const isSelected = selectedProductIds.includes(p.id);
                  const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'Geral';
                  const salePrice = p.sale_price ?? p.unit_price ?? 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <td className="p-3.5 pl-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {categoryName}
                          </span>
                          {p.barcode && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                              <Barcode className="w-3 h-3" />
                              <span>{p.barcode}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        R$ {salePrice.toFixed(2)} / {p.main_unit}
                      </td>

                      <td className="p-3.5">
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400 block">
                          {formatStockDisplay(p, p.current_stock)}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-bold">
                        {p.min_stock} {p.main_unit}
                      </td>

                      <td className="p-3.5 text-center">
                        {isOut ? (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Sem Estoque</span>
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Baixo</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenEntryModal(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="Registrar Entrada"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Entrada</span>
                          </button>

                          <button
                            onClick={() => onOpenExitModal(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="Registrar Saída"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Saída</span>
                          </button>

                          <button
                            onClick={() => handleOpenModal(p)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                            title="Editar Produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProducts.map((p) => {
            const isLow = p.current_stock > 0 && p.current_stock <= p.min_stock;
            const isOut = p.current_stock <= 0;
            const isSelected = selectedProductIds.includes(p.id);
            const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'Geral';
            const salePrice = p.sale_price ?? p.unit_price ?? 0;

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between relative ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                        {categoryName}
                      </span>
                    </div>

                    {isOut ? (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Sem Estoque</span>
                      </span>
                    ) : isLow ? (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Estoque Baixo</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Normal
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                    {p.name}
                  </h3>

                  <div className="mt-1 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    R$ {salePrice.toFixed(2)} / {p.main_unit}
                  </div>

                  <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Saldo em Estoque ({p.main_unit})
                    </span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400 block mt-0.5">
                      {formatStockDisplay(p, p.current_stock)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => onOpenEntryModal(p)}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>+ Entrada</span>
                  </button>

                  <button
                    onClick={() => onOpenExitModal(p)}
                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>- Saída</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-50"
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FILTER DRAWER / MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Filtros da Listagem de Produtos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Filter Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Nome / Marca / Código
                </label>
                <input
                  type="text"
                  placeholder="Ex: Queijo Mussarela..."
                  value={pendingFilters.name}
                  onChange={(e) =>
                    setPendingFilters((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Filter Category */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Categoria
                </label>
                <select
                  value={pendingFilters.category}
                  onChange={(e) =>
                    setPendingFilters((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Unit */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Unidade Principal
                </label>
                <select
                  value={pendingFilters.unit}
                  onChange={(e) =>
                    setPendingFilters((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">Todas as Unidades</option>
                  <option value="UN">Unidade (UN)</option>
                  <option value="KG">Quilograma (KG)</option>
                  <option value="CX">Caixa (CX)</option>
                  <option value="PC">Peça (PC)</option>
                </select>
              </div>

              {/* Filter Stock Status */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Estado do Estoque
                </label>
                <select
                  value={pendingFilters.stockStatus}
                  onChange={(e: any) =>
                    setPendingFilters((prev) => ({ ...prev, stockStatus: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="all">Todos os Estados de Estoque</option>
                  <option value="in_stock">Em Estoque Normal</option>
                  <option value="low_stock">Estoque Baixo</option>
                  <option value="out_of_stock">Sem Estoque</option>
                </select>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Ordenação
                </label>
                <select
                  value={pendingFilters.sortBy}
                  onChange={(e: any) =>
                    setPendingFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="name-asc">Ordem Alfabética (A → Z)</option>
                  <option value="name-desc">Ordem Alfabética (Z → A)</option>
                  <option value="price-asc">Menor Preço de Venda</option>
                  <option value="price-desc">Maior Preço de Venda</option>
                  <option value="stock-asc">Menor Estoque</option>
                  <option value="stock-desc">Maior Estoque</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Limpar Filtros
                </button>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Nome do Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Queijo Mussarela Laticínio Aquino..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    Unidade Principal / Cadastro
                  </label>
                  <select
                    value={mainUnit}
                    onChange={(e) => setMainUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold uppercase"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="KG">KG (Quilograma)</option>
                    <option value="CX">CX (Caixa)</option>
                    <option value="PC">PC (Peça)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    onFocus={(e) => e.target.select()}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm"
                  />
                </div>
              </div>

              {/* Conversão de Caixa / Fracionamento */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                      Equivalência de Caixa (Fator)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">1 CX =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 20"
                        value={boxConvValue}
                        onChange={(e) => setBoxConvValue(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-extrabold text-xs"
                      />
                      <select
                        value={boxConvUnit}
                        onChange={(e) => setBoxConvUnit(e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs"
                      >
                        <option value="KG">KG</option>
                        <option value="UN">UN</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                      Permitir Venda Fracionada?
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAllowFractional(false)}
                        className={`flex-1 py-2 px-2 rounded-lg font-extrabold text-xs border transition ${
                          !allowFractional
                            ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        NÃO
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllowFractional(true)}
                        className={`flex-1 py-2 px-2 rounded-lg font-extrabold text-xs border transition ${
                          allowFractional
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        SIM
                      </button>
                    </div>
                  </div>
                </div>

                {boxConvValue && parseFloat(boxConvValue) > 0 && parseFloat(unitPrice) > 0 && (
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 p-2 rounded-lg flex items-center justify-between border border-blue-200 dark:border-blue-800">
                    <span>Preço Equivalente Calculado:</span>
                    <span className="font-black text-xs">
                      {mainUnit === 'CX'
                        ? `R$ ${(parseFloat(unitPrice) / parseFloat(boxConvValue)).toFixed(2)} / ${boxConvUnit}`
                        : `R$ ${(parseFloat(unitPrice) * parseFloat(boxConvValue)).toFixed(2)} / CX`}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    Estoque Mínimo Exigido
                  </label>
                  <input
                    type="number"
                    min="0"
                    onFocus={(e) => e.target.select()}
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                    Estoque Inicial de Entrada
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    onFocus={(e) => e.target.select()}
                    value={initialStock}
                    onChange={(e) => setInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGRAS GLOBAIS & PRESETS MODAL */}
      {isPresetsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Regras Globais do Sistema & Conversões
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure preferências operacionais gerais, regras de estoque negativo, juros de fiado e tabela de conversão global.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Render Operational Preferences */}
            <OperationalPreferences onRefresh={onRefresh} />

            {/* Presets Table Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Regras de Conversão Globais Cadastradas ({conversionPresets.length})</span>
              </h4>

              <form onSubmit={handleSaveGlobalPreset} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Nome</label>
                  <input
                    type="text"
                    placeholder="Ex: Caixa 20kg"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1">De (Unidade)</label>
                  <input
                    type="text"
                    placeholder="caixa"
                    value={presetFrom}
                    onChange={(e) => setPresetFrom(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Para (Unidade)</label>
                  <input
                    type="text"
                    placeholder="kg"
                    value={presetTo}
                    onChange={(e) => setPresetTo(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Fator (Ex: 20)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={presetFactor}
                    onChange={(e) => setPresetFactor(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-xs shadow-md transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {conversionPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                        {preset.name}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                        1 {preset.from_unit} = {preset.factor} {preset.to_unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGlobalPreset(preset.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                      title="Excluir preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl font-extrabold text-xs shadow-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
