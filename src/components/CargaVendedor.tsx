/**
 * Chronix ERP / Aquino Frios - Módulo Carga do Vendedor
 * Controle de acerto de carga para vendedores externos, conferência física/financeira e estoque.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Printer,
  Share2,
  RotateCcw,
  Lock,
  Unlock,
  DollarSign,
  Calendar,
  User as UserIcon,
  Package,
  X,
  Building2,
  Check,
  MessageSquare,
  History,
  Boxes,
  ShieldCheck,
  TrendingUp,
  ShoppingCart,
  UserCheck,
  CreditCard,
  QrCode,
  BookOpen,
} from 'lucide-react';
import {
  Product,
  Movement,
  User,
  SellerLoad,
  SellerLoadItem,
  SellerLoadStatus,
  PaymentMethod,
  Customer,
} from '../types';
import { storage } from '../services/storage';
import { formatStockDisplay } from '../lib/unitConverter';

interface CargaVendedorProps {
  products: Product[];
  movements: Movement[];
  currentUser: User;
  onRefresh: () => void;
}

export const CargaVendedor: React.FC<CargaVendedorProps> = ({
  products,
  currentUser,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'conference' | 'new_load' | 'history'>('conference');

  // Load lists
  const [sellerLoads, setSellerLoads] = useState<SellerLoad[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');

  // Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyVendorFilter, setHistoryVendorFilter] = useState('all');

  // --- NEW LOAD FORM STATE ---
  const [newVendorName, setNewVendorName] = useState('');
  const [newDepartureDate, setNewDepartureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newVehicle, setNewVehicle] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Draft items for new load
  const [draftItems, setDraftItems] = useState<
    {
      product: Product;
      initialQty: number;
    }[]
  >([]);

  // Item selector state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState('1');

  // --- CONFERENCE FORM STATE ---
  // Product ID -> Physical Counted Qty
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  // Financial inputs
  const [actualDinheiro, setActualDinheiro] = useState<number>(0);
  const [actualPix, setActualPix] = useState<number>(0);
  const [actualCartao, setActualCartao] = useState<number>(0);
  const [actualFiado, setActualFiado] = useState<number>(0);
  const [conferenceNotes, setConferenceNotes] = useState('');

  // Modals & Messages
  const [reportModalLoad, setReportModalLoad] = useState<SellerLoad | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Confirmation Modal state (prevents iframe browser confirm blocks)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'close' | 'reopen' | 'delete';
    loadId?: string;
    code?: string;
    status?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'close',
  });

  // --- ROUTE SALE MODAL STATE ---
  const [isRouteSaleModalOpen, setIsRouteSaleModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');

  // Route sale cart
  const [routeCart, setRouteCart] = useState<
    {
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      max_qty: number;
    }[]
  >([]);

  const [routeSaleProductId, setRouteSaleProductId] = useState('');
  const [routeSaleQty, setRouteSaleQty] = useState('1');
  const [routeSaleUnitPrice, setRouteSaleUnitPrice] = useState('0');
  const [routeSalePaymentMethod, setRouteSalePaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao' | 'fiado'>('dinheiro');
  const [routeSaleInstallments, setRouteSaleInstallments] = useState(1);
  const [routeSaleDueDate, setRouteSaleDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  // Route Sale Receipt Modal State
  const [routeSaleReceipt, setRouteSaleReceipt] = useState<{
    saleId: string;
    loadCode: string;
    vendorName: string;
    customerName: string;
    date: string;
    paymentMethod: string;
    items: { product_name: string; quantity: number; unit: string; unit_price: number; total_price: number }[];
    total: number;
  } | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // Load seller loads from storage
  const reloadData = () => {
    const list = storage.getSellerLoads();
    setSellerLoads(list);
    onRefresh();
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Auto select active load if available
  const activeLoads = useMemo(() => {
    return sellerLoads.filter((l) => l.status === 'em_viagem');
  }, [sellerLoads]);

  useEffect(() => {
    if (activeLoads.length > 0 && (!selectedLoadId || !sellerLoads.some((l) => l.id === selectedLoadId))) {
      setSelectedLoadId(activeLoads[0].id);
    } else if (sellerLoads.length > 0 && !selectedLoadId) {
      setSelectedLoadId(sellerLoads[0].id);
    }
  }, [sellerLoads, activeLoads]);

  // Current selected load
  const currentLoad = useMemo(() => {
    return sellerLoads.find((l) => l.id === selectedLoadId) || null;
  }, [sellerLoads, selectedLoadId]);

  // Initialize conference form inputs when currentLoad changes
  useEffect(() => {
    if (currentLoad) {
      const counts: Record<string, number> = {};
      currentLoad.items.forEach((item) => {
        const expected = Math.max(0, item.initial_qty - item.sold_qty);
        counts[item.product_id] = item.counted_qty !== undefined ? item.counted_qty : expected;
      });
      setPhysicalCounts(counts);

      if (currentLoad.actual_financial) {
        setActualDinheiro(currentLoad.actual_financial.dinheiro || 0);
        setActualPix(currentLoad.actual_financial.pix || 0);
        setActualCartao(currentLoad.actual_financial.cartao || 0);
        setActualFiado(currentLoad.actual_financial.fiado || 0);
      } else if (currentLoad.expected_financial) {
        setActualDinheiro(currentLoad.expected_financial.dinheiro || 0);
        setActualPix(currentLoad.expected_financial.pix || 0);
        setActualCartao(currentLoad.expected_financial.cartao || 0);
        setActualFiado(currentLoad.expected_financial.fiado || 0);
      }
      setConferenceNotes(currentLoad.notes || '');
    }
  }, [currentLoad]);

  // --- NEW LOAD FUNCTIONS ---
  const handleAddDraftItem = () => {
    if (!selectedProductId) {
      alert('Selecione um produto.');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = parseFloat(addQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    if (draftItems.some((i) => i.product.id === prod.id)) {
      alert('Este produto já foi adicionado à lista da carga.');
      return;
    }

    setDraftItems([...draftItems, { product: prod, initialQty: qty }]);
    setSelectedProductId('');
    setAddQty('1');
  };

  const handleRemoveDraftItem = (productId: string) => {
    setDraftItems(draftItems.filter((i) => i.product.id !== productId));
  };

  const handleCreateLoadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) {
      alert('Informe o nome do vendedor.');
      return;
    }
    if (draftItems.length === 0) {
      alert('Adicione ao menos 1 produto à carga.');
      return;
    }

    try {
      const newLoad = storage.createSellerLoad({
        vendor_name: newVendorName.trim(),
        vehicle: newVehicle.trim(),
        departure_date: newDepartureDate,
        notes: newNotes.trim(),
        items: draftItems.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          unit: i.product.main_unit,
          initial_qty: i.initialQty,
          unit_price: i.product.unit_price || i.product.sale_price || 0,
          cost_price: i.product.cost_price || 0,
        })),
      });

      setSuccessMsg(`✓ Carga #${newLoad.code} para ${newLoad.vendor_name} criada com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 5000);

      // Reset form
      setNewVendorName('');
      setNewVehicle('');
      setNewNotes('');
      setDraftItems([]);
      setSelectedLoadId(newLoad.id);
      setActiveTab('conference');
      reloadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar carga.');
    }
  };

  // --- ROUTE SALES FUNCTIONS ---
  const handleOpenRouteSaleModal = () => {
    if (!currentLoad || currentLoad.status !== 'em_viagem') {
      alert('Selecione uma rota ativa com status "Em Viagem" para registrar vendas.');
      return;
    }
    const customerList = storage.getCustomers();
    setCustomers(customerList);
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setRouteCart([]);
    setRouteSaleProductId('');
    setRouteSaleQty('1');
    setRouteSaleUnitPrice('0');
    setRouteSalePaymentMethod('dinheiro');
    setIsRouteSaleModalOpen(true);
  };

  useEffect(() => {
    if (routeSaleProductId && currentLoad) {
      const item = currentLoad.items.find((i) => i.product_id === routeSaleProductId);
      if (item) {
        setRouteSaleUnitPrice(String(item.unit_price || 0));
      }
    }
  }, [routeSaleProductId, currentLoad]);

  const handleAddProductToRouteCart = () => {
    if (!currentLoad) return;
    if (!routeSaleProductId) {
      alert('Selecione um produto da rota.');
      return;
    }
    const loadItem = currentLoad.items.find((i) => i.product_id === routeSaleProductId);
    if (!loadItem) return;

    const availableInRoute = Math.max(0, loadItem.initial_qty - loadItem.sold_qty);
    const qty = parseFloat(routeSaleQty);
    const price = parseFloat(routeSaleUnitPrice);

    if (isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('Informe um preço unitário válido.');
      return;
    }

    const existingItem = routeCart.find((c) => c.product_id === loadItem.product_id);
    const currentInCart = existingItem ? existingItem.quantity : 0;

    if (qty + currentInCart > availableInRoute) {
      alert(`Quantidade indisponível na Rota!\nSaldo em Rota: ${availableInRoute} ${loadItem.unit}\nJá no carrinho da venda: ${currentInCart} ${loadItem.unit}`);
      return;
    }

    if (existingItem) {
      setRouteCart(
        routeCart.map((c) =>
          c.product_id === loadItem.product_id
            ? { ...c, quantity: c.quantity + qty, unit_price: price }
            : c
        )
      );
    } else {
      setRouteCart([
        ...routeCart,
        {
          product_id: loadItem.product_id,
          product_name: loadItem.product_name,
          quantity: qty,
          unit: loadItem.unit,
          unit_price: price,
          max_qty: availableInRoute,
        },
      ]);
    }

    setRouteSaleProductId('');
    setRouteSaleQty('1');
  };

  const handleRemoveRouteCartItem = (productId: string) => {
    setRouteCart(routeCart.filter((c) => c.product_id !== productId));
  };

  const handleConfirmRouteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLoad) return;
    if (routeCart.length === 0) {
      alert('Adicione ao menos 1 item para realizar a venda na rota.');
      return;
    }

    let customerName = 'Cliente Balcão (Rota)';
    if (selectedCustomerId) {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) customerName = c.name;
    } else if (customCustomerName.trim()) {
      customerName = customCustomerName.trim();
    }

    const totalAmount = routeCart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const saleId = 'sale-route-' + Date.now();
    const dateStr = new Date().toISOString();

    const saleItems = routeCart.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }));

    // 1. Record sale in seller load (deducts from route's isolated stock)
    const success = storage.recordSaleInSellerLoad(currentLoad.id, {
      sale_id: saleId,
      type: 'pdv',
      date: dateStr,
      customer_name: customerName,
      total_amount: totalAmount,
      payment_method: routeSalePaymentMethod,
      items: saleItems,
    });

    if (!success) {
      alert('Erro ao registrar venda na rota. Verifique se a rota continua ativa.');
      return;
    }

    // 2. Register sale record / fiado if applicable
    storage.recordFiadoSale({
      customer_name: customerName,
      customer_id: selectedCustomerId || 'balcao',
      date: dateStr,
      total_amount: totalAmount,
      payment_method: routeSalePaymentMethod as PaymentMethod,
      status: routeSalePaymentMethod === 'fiado' ? 'aberto' : 'pago',
      installments_count: routeSalePaymentMethod === 'fiado' ? routeSaleInstallments : 1,
      first_due_date: routeSalePaymentMethod === 'fiado' ? routeSaleDueDate : undefined,
      items: saleItems,
      notes: `Venda na Rota #${currentLoad.code} - Vendedor: ${currentLoad.vendor_name}`,
    });

    // 3. Set receipt modal
    setRouteSaleReceipt({
      saleId,
      loadCode: currentLoad.code,
      vendorName: currentLoad.vendor_name,
      customerName,
      date: new Date().toLocaleString('pt-BR'),
      paymentMethod: routeSalePaymentMethod.toUpperCase(),
      items: saleItems,
      total: totalAmount,
    });

    setIsRouteSaleModalOpen(false);
    setSuccessMsg(`✓ Venda da Rota R$ ${totalAmount.toFixed(2)} lançada com sucesso para ${customerName}!`);
    setTimeout(() => setSuccessMsg(null), 5000);
    reloadData();
  };

  // --- CONFERENCE CALCULATIONS ---
  const conferenceMetrics = useMemo(() => {
    if (!currentLoad) return null;

    let totalSentValue = 0;
    let totalSoldValue = 0;
    let totalReturnedExpectedValue = 0;
    let totalReturnedCountedValue = 0;
    let stockDiffItemsCount = 0;
    let totalStockDiffValue = 0;

    const itemsSummary = currentLoad.items.map((item) => {
      const unitPrice = item.unit_price || 0;
      const costPrice = item.cost_price || 0;

      const sentVal = item.initial_qty * unitPrice;
      const soldVal = item.sold_qty * unitPrice;

      const expectedReturn = Math.max(0, item.initial_qty - item.sold_qty);
      const counted = physicalCounts[item.product_id] !== undefined
        ? physicalCounts[item.product_id]
        : expectedReturn;

      const diff = counted - expectedReturn;
      const diffVal = diff * unitPrice;

      totalSentValue += sentVal;
      totalSoldValue += soldVal;
      totalReturnedExpectedValue += expectedReturn * unitPrice;
      totalReturnedCountedValue += counted * unitPrice;

      if (diff !== 0) {
        stockDiffItemsCount++;
        totalStockDiffValue += diffVal;
      }

      return {
        ...item,
        expectedReturn,
        counted,
        diff,
        diffVal,
      };
    });

    const expectedFin = currentLoad.expected_financial || {
      total_sold: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      fiado: 0,
    };

    const expectedTotalNonFiado = expectedFin.dinheiro + expectedFin.pix + expectedFin.cartao;
    const actualTotalNonFiado = actualDinheiro + actualPix + actualCartao;
    const financialDiff = actualTotalNonFiado - expectedTotalNonFiado;

    const hasStockDivergence = stockDiffItemsCount > 0;
    const hasFinancialDivergence = Math.abs(financialDiff) > 0.01;

    return {
      itemsSummary,
      totalSentValue,
      totalSoldValue,
      totalReturnedExpectedValue,
      totalReturnedCountedValue,
      stockDiffItemsCount,
      totalStockDiffValue,
      expectedFin,
      expectedTotalNonFiado,
      actualTotalNonFiado,
      financialDiff,
      hasStockDivergence,
      hasFinancialDivergence,
      isApproved: !hasStockDivergence && !hasFinancialDivergence,
    };
  }, [currentLoad, physicalCounts, actualDinheiro, actualPix, actualCartao, actualFiado]);

  // --- CONFIRMATION & ACTIONS (CUSTOM REACT MODAL) ---
  const handleCloseLoad = () => {
    if (!currentLoad) {
      setErrorMsg('Nenhuma carga selecionada.');
      return;
    }
    if (currentLoad.status === 'fechada') {
      setErrorMsg('Esta carga já se encontra fechada.');
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Fechar Carga e Retornar Estoque',
      message: `Confirma o FECHAMENTO DA CARGA #${currentLoad.code} (${currentLoad.vendor_name})?\n\nOs produtos devolvidos retornarão ao estoque principal da empresa e as diferenças físicas e financeiras serão registradas no sistema.`,
      actionType: 'close',
      loadId: currentLoad.id,
      code: currentLoad.code,
      status: currentLoad.status,
    });
  };

  const handleReopenLoad = (loadId: string) => {
    if (!isAdmin) {
      setErrorMsg('Apenas Administradores podem reabrir cargas fechadas.');
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Reabrir Carga Fechada',
      message: 'Deseja REABRIR esta carga fechada para correções e nova conferência?',
      actionType: 'reopen',
      loadId,
    });
  };

  const handleDeleteLoad = (loadId: string, code: string, status: string) => {
    if (!isAdmin) {
      setErrorMsg('Apenas Administradores têm permissão para excluir rotas.');
      return;
    }

    const confirmMsg = status === 'em_viagem'
      ? `ATENÇÃO: Deseja EXCLUIR a Rota #${code}?\n\nOs produtos que não foram vendidos retornarão ao Estoque Principal da empresa.\n\nConfirma a exclusão permanente da Rota #${code}?`
      : `Confirma a EXCLUSÃO PERMANENTE da Rota #${code} do histórico?\n\nEsta ação não poderá ser desfeita.`;

    setConfirmModalConfig({
      isOpen: true,
      title: `Excluir Rota #${code}`,
      message: confirmMsg,
      actionType: 'delete',
      loadId,
      code,
      status,
    });
  };

  const executeConfirmAction = () => {
    const { actionType, loadId, code } = confirmModalConfig;
    setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (actionType === 'close' && currentLoad) {
        const closed = storage.closeSellerLoad(currentLoad.id, {
          itemsCounted: physicalCounts,
          actualFinancial: {
            dinheiro: actualDinheiro,
            pix: actualPix,
            cartao: actualCartao,
            fiado: actualFiado,
          },
          notes: conferenceNotes,
        });

        setSuccessMsg(`✓ Carga #${closed.code} FECHADA com sucesso! Produtos retornados ao estoque principal.`);
        setTimeout(() => setSuccessMsg(null), 6000);
        reloadData();
      } else if (actionType === 'delete' && loadId) {
        storage.deleteSellerLoad(loadId, true);
        setSuccessMsg(`✓ Rota #${code || ''} excluída com sucesso!`);
        setTimeout(() => setSuccessMsg(null), 6000);
        if (selectedLoadId === loadId) {
          setSelectedLoadId('');
        }
        reloadData();
      } else if (actionType === 'reopen' && loadId) {
        storage.reopenSellerLoad(loadId);
        setSuccessMsg('✓ Carga reaberta para edição e conferência.');
        setTimeout(() => setSuccessMsg(null), 6000);
        reloadData();
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar operação.';
      setErrorMsg(`❌ ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = (load: SellerLoad) => {
    const text = `*CHRONIX ERP / AQUINO FRIOS - ACERTO DE CARGA*
---------------------------------------
*Carga:* #${load.code}
*Vendedor:* ${load.vendor_name}
*Veículo:* ${load.vehicle || 'N/I'}
*Data:* ${load.departure_date}
*Status:* ${load.status === 'fechada' ? 'CONCLUÍDA' : 'EM VIAGEM'}

*RESUMO DE VENDAS:*
• Total Vendido: R$ ${(load.expected_financial?.total_sold || 0).toFixed(2)}
  - Dinheiro: R$ ${(load.expected_financial?.dinheiro || 0).toFixed(2)}
  - PIX: R$ ${(load.expected_financial?.pix || 0).toFixed(2)}
  - Cartão: R$ ${(load.expected_financial?.cartao || 0).toFixed(2)}
  - Fiado: R$ ${(load.expected_financial?.fiado || 0).toFixed(2)}

*CONFERÊNCIA FINANCEIRA:*
• Valor Esperado: R$ ${((load.expected_financial?.dinheiro || 0) + (load.expected_financial?.pix || 0) + (load.expected_financial?.cartao || 0)).toFixed(2)}
• Valor Recebido: R$ ${((load.actual_financial?.dinheiro || 0) + (load.actual_financial?.pix || 0) + (load.actual_financial?.cartao || 0)).toFixed(2)}
• Diferença: R$ ${(load.financial_diff || 0).toFixed(2)} ${load.financial_diff === 0 ? '✔ OK' : '⚠️ DIVERGÊNCIA'}

---------------------------------------
*Conferido em:* ${load.closed_at ? new Date(load.closed_at).toLocaleString('pt-BR') : 'Em andamento'}
*Sistema Chronix ERP*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return sellerLoads.filter((l) => {
      const matchesSearch =
        l.code.toLowerCase().includes(historySearch.toLowerCase()) ||
        l.vendor_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        (l.vehicle && l.vehicle.toLowerCase().includes(historySearch.toLowerCase()));
      const matchesVendor = historyVendorFilter === 'all' || l.vendor_name === historyVendorFilter;
      return matchesSearch && matchesVendor;
    });
  }, [sellerLoads, historySearch, historyVendorFilter]);

  const uniqueVendors = useMemo(() => {
    const set = new Set<string>();
    sellerLoads.forEach((l) => set.add(l.vendor_name));
    return Array.from(set);
  }, [sellerLoads]);

  return (
    <div className="space-y-6 pb-12">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Rota de Vendas
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-300/60 dark:border-emerald-800/60">
                Mini ERP de Rota / Viagem
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Estoque isolado de viagem, registro de vendas da rota, fiados com cliente e conferência automática de retorno.
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('conference')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'conference'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Painel da Rota</span>
            {activeLoads.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('new_load')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'new_load'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Rota</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Rotas</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: CONFERÊNCIA E PAINEL DA ROTA --- */}
      {activeTab === 'conference' && (
        <div className="space-y-6">
          {/* Active Loads Selector & Header Info */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Selecione a Rota Ativa:
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedLoadId}
                  onChange={(e) => setSelectedLoadId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {sellerLoads.length === 0 ? (
                    <option value="">Nenhuma rota cadastrada</option>
                  ) : (
                    sellerLoads.map((l) => (
                      <option key={l.id} value={l.id}>
                        #{l.code} - {l.vendor_name} ({l.departure_date}) [{l.status === 'em_viagem' ? 'Em Viagem' : 'Fechada'}]
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={reloadData}
                  title="Atualizar Dados"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selected Load Details Card */}
            {currentLoad ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Código da Rota</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      #{currentLoad.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendedor / Motorista</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-slate-500" />
                      {currentLoad.vendor_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Veículo / Saída</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {currentLoad.vehicle || 'Sem veículo'} | {currentLoad.departure_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status da Rota</span>
                    {currentLoad.status === 'em_viagem' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                        <Truck className="w-3.5 h-3.5" />
                        Em Viagem
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                        Fechada ({currentLoad.closed_at ? new Date(currentLoad.closed_at).toLocaleDateString('pt-BR') : ''})
                      </span>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS: NOVA VENDA DA ROTA & EXCLUIR ROTA */}
                <div className="flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  {currentLoad.status === 'em_viagem' && (
                    <button
                      type="button"
                      onClick={handleOpenRouteSaleModal}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition transform active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>🛒 Nova Venda da Rota</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDeleteLoad(currentLoad.id, currentLoad.code, currentLoad.status)}
                      className="px-3.5 py-3 rounded-xl border border-rose-300 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Excluir Rota (Caso de Erro no Lançamento)"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{isProcessing ? 'Excluindo...' : 'Excluir Rota'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhuma rota selecionada. Clique em <strong>"Criar Nova Rota"</strong> para transferir produtos e iniciar uma rota.
              </div>
            )}
          </div>

          {currentLoad && conferenceMetrics && (
            <>
              {/* RESUMO AUTOMÁTICO - BANNER DIFERENCIAL */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl space-y-4 border border-slate-700">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-sm uppercase tracking-wider text-amber-300">
                      Resumo Automático do Acerto de Carga
                    </h3>
                  </div>
                  {conferenceMetrics.isApproved ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/40 flex items-center gap-1">
                      <Check className="w-4 h-4" /> ✔ Conferência Aprovada
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> ⚠️ Diferença Encontrada
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Carga Enviada</span>
                    <span className="text-base font-black text-white">
                      R$ {conferenceMetrics.totalSentValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Vendido</span>
                    <span className="text-base font-black text-emerald-400">
                      R$ {conferenceMetrics.totalSoldValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Devolução Contada</span>
                    <span className="text-base font-black text-blue-300">
                      R$ {conferenceMetrics.totalReturnedCountedValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Dif. de Estoque</span>
                    <span
                      className={`text-base font-black ${
                        conferenceMetrics.totalStockDiffValue === 0
                          ? 'text-slate-300'
                          : conferenceMetrics.totalStockDiffValue < 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      R$ {conferenceMetrics.totalStockDiffValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 col-span-2 md:col-span-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Dif. Financeira</span>
                    <span
                      className={`text-base font-black ${
                        conferenceMetrics.financialDiff === 0
                          ? 'text-slate-300'
                          : conferenceMetrics.financialDiff < 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      R$ {conferenceMetrics.financialDiff.toFixed(2)}
                    </span>
                  </div>
                </div>

                {!conferenceMetrics.isApproved && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold space-y-1">
                    <p className="font-black text-rose-200">⚠ Detalhes das Divergências:</p>
                    {conferenceMetrics.itemsSummary.filter((i) => i.diff !== 0).map((i) => (
                      <p key={i.product_id}>
                        • {i.diff < 0 ? 'Falta' : 'Sobra'}: {Math.abs(i.diff)} {i.unit} de {i.product_name} (Valor est: R$ {Math.abs(i.diffVal).toFixed(2)})
                      </p>
                    ))}
                    {conferenceMetrics.hasFinancialDivergence && (
                      <p>
                        • Diferença Financeira: {conferenceMetrics.financialDiff < 0 ? 'Falta' : 'Sobra'} no caixa de R$ {Math.abs(conferenceMetrics.financialDiff).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* SEÇÃO: VENDAS LANÇADAS NESTA ROTA */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      Vendas Lançadas nesta Rota ({currentLoad.sales?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Registro individual de todas as vendas realizadas durante a rota.
                    </p>
                  </div>

                  {currentLoad.status === 'em_viagem' && (
                    <button
                      type="button"
                      onClick={handleOpenRouteSaleModal}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Venda</span>
                    </button>
                  )}
                </div>

                {!currentLoad.sales || currentLoad.sales.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Nenhuma venda lançada até o momento nesta rota. Clique em <strong>"Nova Venda"</strong> para registrar a primeira venda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">Data / Hora</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3">Pagamento</th>
                          <th className="p-3">Itens</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-center">Comprovante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                        {currentLoad.sales.map((sale) => (
                          <tr key={sale.sale_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {new Date(sale.date).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {sale.customer_name || 'Cliente Balcão'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                sale.payment_method === 'fiado'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                              }`}>
                                {sale.payment_method}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                              {sale.items.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ')}
                            </td>
                            <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                              R$ {sale.total_amount.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setRouteSaleReceipt({
                                    saleId: sale.sale_id,
                                    loadCode: currentLoad.code,
                                    vendorName: currentLoad.vendor_name,
                                    customerName: sale.customer_name || 'Cliente Balcão',
                                    date: new Date(sale.date).toLocaleString('pt-BR'),
                                    paymentMethod: (sale.payment_method || 'dinheiro').toUpperCase(),
                                    items: sale.items,
                                    total: sale.total_amount,
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                title="Ver Comprovante"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* TABELA DE CONFERÊNCIA FÍSICA DE ESTOQUE DO RETORNO */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      4. Conferência do Retorno (Estoque Físico)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Compare o que saiu, o que foi vendido no PDV e digite no campo <strong>Contado</strong> a devolução física.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-right">Saiu</th>
                        <th className="p-3 text-right">Vendido</th>
                        <th className="p-3 text-right">Esperado Voltar</th>
                        <th className="p-3 text-center w-36">Contado (Físico)</th>
                        <th className="p-3 text-right">Diferença</th>
                        <th className="p-3 text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                      {conferenceMetrics.itemsSummary.map((item) => {
                        const isDiff = item.diff !== 0;
                        return (
                          <tr
                            key={item.product_id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                              isDiff ? (item.diff < 0 ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'bg-emerald-50/50 dark:bg-emerald-950/20') : ''
                            }`}
                          >
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 dark:text-white">{item.product_name}</div>
                              <div className="text-[10px] text-slate-400">{item.unit} | R$ {item.unit_price.toFixed(2)} / un</div>
                            </td>

                            <td className="p-3 text-right font-black">
                              {item.initial_qty} {item.unit}
                            </td>

                            <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                              {item.sold_qty} {item.unit}
                            </td>

                            <td className="p-3 text-right font-black text-blue-600 dark:text-blue-400">
                              {item.expectedReturn} {item.unit}
                            </td>

                            <td className="p-3 text-center">
                              {currentLoad.status === 'em_viagem' ? (
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={physicalCounts[item.product_id] ?? item.expectedReturn}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setPhysicalCounts({
                                      ...physicalCounts,
                                      [item.product_id]: val,
                                    });
                                  }}
                                  className={`w-28 text-center px-2 py-1.5 rounded-xl border font-black text-xs ${
                                    isDiff
                                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                  }`}
                                />
                              ) : (
                                <span className="font-black text-slate-900 dark:text-white">
                                  {item.counted} {item.unit}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right font-black">
                              <span
                                className={
                                  item.diff === 0
                                    ? 'text-slate-400'
                                    : item.diff < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }
                              >
                                {item.diff > 0 ? `+${item.diff}` : item.diff} {item.unit}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              {item.diff === 0 ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600">
                                  ✔ Exato
                                </span>
                              ) : item.diff < 0 ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                                  🔴 Falta de {Math.abs(item.diff)} {item.unit}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                                  🔵 Sobra de {item.diff} {item.unit}
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

              {/* CONFERÊNCIA FINANCEIRA DA CARGA */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    7. Conferência Financeira (Caixa da Viagem)
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Total Esperado das Vendas: <strong className="text-emerald-600">R$ {conferenceMetrics.expectedFin.total_sold.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Dinheiro */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">💵 Dinheiro</span>
                    <div className="text-[11px] text-slate-500">
                      Esperado: <strong>R$ {conferenceMetrics.expectedFin.dinheiro.toFixed(2)}</strong>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Recebido Informado:</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={currentLoad.status === 'fechada'}
                        value={actualDinheiro}
                        onChange={(e) => setActualDinheiro(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* PIX */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">📱 PIX</span>
                    <div className="text-[11px] text-slate-500">
                      Esperado: <strong>R$ {conferenceMetrics.expectedFin.pix.toFixed(2)}</strong>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Recebido Informado:</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={currentLoad.status === 'fechada'}
                        value={actualPix}
                        onChange={(e) => setActualPix(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Cartão */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">💳 Cartão</span>
                    <div className="text-[11px] text-slate-500">
                      Esperado: <strong>R$ {conferenceMetrics.expectedFin.cartao.toFixed(2)}</strong>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Recebido Informado:</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={currentLoad.status === 'fechada'}
                        value={actualCartao}
                        onChange={(e) => setActualCartao(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Fiado */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 block">📖 Fiado Lançado</span>
                    <div className="text-[11px] text-slate-500">
                      Cadastrado no Sistema: <strong>R$ {conferenceMetrics.expectedFin.fiado.toFixed(2)}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                      * O fiado é contabilizado no Controle de Fiados da empresa.
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE FECHAMENTO E RELATÓRIO */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalLoad(currentLoad)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center gap-2 shadow"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Relatório Completo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(currentLoad)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {currentLoad.status === 'em_viagem' ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCloseLoad}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isProcessing ? 'Processando Fechamento...' : '6. Fechar Carga e Retornar Estoque'}</span>
                    </button>
                  ) : (
                    isAdmin && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReopenLoad(currentLoad.id)}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Reabrir Carga (Admin)</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- TAB 2: ABERTURA DE NOVA CARGA --- */}
      {activeTab === 'new_load' && (
        <form onSubmit={handleCreateLoadSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                1. Abertura da Carga do Vendedor
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ao confirmar, esses produtos serão baixados imediatamente do estoque principal e transferidos para o vendedor.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Vendedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data da Saída *
                </label>
                <input
                  type="date"
                  required
                  value={newDepartureDate}
                  onChange={(e) => setNewDepartureDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Veículo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fiorino Placa ABC-1234"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* SELEÇÃO E ADIÇÃO DE PRODUTOS Á CARGA */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block uppercase">
                Adicionar Produtos à Carga
              </span>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- Selecione o Produto --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Disp. Estoque: {formatStockDisplay(p, p.current_stock)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="Quantidade"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Incluir Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TABELA DE PRODUTOS NA CARGA */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                Produtos na Carga ({draftItems.length})
              </span>

              {draftItems.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                  Nenhum produto adicionado. Selecione um produto acima e clique em "Incluir Item".
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-right">Quantidade Enviada</th>
                        <th className="p-3 text-right">Estoque Empresa Atual</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                      {draftItems.map((item) => (
                        <tr key={item.product.id}>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900 dark:text-white">{item.product.name}</div>
                          </td>
                          <td className="p-3 text-right font-black text-amber-600 dark:text-amber-400">
                            {item.initialQty} {item.product.main_unit}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {formatStockDisplay(item.product, item.product.current_stock)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(item.product.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                placeholder="Observações adicionais da carga..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('conference')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Enviar Carga (Baixar Estoque)</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* --- TAB 3: HISTÓRICO DE CARGAS --- */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              9. Histórico de Cargas
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar carga..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
                />
              </div>

              <select
                value={historyVendorFilter}
                onChange={(e) => setHistoryVendorFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
              >
                <option value="all">Todos os Vendedores</option>
                {uniqueVendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Data Saída</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3 text-right">Valor Vendido</th>
                  <th className="p-3 text-right">Dif. Financeira</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Nenhuma carga encontrada no histórico.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-black text-blue-600 dark:text-blue-400">
                        #{l.code}
                      </td>
                      <td className="p-3">{l.departure_date}</td>
                      <td className="p-3 font-extrabold text-slate-900 dark:text-white">{l.vendor_name}</td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        R$ {(l.expected_financial?.total_sold || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-black">
                        <span className={l.financial_diff === 0 ? 'text-slate-400' : 'text-rose-600'}>
                          R$ {(l.financial_diff || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {l.status === 'em_viagem' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            🚚 Em Viagem
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🔒 Fechada
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedLoadId(l.id);
                              setActiveTab('conference');
                            }}
                            title="Abrir Conferência"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setReportModalLoad(l)}
                            title="Ver Relatório"
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {l.status === 'fechada' && isAdmin && (
                            <button
                              onClick={() => handleReopenLoad(l.id)}
                              title="Reabrir Carga"
                              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteLoad(l.id, l.code, l.status)}
                              title="Excluir Rota (Erro de Lançamento)"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL DE RELATÓRIO COMPLETO E IMPRESSÃO DA CARGA --- */}
      {reportModalLoad && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-6 my-8 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  8. Relatório da Carga #{reportModalLoad.code}
                </h3>
              </div>
              <button
                onClick={() => setReportModalLoad(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE AREA */}
            <div id="printable-seller-load-report" className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
                <div>
                  <strong className="text-slate-400 block uppercase text-[10px]">Vendedor:</strong>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{reportModalLoad.vendor_name}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block uppercase text-[10px]">Veículo:</strong>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{reportModalLoad.vehicle || 'Não informado'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block uppercase text-[10px]">Data Saída:</strong>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{reportModalLoad.departure_date}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block uppercase text-[10px]">Status:</strong>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {reportModalLoad.status === 'em_viagem' ? 'Em Viagem' : 'Fechada / Concluída'}
                  </span>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Produto</th>
                      <th className="p-2 text-right">Enviado</th>
                      <th className="p-2 text-right">Vendido</th>
                      <th className="p-2 text-right">Devolvido</th>
                      <th className="p-2 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {reportModalLoad.items.map((item) => (
                      <tr key={item.product_id}>
                        <td className="p-2 font-bold">{item.product_name}</td>
                        <td className="p-2 text-right">{item.initial_qty} {item.unit}</td>
                        <td className="p-2 text-right text-emerald-600 font-bold">{item.sold_qty} {item.unit}</td>
                        <td className="p-2 text-right text-blue-600 font-bold">{item.counted_qty ?? (item.initial_qty - item.sold_qty)} {item.unit}</td>
                        <td className="p-2 text-right font-black">
                          {item.diff_qty ? (
                            <span className={item.diff_qty < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {item.diff_qty > 0 ? `+${item.diff_qty}` : item.diff_qty} {item.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <strong className="text-slate-700 dark:text-slate-300 font-black block uppercase">Totais Financeiros:</strong>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                    <span className="text-[10px] text-slate-400 block">Total Vendido</span>
                    <strong className="text-sm font-black text-emerald-600">R$ {(reportModalLoad.expected_financial?.total_sold || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                    <span className="text-[10px] text-slate-400 block">Dinheiro / PIX / Cartão</span>
                    <strong className="text-sm font-black text-slate-800 dark:text-slate-200">
                      R$ ${((reportModalLoad.expected_financial?.dinheiro || 0) + (reportModalLoad.expected_financial?.pix || 0) + (reportModalLoad.expected_financial?.cartao || 0)).toFixed(2)}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                    <span className="text-[10px] text-slate-400 block">Fiado</span>
                    <strong className="text-sm font-black text-amber-600">R$ {(reportModalLoad.expected_financial?.fiado || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border">
                    <span className="text-[10px] text-slate-400 block">Diferença Financeira</span>
                    <strong className={`text-sm font-black ${(reportModalLoad.financial_diff || 0) === 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                      R$ ${(reportModalLoad.financial_diff || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO RELATÓRIO */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(reportModalLoad)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalLoad(null)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA VENDA DA ROTA */}
      {isRouteSaleModalOpen && currentLoad && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Nova Venda na Rota #{currentLoad.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vendedor: <strong>{currentLoad.vendor_name}</strong> | Consumindo do estoque temporário da rota
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRouteSaleModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRouteSale} className="space-y-4">
              {/* Seleção do Cliente */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block uppercase">
                  1. Cliente / Comprador
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) setCustomCustomerName('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- Cliente Não Cadastrado / Avulso --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.document ? `(${c.document})` : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedCustomerId && (
                    <input
                      type="text"
                      placeholder="Nome do Cliente (ex: Mercearia do Zé)"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* Adicionar Produto da Rota ao Carrinho */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block uppercase">
                  2. Adicionar Produtos do Estoque da Rota
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <select
                      value={routeSaleProductId}
                      onChange={(e) => setRouteSaleProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                    >
                      <option value="">-- Selecione o Produto da Rota --</option>
                      {currentLoad.items.map((item) => {
                        const available = Math.max(0, item.initial_qty - item.sold_qty);
                        return (
                          <option key={item.product_id} value={item.product_id} disabled={available <= 0}>
                            {item.product_name} (Disp. Rota: {available} {item.unit})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="Qtd"
                      value={routeSaleQty}
                      onChange={(e) => setRouteSaleQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddProductToRouteCart}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Incluir</span>
                    </button>
                  </div>
                </div>

                {routeSaleProductId && (
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-[11px] font-bold text-slate-500">Preço Unitário R$:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={routeSaleUnitPrice}
                      onChange={(e) => setRouteSaleUnitPrice(e.target.value)}
                      className="w-32 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs text-emerald-600"
                    />
                  </div>
                )}
              </div>

              {/* Lista de Itens no Carrinho da Venda */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                  Itens da Venda ({routeCart.length})
                </span>
                {routeCart.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                    Nenhum item no carrinho. Selecione um produto da rota acima e clique em "Incluir".
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2">Produto</th>
                          <th className="p-2 text-right">Qtd</th>
                          <th className="p-2 text-right">Preço Un.</th>
                          <th className="p-2 text-right">Subtotal</th>
                          <th className="p-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                        {routeCart.map((item) => (
                          <tr key={item.product_id}>
                            <td className="p-2 font-bold">{item.product_name}</td>
                            <td className="p-2 text-right">{item.quantity} {item.unit}</td>
                            <td className="p-2 text-right">R$ {item.unit_price.toFixed(2)}</td>
                            <td className="p-2 text-right font-black text-emerald-600">
                              R$ {(item.quantity * item.unit_price).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRouteCartItem(item.product_id)}
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block uppercase">
                  3. Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setRouteSalePaymentMethod('dinheiro')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition ${
                      routeSalePaymentMethod === 'dinheiro'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRouteSalePaymentMethod('pix')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition ${
                      routeSalePaymentMethod === 'pix'
                        ? 'bg-teal-600 text-white border-teal-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRouteSalePaymentMethod('cartao')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition ${
                      routeSalePaymentMethod === 'cartao'
                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRouteSalePaymentMethod('fiado')}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition ${
                      routeSalePaymentMethod === 'fiado'
                        ? 'bg-amber-600 text-white border-amber-600 shadow'
                        : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>📖 Fiado</span>
                  </button>
                </div>

                {/* Se for Fiado */}
                {routeSalePaymentMethod === 'fiado' && (
                  <div className="pt-2 grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Parcelas</label>
                      <select
                        value={routeSaleInstallments}
                        onChange={(e) => setRouteSaleInstallments(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      >
                        <option value={1}>1x à vista no Fiado</option>
                        <option value={2}>2x parcelas</option>
                        <option value={3}>3x parcelas</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Data 1º Vencimento</label>
                      <input
                        type="date"
                        value={routeSaleDueDate}
                        onChange={(e) => setRouteSaleDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Total e Confirmação */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total da Venda</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    R$ {routeCart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRouteSaleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finalizar Venda na Rota</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE COMPROVANTE DA VENDA NA ROTA */}
      {routeSaleReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Comprovante de Venda em Rota</h3>
              <p className="text-xs text-slate-500">Rota #{routeSaleReceipt.loadCode} - {routeSaleReceipt.vendorName}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-900 dark:text-white">{routeSaleReceipt.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data/Hora:</span>
                <span className="text-slate-800 dark:text-slate-200">{routeSaleReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pagamento:</span>
                <strong className="text-emerald-600">{routeSaleReceipt.paymentMethod}</strong>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-slate-500 font-sans font-bold block">Itens Vendidos:</span>
                {routeSaleReceipt.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>{i.quantity}x {i.product_name}</span>
                    <span>R$ {i.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-300 dark:border-slate-600 flex justify-between font-extrabold text-sm font-sans">
                <span>TOTAL:</span>
                <span className="text-emerald-600">R$ {routeSaleReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `*COMPROVANTE DE VENDA EM ROTA*\n*Rota:* #${routeSaleReceipt.loadCode}\n*Vendedor:* ${routeSaleReceipt.vendorName}\n*Cliente:* ${routeSaleReceipt.customerName}\n*Data:* ${routeSaleReceipt.date}\n*Pagamento:* ${routeSaleReceipt.paymentMethod}\n*Total:* R$ ${routeSaleReceipt.total.toFixed(2)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setRouteSaleReceipt(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRMATION MODAL (Replaces iframe-blocked native confirm) --- */}
      {confirmModalConfig.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                confirmModalConfig.actionType === 'delete'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400'
                  : confirmModalConfig.actionType === 'reopen'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
              }`}>
                {confirmModalConfig.actionType === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmModalConfig.actionType === 'reopen' ? (
                  <Unlock className="w-6 h-6" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {confirmModalConfig.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirme a operação para prosseguir
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
              {confirmModalConfig.message}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={executeConfirmAction}
                className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-lg transition flex items-center gap-2 ${
                  confirmModalConfig.actionType === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : confirmModalConfig.actionType === 'reopen'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {isProcessing ? 'Processando...' : 'Sim, Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
