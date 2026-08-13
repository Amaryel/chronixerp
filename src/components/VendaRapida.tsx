/**
 * Aquinos Frios - Venda Rápida (PDV Simplificado)
 * Registra saídas rápidas de balcão e vendas fiadas com deduções automáticas de estoque.
 */

import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  Banknote,
  QrCode,
  CreditCard,
  BookOpenCheck,
  Package,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  FileText,
  Truck,
  Building2,
} from 'lucide-react';
import { Product, Customer, PaymentMethod, PaymentDetail, FiadoSaleItem, FiadoSale, PreSale } from '../types';
import { storage } from '../services/storage';
import { convertToMainUnit, formatStockDisplay } from '../lib/unitConverter';
import { ReceiptModal } from './ReceiptModal';

interface VendaRapidaProps {
  products: Product[];
  onRefresh: () => void;
  onOpenCustomersTab?: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
  unit: string;
  unitPrice: number;
  discountType?: 'percent' | 'value';
  discountValue?: number;
  surchargeType?: 'percent' | 'value';
  surchargeValue?: number;
  totalPrice: number;
}

export const VendaRapida: React.FC<VendaRapidaProps> = ({ products, onRefresh, onOpenCustomersTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Selected product for quantity modal
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>('1');
  const [inputUnitPrice, setInputUnitPrice] = useState<string>('0');
  const [itemDiscountType, setItemDiscountType] = useState<'percent' | 'value'>('percent');
  const [itemDiscountValue, setItemDiscountValue] = useState<string>('0');
  const [itemSurchargeType, setItemSurchargeType] = useState<'percent' | 'value'>('percent');
  const [itemSurchargeValue, setItemSurchargeValue] = useState<string>('0');

  // Sale-level Discount and Surcharge
  const [saleDiscountType, setSaleDiscountType] = useState<'percent' | 'value'>('percent');
  const [saleDiscountValue, setSaleDiscountValue] = useState<string>('0');
  const [saleSurchargeType, setSaleSurchargeType] = useState<'percent' | 'value'>('percent');
  const [saleSurchargeValue, setSaleSurchargeValue] = useState<string>('0');

  // Fiado Interest Toggle
  const [applyFiadoInterest, setApplyFiadoInterest] = useState<boolean>(true);

  // Stock Origin: Empresa vs Carga do Vendedor
  const [stockOrigin, setStockOrigin] = useState<'empresa' | 'carga'>('empresa');
  const [selectedSellerLoadId, setSelectedSellerLoadId] = useState<string>('');
  const activeSellerLoads = storage.getActiveSellerLoads();

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([
    { method: 'dinheiro', amount: 0 },
    { method: 'pix', amount: 0 },
  ]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Quick Customer modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Pre-Sale Integration State
  const [isPreSaleModalOpen, setIsPreSaleModalOpen] = useState(false);
  const [preSaleSearch, setPreSaleSearch] = useState('');
  const [loadedPreSaleId, setLoadedPreSaleId] = useState<string | null>(null);

  // Insufficient Stock Alert Modal
  const [stockAlertModal, setStockAlertModal] = useState<{
    isOpen: boolean;
    title?: string;
    items: { name: string; requested: number; available: number; unit: string }[];
  } | null>(null);

  // Status & Receipt state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [receiptState, setReceiptState] = useState<{
    isOpen: boolean;
    type: 'venda_normal' | 'venda_fiado';
    sale: FiadoSale | null;
  }>({
    isOpen: false,
    type: 'venda_normal',
    sale: null,
  });

  const customers = storage.getCustomers();
  const categories = storage.getCategories();

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelectProduct = (product: Product) => {
    setActiveProduct(product);
    setInputQty('1');
    setInputUnitPrice(product.unit_price ? product.unit_price.toString() : '0');
    setItemDiscountType('percent');
    setItemDiscountValue('0');
    setItemSurchargeType('percent');
    setItemSurchargeValue('0');
  };

  const handleAddToCart = () => {
    if (!activeProduct) return;
    const qtyNum = parseFloat(inputQty);
    const priceNum = parseFloat(inputUnitPrice) || 0;

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    // STRICT UNIT RULE:
    // If product.main_unit === 'UN', only integers allowed!
    if (activeProduct.main_unit === 'UN' && !Number.isInteger(qtyNum)) {
      alert('Atenção: Este produto está cadastrado em Unidade (UN). Digite apenas quantidades inteiras (1, 2, 3...).');
      return;
    }

    // Check stock availability if negative stock not allowed
    const settings = storage.getSettings();
    if (!settings.allow_negative_stock) {
      try {
        const conv = convertToMainUnit(activeProduct, qtyNum, activeProduct.main_unit);
        if (activeProduct.current_stock < conv.mainQty) {
          alert(
            `Atenção: Estoque insuficiente. Disponível: ${formatStockDisplay(
              activeProduct,
              activeProduct.current_stock
            )}`
          );
          return;
        }
      } catch (err: any) {
        alert(err.message || 'Erro na conversão.');
        return;
      }
    }

    const baseTotal = qtyNum * priceNum;
    const discVal = parseFloat(itemDiscountValue) || 0;
    const surVal = parseFloat(itemSurchargeValue) || 0;

    let itemDisc = 0;
    if (discVal > 0) {
      itemDisc = itemDiscountType === 'percent' ? baseTotal * (discVal / 100) : discVal;
    }
    let itemSur = 0;
    if (surVal > 0) {
      itemSur = itemSurchargeType === 'percent' ? baseTotal * (surVal / 100) : surVal;
    }

    const itemTotal = Math.max(0, baseTotal - itemDisc + itemSur);

    setCart([
      ...cart,
      {
        product: activeProduct,
        qty: qtyNum,
        unit: activeProduct.main_unit,
        unitPrice: priceNum,
        discountType: itemDiscountType,
        discountValue: discVal,
        surchargeType: itemSurchargeType,
        surchargeValue: surVal,
        totalPrice: itemTotal,
      },
    ]);

    setActiveProduct(null);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (isNaN(newQty) || newQty <= 0) {
      handleRemoveFromCart(index);
      return;
    }
    const updated = [...cart];
    const item = updated[index];
    if (item.product.main_unit === 'UN') {
      newQty = Math.round(newQty);
      if (newQty <= 0) {
        handleRemoveFromCart(index);
        return;
      }
    }
    item.qty = newQty;
    const baseTotal = newQty * item.unitPrice;
    const discVal = item.discountValue || 0;
    const surVal = item.surchargeValue || 0;
    let itemDisc = 0;
    if (discVal > 0) {
      itemDisc = item.discountType === 'percent' ? baseTotal * (discVal / 100) : discVal;
    }
    let itemSur = 0;
    if (surVal > 0) {
      itemSur = item.surchargeType === 'percent' ? baseTotal * (surVal / 100) : surVal;
    }
    item.totalPrice = Math.max(0, baseTotal - itemDisc + itemSur);
    setCart(updated);
  };

  const cartItemsSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const saleDiscValNum = parseFloat(saleDiscountValue) || 0;
  const saleDiscountAmt = saleDiscValNum > 0
    ? (saleDiscountType === 'percent' ? cartItemsSubtotal * (saleDiscValNum / 100) : saleDiscValNum)
    : 0;

  const saleSurValNum = parseFloat(saleSurchargeValue) || 0;
  const saleSurchargeAmt = saleSurValNum > 0
    ? (saleSurchargeType === 'percent' ? cartItemsSubtotal * (saleSurValNum / 100) : saleSurValNum)
    : 0;

  const subtotalAfterSaleDiscSur = Math.max(0, cartItemsSubtotal - saleDiscountAmt + saleSurchargeAmt);

  const systemSettings = storage.getSettings();
  const configuredInterestRate = systemSettings.fiado_interest_rate !== undefined ? systemSettings.fiado_interest_rate : 5;

  const interestRate = paymentMethod === 'fiado' && applyFiadoInterest ? configuredInterestRate : 0;
  const interestAmount = paymentMethod === 'fiado' && applyFiadoInterest
    ? subtotalAfterSaleDiscSur * (interestRate / 100)
    : 0;

  const cartGrandTotal = subtotalAfterSaleDiscSur + interestAmount;

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }
    const created = storage.saveCustomer({
      name: newCustName.trim(),
      document: newCustDoc.trim(),
      phone: newCustPhone.trim(),
    });
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustDoc('');
    setNewCustPhone('');
    setIsNewCustomerModalOpen(false);
  };

  const handleLoadPreSaleIntoPDV = (preSale: PreSale) => {
    const newCart: CartItem[] = [];
    const insufficientItems: { name: string; requested: number; available: number; unit: string }[] = [];

    for (const item of preSale.items) {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        newCart.push({
          product: prod,
          qty: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        });

        if (item.quantity > prod.current_stock) {
          insufficientItems.push({
            name: prod.name,
            requested: item.quantity,
            available: prod.current_stock,
            unit: item.unit,
          });
        }
      }
    }

    if (newCart.length === 0) {
      alert('Nenhum produto da pré-venda foi encontrado no cadastro atual.');
      return;
    }

    setCart(newCart);
    if (preSale.customer_id) {
      setSelectedCustomerId(preSale.customer_id);
    }
    setLoadedPreSaleId(preSale.id);
    setIsPreSaleModalOpen(false);

    if (insufficientItems.length > 0) {
      setStockAlertModal({
        isOpen: true,
        title: `Atenção: Pré-Venda #${preSale.code || preSale.id} com Estoque Insuficiente`,
        items: insufficientItems,
      });
    } else {
      setSuccessMessage(`✓ Pré-Venda #${preSale.code || preSale.id} carregada no PDV!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      alert('Carrinho vazio.');
      return;
    }

    let finalPayments: PaymentDetail[] = [];

    if (isSplitPayment) {
      finalPayments = splitPayments.filter((p) => p.amount > 0);
      if (finalPayments.length === 0) {
        alert('Informe ao menos uma forma de pagamento com valor.');
        return;
      }

      const totalPaid = finalPayments.reduce((sum, p) => sum + p.amount, 0);
      const hasFiado = finalPayments.some((p) => p.method === 'fiado');

      // Requirement 4 & 5: Validation of Payment & Partial Fiado
      if (totalPaid < cartGrandTotal && !hasFiado) {
        alert(
          `Atenção: O valor recebido (R$ ${totalPaid.toFixed(2)}) é menor que o valor total da venda (R$ ${cartGrandTotal.toFixed(2)}).\n\nPara prosseguir, inclua outra forma de pagamento ou selecione a opção 'Fiado' para registrar o saldo restante para o cliente.`
        );
        return;
      }

      if (hasFiado && !selectedCustomerId) {
        alert('Para incluir pagamento do tipo Fiado, por favor selecione o Cliente.');
        return;
      }
    } else {
      if (paymentMethod === 'fiado' && !selectedCustomerId) {
        alert('Selecione o cliente para venda fiada.');
        return;
      }
      finalPayments = [{ method: paymentMethod, amount: cartGrandTotal }];
    }

    if (stockOrigin === 'carga' && !selectedSellerLoadId) {
      alert('Selecione qual Carga do Vendedor originou esta venda.');
      return;
    }

    setErrorMessage(null);

    // Verify stock if negative stock is disabled (only for main company stock)
    const settings = storage.getSettings();
    if (stockOrigin === 'empresa' && !settings.allow_negative_stock) {
      const insufficient = cart.filter((item) => item.qty > item.product.current_stock);
      if (insufficient.length > 0) {
        setStockAlertModal({
          isOpen: true,
          title: 'Estoque Insuficiente no Caixa',
          items: insufficient.map((i) => ({
            name: i.product.name,
            requested: i.qty,
            available: i.product.current_stock,
            unit: i.unit,
          })),
        });
        return;
      }
    }

    try {
      // 1. Process stock outputs for each item (only if from main company stock)
      const saleItems: FiadoSaleItem[] = [];

      for (const item of cart) {
        if (stockOrigin === 'empresa') {
          storage.registerExit({
            productId: item.product.id,
            usedQty: item.qty,
            usedUnit: item.unit,
            origin: 'manual',
            notes: `Venda Rápida (${finalPayments.map((p) => p.method.toUpperCase()).join('/')})`,
          });
        }

        saleItems.push({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.qty,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          discount_type: item.discountType,
          discount_value: item.discountValue,
          surcharge_type: item.surchargeType,
          surcharge_value: item.surchargeValue,
        });
      }

      // 2. Record Sale / Fiado Debt
      const customer = customers.find((c) => c.id === selectedCustomerId);
      const isFiadoPresent = finalPayments.some((p) => p.method === 'fiado');
      const primaryMethod = isSplitPayment ? 'multi' : paymentMethod;

      const createdSale = storage.recordFiadoSale({
        customer_id: isFiadoPresent ? selectedCustomerId : '',
        customer_name: isFiadoPresent ? customer?.name || 'Cliente Fiado' : '',
        date: new Date().toISOString(),
        items: saleItems,
        subtotal_amount: cartItemsSubtotal,
        discount_amount: saleDiscountAmt,
        surcharge_amount: saleSurchargeAmt,
        interest_rate: interestRate,
        interest_amount: interestAmount,
        total_amount: cartGrandTotal,
        payment_method: primaryMethod as any,
        payments: finalPayments,
        status: isFiadoPresent ? 'aberto' : 'pago',
        paid_at: !isFiadoPresent ? new Date().toISOString() : undefined,
        installments_count: isFiadoPresent ? installmentsCount : 1,
        first_due_date: isFiadoPresent ? firstDueDate : undefined,
        notes: stockOrigin === 'carga' ? `Venda realizada da Carga do Vendedor #${selectedSellerLoadId}` : undefined,
      });

      // 3. If sale origin is Seller Load, record in the load
      if (stockOrigin === 'carga' && selectedSellerLoadId) {
        storage.recordSaleInSellerLoad(selectedSellerLoadId, {
          sale_id: createdSale.id,
          type: paymentMethod === 'fiado' ? 'fiado' : 'venda_rapida',
          date: new Date().toISOString(),
          customer_name: customer?.name,
          total_amount: cartGrandTotal,
          payment_method: paymentMethod,
          items: saleItems.map((i) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit: i.unit,
            unit_price: i.unit_price,
            total_price: i.total_price,
          })),
        });
      }

      // Update pre-sale status if converted from pre-sale
      if (loadedPreSaleId) {
        storage.updatePreSaleStatus(loadedPreSaleId, 'finalizada');
        setLoadedPreSaleId(null);
      }

      // Refresh app state
      onRefresh();

      const sysSettings = storage.getSettings();
      if (sysSettings.auto_clear_form) {
        setCart([]);
        setSaleDiscountValue('0');
        setSaleSurchargeValue('0');
        setSelectedCustomerId('');
      }
      setIsCheckoutOpen(false);
      setSuccessMessage('✓ Venda realizada com sucesso!');

      // Open Receipt Modal automatically
      setReceiptState({
        isOpen: true,
        type: paymentMethod === 'fiado' ? 'venda_fiado' : 'venda_normal',
        sale: createdSale,
      });

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao finalizar venda.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-blue-500/40 text-blue-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            PDV Simplificado
          </span>
          <h1 className="text-2xl font-black tracking-tight">Venda Rápida</h1>
          <p className="text-xs text-blue-100/90 font-medium mt-0.5">
            Registre saídas de balcão e fiados com poucos toques.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsPreSaleModalOpen(true)}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-extrabold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
          >
            <FileText className="w-5 h-5 text-indigo-200" />
            <span>Buscar Pré-Venda</span>
          </button>

          <button
            onClick={() => {
              if (cart.length === 0) alert('Adicione produtos ao carrinho.');
              else setIsCheckoutOpen(true);
            }}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2.5 transition active:scale-95 shrink-0"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Finalizar Venda ({cart.length})</span>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 bg-white text-emerald-700 text-xs font-black rounded-lg ml-1">
                R$ {cartGrandTotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-sm font-bold">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: PRODUCT CATALOG & SEARCH */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar produto por nome ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-1" />
                <p className="font-bold text-sm">Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    disabled={isOutOfStock}
                    className={`text-left p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-extrabold text-[10px] uppercase mb-1">
                        {p.main_unit}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 leading-tight">
                        {p.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Estoque</div>
                        <div
                          className={`text-xs font-black ${
                            isOutOfStock
                              ? 'text-rose-500'
                              : p.current_stock <= p.min_stock
                              ? 'text-amber-500'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {formatStockDisplay(p, p.current_stock, false)}
                        </div>
                      </div>

                      {p.unit_price ? (
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500">Preço</div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            R$ {p.unit_price.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CURRENT CART */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[400px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="font-black text-slate-900 dark:text-white text-base">
                  Carrinho de Venda
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 font-bold hover:underline"
                >
                  Esvaziar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-xs">
                  Selecione os produtos ao lado para adicionar à venda
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {cart.map((item, idx) => {
                  const isOverStock = item.qty > item.product.current_stock;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition space-y-2 ${
                        isOverStock
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block leading-snug truncate">
                            {item.product.name}
                          </span>
                          {isOverStock ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Estoque Insuficiente (Disp: {item.product.current_stock} {item.unit})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Estoque atual: {item.product.current_stock} {item.unit}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition shrink-0"
                          title="Remover produto do carrinho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & Price Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        {/* Qty Controls */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(idx, item.qty - (item.unit === 'UN' ? 1 : 0.5))}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center transition active:scale-95"
                            title="Diminuir quantidade"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step={item.unit === 'UN' ? '1' : 'any'}
                            min="0.001"
                            value={item.qty}
                            onChange={(e) => handleUpdateCartQty(idx, parseFloat(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="w-14 text-center font-black text-xs text-slate-900 dark:text-white bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(idx, item.qty + (item.unit === 'UN' ? 1 : 0.5))}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center transition active:scale-95"
                            title="Aumentar quantidade"
                          >
                            +
                          </button>
                          <span className="text-[10px] font-bold text-slate-500 px-1">{item.unit}</span>
                        </div>

                        {/* Price & Total */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-semibold">
                            R$ {item.unitPrice.toFixed(2)} / {item.unit}
                          </div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            R$ {item.totalPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Footer Total */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                Total da Venda
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {cartGrandTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => {
                if (cart.length === 0) alert('Adicione produtos ao carrinho.');
                else setIsCheckoutOpen(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Avançar para Pagamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD PRODUCT TO CART */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Adicionar ao Carrinho
              </h3>
              <button
                onClick={() => setActiveProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                {activeProduct.main_unit}
              </div>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                {activeProduct.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Disponível:{' '}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatStockDisplay(activeProduct, activeProduct.current_stock)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Quantidade ({activeProduct.main_unit})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step={activeProduct.main_unit === 'UN' ? '1' : 'any'}
                    value={inputQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInputQty(e.target.value)}
                    className="w-2/3 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="w-1/3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-300 text-sm flex items-center justify-center">
                    {activeProduct.main_unit}
                  </div>
                </div>
                {activeProduct.main_unit === 'UN' ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                    * Produto em UN: informe apenas valores inteiros.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Permite valores fracionados (ex: 0.500 {activeProduct.main_unit}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Preço Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputUnitPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setInputUnitPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-emerald-600 dark:text-emerald-400 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Item Discount & Surcharge Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-extrabold text-rose-600 dark:text-rose-400 mb-1">
                    Desconto no Item
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemDiscountValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setItemDiscountValue(e.target.value)}
                      className="w-2/3 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      placeholder="0"
                    />
                    <select
                      value={itemDiscountType}
                      onChange={(e) => setItemDiscountType(e.target.value as any)}
                      className="w-1/3 px-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value="percent">%</option>
                      <option value="value">R$</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
                    Acréscimo no Item
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemSurchargeValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setItemSurchargeValue(e.target.value)}
                      className="w-2/3 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      placeholder="0"
                    />
                    <select
                      value={itemSurchargeType}
                      onChange={(e) => setItemSurchargeType(e.target.value as any)}
                      className="w-1/3 px-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs text-slate-700 dark:text-slate-300"
                    >
                      <option value="percent">%</option>
                      <option value="value">R$</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Valor Final Item:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  R${' '}
                  {(() => {
                    const q = parseFloat(inputQty) || 0;
                    const p = parseFloat(inputUnitPrice) || 0;
                    const base = q * p;
                    const dv = parseFloat(itemDiscountValue) || 0;
                    const sv = parseFloat(itemSurchargeValue) || 0;
                    const d = itemDiscountType === 'percent' ? base * (dv / 100) : dv;
                    const s = itemSurchargeType === 'percent' ? base * (sv / 100) : sv;
                    return Math.max(0, base - d + s).toFixed(2);
                  })()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveProduct(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 font-extrabold text-xs text-white rounded-xl shadow"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT & PAYMENT METHOD */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Forma de Pagamento
              </h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total display & Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Subtotal Itens:</span>
                <span>R$ {cartItemsSubtotal.toFixed(2)}</span>
              </div>
              {saleDiscountAmt > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-extrabold">
                  <span>Desconto Venda:</span>
                  <span>- R$ {saleDiscountAmt.toFixed(2)}</span>
                </div>
              )}
              {saleSurchargeAmt > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-extrabold">
                  <span>Acréscimo Venda:</span>
                  <span>+ R$ {saleSurchargeAmt.toFixed(2)}</span>
                </div>
              )}
              {interestAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-600 font-extrabold">
                  <span>Juros ({interestRate}%):</span>
                  <span>+ R$ {interestAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Total Final:
                </span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  R$ {cartGrandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Sale Discount and Surcharge Inputs */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <div>
                <label className="block text-[11px] font-extrabold text-rose-600 dark:text-rose-400 mb-1">
                  Desconto na Venda
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleDiscountValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSaleDiscountValue(e.target.value)}
                    className="w-2/3 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                    placeholder="0"
                  />
                  <select
                    value={saleDiscountType}
                    onChange={(e) => setSaleDiscountType(e.target.value as any)}
                    className="w-1/3 px-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs"
                  >
                    <option value="percent">%</option>
                    <option value="value">R$</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
                  Acréscimo na Venda
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={saleSurchargeValue}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSaleSurchargeValue(e.target.value)}
                    className="w-2/3 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                    placeholder="0"
                  />
                  <select
                    value={saleSurchargeType}
                    onChange={(e) => setSaleSurchargeType(e.target.value as any)}
                    className="w-1/3 px-1 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs"
                  >
                    <option value="percent">%</option>
                    <option value="value">R$</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Origem do Estoque da Venda (Empresa vs Carga do Vendedor) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Origem do Estoque da Venda:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStockOrigin('empresa')}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    stockOrigin === 'empresa'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold ring-1 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Estoque Empresa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockOrigin('carga')}
                  className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    stockOrigin === 'carga'
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-extrabold ring-1 ring-amber-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Carga Vendedor</span>
                </button>
              </div>

              {stockOrigin === 'carga' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                    Selecione a Carga Ativa:
                  </label>
                  {activeSellerLoads.length === 0 ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                      Nenhuma carga aberta em viagem. Crie uma nova carga no módulo "Carga do Vendedor".
                    </p>
                  ) : (
                    <select
                      value={selectedSellerLoadId}
                      onChange={(e) => setSelectedSellerLoadId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
                    >
                      <option value="">-- Escolha a Carga --</option>
                      {activeSellerLoads.map((load) => (
                        <option key={load.id} value={load.id}>
                          #{load.code} - {load.vendor_name} ({load.departure_date})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Payment Mode Selector (Unico vs Múltiplo) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Forma de Pagamento:
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsSplitPayment(false)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      !isSplitPayment
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Pagamento Único
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitPayment(true);
                      if (splitPayments.length === 0 || splitPayments.reduce((s, p) => s + p.amount, 0) === 0) {
                        setSplitPayments([
                          { method: 'pix', amount: Math.round(cartGrandTotal * 50) / 100 },
                          { method: 'dinheiro', amount: Math.round(cartGrandTotal * 50) / 100 },
                        ]);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      isSplitPayment
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Dividir / Múltiplo
                  </button>
                </div>
              </div>

              {!isSplitPayment ? (
                /* Payment Method Selector Grid */
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-600' },
                    { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-600' },
                    { id: 'cartao', label: 'Cartão', icon: CreditCard, color: 'text-blue-600' },
                    { id: 'fiado', label: 'Fiado', icon: BookOpenCheck, color: 'text-amber-600' },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className={`p-3.5 rounded-xl border font-black text-xs flex items-center justify-start gap-2.5 transition ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${pm.color}`} />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Split Payment Controls */
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="space-y-2">
                    {splitPayments.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={p.method}
                          onChange={(e) => {
                            const updated = [...splitPayments];
                            updated[idx].method = e.target.value as PaymentMethod;
                            setSplitPayments(updated);
                          }}
                          className="w-1/2 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs"
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão</option>
                          <option value="fiado">Fiado</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.amount || ''}
                          onChange={(e) => {
                            const updated = [...splitPayments];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            setSplitPayments(updated);
                          }}
                          placeholder="Valor R$"
                          className="w-1/2 px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs"
                        />
                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() =>
                        setSplitPayments([
                          ...splitPayments,
                          {
                            method: 'dinheiro',
                            amount: Math.max(0, cartGrandTotal - splitPayments.reduce((s, p) => s + p.amount, 0)),
                          },
                        ])
                      }
                      className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Forma</span>
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 block">Soma dos Pagamentos:</span>
                      <span
                        className={`text-xs font-black ${
                          Math.abs(splitPayments.reduce((s, p) => s + p.amount, 0) - cartGrandTotal) < 0.01
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        R$ {splitPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)} / R$ {cartGrandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* If Fiado is present (single or split): Customer, Interest Toggle & Installments Selector */}
            {((!isSplitPayment && paymentMethod === 'fiado') ||
              (isSplitPayment && splitPayments.some((p) => p.method === 'fiado'))) && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Selecione o Cliente (Fiado): *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="text-[11px] font-black text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    + Novo Cliente
                  </button>
                </div>

                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Escolha um Cliente --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.document ? `(${c.document})` : ''}
                    </option>
                  ))}
                </select>

                {/* Fiado Interest Checkbox Toggle */}
                <div className="p-2.5 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyFiadoInterest}
                      onChange={(e) => setApplyFiadoInterest(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span>Aplicar juros configurados ({configuredInterestRate}%)</span>
                  </label>
                  {applyFiadoInterest && (
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                      + R$ {interestAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Parcelas:</span>
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs"
                    >
                      <option value={1}>1x (À vista fiado)</option>
                      <option value={2}>2x parcela mensais</option>
                      <option value={3}>3x parcela mensais</option>
                      <option value={4}>4x parcela mensais</option>
                      <option value={5}>5x parcela mensais</option>
                      <option value={6}>6x parcela mensais</option>
                      <option value={12}>12x parcela mensais</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>1º Vencimento:</span>
                    </label>
                    <input
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-lg">
                  Serão geradas {installmentsCount}x parcelas de R${' '}
                  {(cartGrandTotal / installmentsCount).toFixed(2)} cada.
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-1/2 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-600 font-extrabold text-xs text-white rounded-xl shadow flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Venda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW CUSTOMER MODAL */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Cadastrar Cliente
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  CPF ou CNPJ
                </label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000-00"
                  value={newCustDoc}
                  onChange={(e) => setNewCustDoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Telefone (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 font-extrabold text-xs text-white rounded-xl shadow"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BUSCAR PRÉ-VENDA MODAL */}
      {isPreSaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Buscar e Carregar Pré-Vendas (Orçamentos Pendentes)
                </h3>
              </div>
              <button
                onClick={() => setIsPreSaleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente ou #ID da pré-venda..."
                  value={preSaleSearch}
                  onChange={(e) => setPreSaleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
              {(() => {
                const pendingPreSales = storage
                  .getPreSales()
                  .filter((ps) => ps.status === 'pendente')
                  .filter((ps) => {
                    if (!preSaleSearch) return true;
                    const term = preSaleSearch.toLowerCase();
                    return (
                      ps.id.toLowerCase().includes(term) ||
                      (ps.customer_name && ps.customer_name.toLowerCase().includes(term))
                    );
                  });

                if (pendingPreSales.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <FileText className="w-10 h-10 mx-auto opacity-30 text-indigo-500" />
                      <p className="text-xs font-bold">Nenhuma pré-venda pendente encontrada.</p>
                      <p className="text-[11px] text-slate-500">
                        Crie novas pré-vendas através do módulo de Saídas de Estoque.
                      </p>
                    </div>
                  );
                }

                return pendingPreSales.map((ps) => (
                  <div
                    key={ps.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          #{ps.id}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {ps.customer_name || 'Cliente Avulso'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-extrabold uppercase">
                          Pendente
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Data: {new Date(ps.created_at).toLocaleDateString('pt-BR')} • {ps.items.length} {ps.items.length === 1 ? 'item' : 'itens'}
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        {ps.items.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Total</span>
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          R$ {ps.total_amount.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleLoadPreSaleIntoPDV(ps)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 flex items-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Carregar no PDV</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsPreSaleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSUFFICIENT STOCK ALERT MODAL */}
      {stockAlertModal && stockAlertModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 pt-10 sm:pt-20 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-800 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/80 rounded-2xl shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {stockAlertModal.title || 'Atenção: Estoque Insuficiente'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Alguns itens no caixa possuem quantidade superior ao saldo atual disponível.
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 space-y-2 max-h-60 overflow-y-auto">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block uppercase tracking-wider">
                Itens com Saldo Insuficiente:
              </span>
              <ul className="space-y-2 text-xs">
                {stockAlertModal.items.map((it, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">
                        {it.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Estoque Atual: <strong className="text-rose-600">{it.available} {it.unit}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Solicitado</span>
                      <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                        {it.requested} {it.unit}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              💡 <strong>Você pode editar as quantidades diretamente no carrinho do caixa</strong> para adequar a venda ao estoque disponível antes de finalizar.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStockAlertModal(null)}
                className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>OK, Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={receiptState.isOpen}
        type={receiptState.type}
        sale={receiptState.sale}
        onClose={() => setReceiptState({ isOpen: false, type: 'venda_normal', sale: null })}
      />
    </div>
  );
};
