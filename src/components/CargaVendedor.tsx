/**
 * Chronix ERP - Carga do Vendedor / Conferência Diária de Estoque e Caixa
 * Módulo gerencial para validação física de estoque, vendas e recebimentos do dia.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Calendar,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  DollarSign,
  Printer,
  Share2,
  Save,
  RotateCcw,
  FileText,
  Search,
  Check,
  Building2,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Users,
  Package,
  History,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  Product,
  Movement,
  User,
  DailyConference,
  DailyConferenceStockItem,
  DailyConferenceFinancial,
  FiadoSale,
  PreSale,
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
  movements,
  currentUser,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'conference' | 'history'>('conference');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchProduct, setSearchProduct] = useState('');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);

  // Storage data
  const [pastConferences, setPastConferences] = useState<DailyConference[]>([]);
  
  // Conference State for current selected date
  const [conferenceId, setConferenceId] = useState<string>('');
  const [status, setStatus] = useState<'em_aberto' | 'fechada'>('em_aberto');
  const [closedAt, setClosedAt] = useState<string | undefined>(undefined);
  const [operatorName, setOperatorName] = useState<string>(currentUser.name);
  const [notes, setNotes] = useState<string>('');

  // Physical stock counts: product_id -> counted qty
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  // Physical money counts
  const [actualDinheiro, setActualDinheiro] = useState<number>(0);
  const [actualPix, setActualPix] = useState<number>(0);
  const [actualCartao, setActualCartao] = useState<number>(0);

  // Selected history item for modal / detailed view
  const [viewHistoryItem, setViewHistoryItem] = useState<DailyConference | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  // Load conferences from storage
  const loadConferences = () => {
    const list = storage.getDailyConferences();
    setPastConferences(list);
  };

  useEffect(() => {
    loadConferences();
  }, []);

  // Compute movements, pre-sales and fiados for selected date
  const dateMovements = useMemo(() => {
    return movements.filter((m) => m.date.startsWith(selectedDate));
  }, [movements, selectedDate]);

  const fiadoSales = useMemo(() => {
    const allFiados: FiadoSale[] = storage.getFiadoSales();
    return allFiados.filter((f) => f.created_at.startsWith(selectedDate) && (f.status as string) !== 'cancelado');
  }, [selectedDate]);

  const preSales = useMemo(() => {
    const allPreSales: PreSale[] = storage.getPreSales();
    return allPreSales.filter((p) => p.date.startsWith(selectedDate) && p.status !== 'cancelada');
  }, [selectedDate]);

  // Aggregate stats for selectedDate
  const aggregatedData = useMemo(() => {
    let entriesCount = 0;
    let exitsCount = 0;
    let totalSoldAmount = 0;
    let expectedDinheiro = 0;
    let expectedPix = 0;
    let expectedCartao = 0;
    let expectedFiado = 0;
    let salesCount = 0;
    const clientSet = new Set<string>();
    let productsSoldCount = 0;

    // Movement counts and totals
    dateMovements.forEach((m) => {
      if (m.type === 'entrada') {
        entriesCount++;
      } else if (m.type === 'saida') {
        exitsCount++;
        productsSoldCount += m.used_qty;
      }
    });

    // Fiado sales totals
    fiadoSales.forEach((f) => {
      salesCount++;
      totalSoldAmount += f.total_amount;
      expectedFiado += f.total_amount;
      if (f.customer_name) clientSet.add(f.customer_name);
    });

    // Pre-sales and other sales movements
    dateMovements
      .filter((m) => m.type === 'saida' && (m.origin === 'pdv' || m.origin === 'venda_rapida'))
      .forEach((m) => {
        salesCount++;
        const itemTotal = (m.used_qty || 0) * (m.unit_price || 0);
        totalSoldAmount += itemTotal;
        const method = m.payment_method || 'dinheiro';
        if (method === 'dinheiro') expectedDinheiro += itemTotal;
        else if (method === 'pix') expectedPix += itemTotal;
        else if (method === 'cartao_credito' || method === 'cartao_debito' || method === 'cartao') expectedCartao += itemTotal;
        else if (method === 'fiado') expectedFiado += itemTotal;
        else expectedDinheiro += itemTotal; // default
      });

    // Calculate per product stock stats
    const stockItems: DailyConferenceStockItem[] = products.map((p) => {
      const prodEntries = dateMovements
        .filter((m) => m.product_id === p.id && m.type === 'entrada')
        .reduce((acc, curr) => acc + (curr.used_qty || 0), 0);

      const prodExits = dateMovements
        .filter((m) => m.product_id === p.id && m.type === 'saida')
        .reduce((acc, curr) => acc + (curr.used_qty || 0), 0);

      const expected = p.current_stock;
      const initial = expected - prodEntries + prodExits;

      const physical = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : expected;
      const diff = physical - expected;
      const cost = p.unit_price || p.sale_price || 0;
      const diffValue = diff * cost;

      return {
        product_id: p.id,
        product_name: p.name,
        unit: p.main_unit,
        initial_stock: initial,
        entries_today: prodEntries,
        exits_today: prodExits,
        expected_stock: expected,
        physical_stock: physical,
        diff_stock: diff,
        cost_price: cost,
        estimated_diff_value: diffValue,
      };
    });

    return {
      entriesCount,
      exitsCount,
      totalSoldAmount,
      expectedDinheiro,
      expectedPix,
      expectedCartao,
      expectedFiado,
      salesCount: salesCount || dateMovements.filter((m) => m.type === 'saida').length,
      clientsServedCount: clientSet.size || (dateMovements.filter((m) => m.type === 'saida').length > 0 ? 1 : 0),
      productsSoldCount,
      stockItems,
    };
  }, [dateMovements, fiadoSales, products, physicalCounts, selectedDate]);

  // Sync state when selectedDate or pastConferences change
  useEffect(() => {
    const existing = pastConferences.find((c) => c.date === selectedDate);
    if (existing) {
      setConferenceId(existing.id);
      setStatus(existing.status);
      setClosedAt(existing.closed_at);
      setOperatorName(existing.operator_name || currentUser.name);
      setNotes(existing.notes || '');

      // Load saved physical stock counts
      const counts: Record<string, number> = {};
      existing.stock_items.forEach((item) => {
        counts[item.product_id] = item.physical_stock;
      });
      setPhysicalCounts(counts);

      // Load saved financial counts
      setActualDinheiro(existing.financial.actual_dinheiro);
      setActualPix(existing.financial.actual_pix);
      setActualCartao(existing.financial.actual_cartao);
    } else {
      setConferenceId(`conf-${Date.now()}`);
      setStatus('em_aberto');
      setClosedAt(undefined);
      setOperatorName(currentUser.name);
      setNotes('');

      // Initialize physical counts to expected stock
      const initialCounts: Record<string, number> = {};
      products.forEach((p) => {
        initialCounts[p.id] = p.current_stock;
      });
      setPhysicalCounts(initialCounts);

      // Initialize financial actuals
      setActualDinheiro(aggregatedData.expectedDinheiro);
      setActualPix(aggregatedData.expectedPix);
      setActualCartao(aggregatedData.expectedCartao);
    }
  }, [selectedDate, pastConferences]);

  // Handle physical stock input
  const handlePhysicalChange = (productId: string, val: string) => {
    if (status === 'fechada' && !isAdmin) return;
    const num = parseFloat(val) || 0;
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: num,
    }));
  };

  // Quick fill all physical stock as expected
  const handleEqualizeAllStock = () => {
    if (status === 'fechada' && !isAdmin) return;
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.id] = p.current_stock;
    });
    setPhysicalCounts(counts);
  };

  // Financial differences
  const diffDinheiro = actualDinheiro - aggregatedData.expectedDinheiro;
  const diffPix = actualPix - aggregatedData.expectedPix;
  const diffCartao = actualCartao - aggregatedData.expectedCartao;
  const totalFinancialDiff = diffDinheiro + diffPix + diffCartao;

  // Stock differences sum
  const totalStockLossValue = aggregatedData.stockItems
    .filter((i) => i.diff_stock < 0)
    .reduce((acc, curr) => acc + Math.abs(curr.estimated_diff_value), 0);

  const totalStockGainValue = aggregatedData.stockItems
    .filter((i) => i.diff_stock > 0)
    .reduce((acc, curr) => acc + curr.estimated_diff_value, 0);

  // Filtered Stock List for Display
  const filteredStockItems = useMemo(() => {
    return aggregatedData.stockItems.filter((item) => {
      const matchSearch = item.product_name.toLowerCase().includes(searchProduct.toLowerCase());
      const matchDiff = showOnlyDiffs ? item.diff_stock !== 0 : true;
      return matchSearch && matchDiff;
    });
  }, [aggregatedData.stockItems, searchProduct, showOnlyDiffs]);

  // Save or Close Conference
  const handleSaveConference = (newStatus: 'em_aberto' | 'fechada') => {
    if (newStatus === 'fechada' && !isAdmin) {
      alert('Apenas administradores podem fechar e encerrar a conferência diária.');
      return;
    }

    const financial: DailyConferenceFinancial = {
      total_sold: aggregatedData.totalSoldAmount,
      expected_dinheiro: aggregatedData.expectedDinheiro,
      expected_pix: aggregatedData.expectedPix,
      expected_cartao: aggregatedData.expectedCartao,
      expected_fiado: aggregatedData.expectedFiado,
      actual_dinheiro: actualDinheiro,
      actual_pix: actualPix,
      actual_cartao: actualCartao,
      diff_dinheiro: diffDinheiro,
      diff_pix: diffPix,
      diff_cartao: diffCartao,
      total_financial_diff: totalFinancialDiff,
    };

    const conference: DailyConference = {
      id: conferenceId || `conf-${Date.now()}`,
      date: selectedDate,
      closed_at: newStatus === 'fechada' ? new Date().toISOString() : closedAt,
      operator_id: currentUser.id,
      operator_name: currentUser.name,
      status: newStatus,
      total_entries_count: aggregatedData.entriesCount,
      total_exits_count: aggregatedData.exitsCount,
      total_sold_amount: aggregatedData.totalSoldAmount,
      total_received_amount: actualDinheiro + actualPix + actualCartao,
      sales_count: aggregatedData.salesCount,
      clients_served_count: aggregatedData.clientsServedCount,
      products_sold_count: aggregatedData.productsSoldCount,
      stock_items: aggregatedData.stockItems,
      total_stock_loss_value: totalStockLossValue,
      total_stock_gain_value: totalStockGainValue,
      financial,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    storage.saveDailyConference(conference);
    setStatus(newStatus);
    if (newStatus === 'fechada') {
      setClosedAt(conference.closed_at);
    }
    loadConferences();
    onRefresh();

    alert(
      newStatus === 'fechada'
        ? 'Conferência diária encerrada e fechada com sucesso!'
        : 'Rascunho da conferência salvo com sucesso.'
    );
  };

  // Reopen conference (Admin only)
  const handleReopenConference = () => {
    if (!isAdmin) return;
    if (window.confirm('Deseja reabrir esta conferência diária para edições?')) {
      handleSaveConference('em_aberto');
    }
  };

  // Generate WhatsApp Share Message
  const getWhatsAppMessage = (conf?: DailyConference) => {
    const d = conf?.date || selectedDate;
    const op = conf?.operator_name || currentUser.name;
    const totSold = conf ? conf.financial.total_sold : aggregatedData.totalSoldAmount;
    const recDinheiro = conf ? conf.financial.actual_dinheiro : actualDinheiro;
    const recPix = conf ? conf.financial.actual_pix : actualPix;
    const recCartao = conf ? conf.financial.actual_cartao : actualCartao;
    const finDiff = conf ? conf.financial.total_financial_diff : totalFinancialDiff;
    const stLoss = conf ? conf.total_stock_loss_value : totalStockLossValue;
    const obs = conf ? conf.notes : notes;

    const msg = `*RESUMO DA CARGA E CONFERÊNCIA DIÁRIA - CHRONIX ERP* 📊
*Data:* ${d.split('-').reverse().join('/')}
*Operador:* ${op}
*Status:* ${conf?.status === 'fechada' ? 'FECHADA ✅' : 'EM ABERTO ⏳'}

💰 *FINANCEIRO:*
- Total Vendido: R$ ${totSold.toFixed(2)}
- Recebido Dinheiro: R$ ${recDinheiro.toFixed(2)}
- Recebido PIX: R$ ${recPix.toFixed(2)}
- Recebido Cartão: R$ ${recCartao.toFixed(2)}
- Diferença Caixa: R$ ${finDiff.toFixed(2)} ${finDiff < 0 ? '❌ (FALTA)' : finDiff > 0 ? '⚠️ (SOBRA)' : '✅ (EXATO)'}

📦 *ESTOQUE:*
- Perdas/Divergências Estimadas: R$ ${stLoss.toFixed(2)}

📝 *Observações:* ${obs || 'Nenhuma'}

_Gerado por Chronix ERP_`;

    return encodeURIComponent(msg);
  };

  const handleOpenWhatsApp = (conf?: DailyConference) => {
    const text = getWhatsAppMessage(conf);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold mb-2 border border-blue-400/20 backdrop-blur-sm">
              <Boxes className="w-3.5 h-3.5" />
              <span>Conferência & Carga do Vendedor</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Validação de Estoque e Fechamento do Dia
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Confira os saldos físicos, totalize vendas e recebimentos em Dinheiro, PIX e Cartão, e encerre o caixa diário sem duplicação de dados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('conference')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                activeTab === 'conference'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Conferência do Dia</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico ({pastConferences.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Conference View */}
      {activeTab === 'conference' && (
        <div className="space-y-6">
          {/* Controls Bar: Date Selector & Status Indicator */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-500 uppercase">Data:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-extrabold text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
                />
              </div>

              {/* Status Badge */}
              {status === 'fechada' ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>CONFERÊNCIA FECHADA</span>
                  {closedAt && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                      ({new Date(closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black flex items-center gap-1.5 shadow-xs">
                  <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>EM ABERTO</span>
                </div>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenWhatsApp()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Compartilhar resumo via WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                title="Imprimir conferência"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              {status === 'em_aberto' && (
                <>
                  <button
                    onClick={() => handleSaveConference('em_aberto')}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Rascunho</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleSaveConference('fechada')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-98"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Fechar Conferência</span>
                    </button>
                  )}
                </>
              )}

              {status === 'fechada' && isAdmin && (
                <button
                  onClick={handleReopenConference}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Reabrir Conferência</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Vendas no Dia</span>
                <ShoppingCart className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white block">
                  R$ {aggregatedData.totalSoldAmount.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                  {aggregatedData.salesCount} pedido(s) • {aggregatedData.clientsServedCount} cliente(s)
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Movimentações</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-600">
                  +{aggregatedData.entriesCount}
                </span>
                <span className="text-xs text-slate-400">entradas</span>
                <span className="text-xl font-black text-rose-600 ml-2">
                  -{aggregatedData.exitsCount}
                </span>
                <span className="text-xs text-slate-400">saídas</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Diferença Caixa</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <span
                  className={`text-2xl font-black block ${
                    totalFinancialDiff < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : totalFinancialDiff > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  R$ {totalFinancialDiff.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                  {totalFinancialDiff < 0 ? 'Falta no Caixa' : totalFinancialDiff > 0 ? 'Sobra no Caixa' : 'Caixa Exato'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Diferença Estoque</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <span
                  className={`text-2xl font-black block ${
                    totalStockLossValue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  R$ {totalStockLossValue.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                  {totalStockLossValue > 0 ? 'Perda / Avaria Estimada' : 'Sem Divergência de Estoque'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Stock Physical Conference */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>1. Conferência Física de Estoque</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compare o Estoque Esperado do Sistema com a Contagem Física e registre as divergências.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEqualizeAllStock}
                  disabled={status === 'fechada' && !isAdmin}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50"
                  title="Copiar Estoque Esperado para a Contagem Física de todos os produtos"
                >
                  Marcar Tudo Sem Diferença
                </button>

                <button
                  onClick={() => setShowOnlyDiffs(!showOnlyDiffs)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    showOnlyDiffs
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {showOnlyDiffs ? 'Exibindo Apenas Divergências' : 'Filtrar Divergências'}
                </button>
              </div>
            </div>

            {/* Search input for products */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar produto na conferência..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Stock Conference Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3">Estoque Inicial</th>
                    <th className="py-2.5 px-3 text-emerald-600">+ Entradas</th>
                    <th className="py-2.5 px-3 text-rose-600">- Saídas</th>
                    <th className="py-2.5 px-3 font-black text-blue-600">Estoque Esperado</th>
                    <th className="py-2.5 px-3">Estoque Físico Contado</th>
                    <th className="py-2.5 px-3 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {filteredStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 text-xs">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredStockItems.map((item) => {
                      const hasDiff = item.diff_stock !== 0;
                      return (
                        <tr
                          key={item.product_id}
                          className={`transition ${
                            hasDiff
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                            {item.product_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {item.initial_stock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-600 font-bold">
                            +{item.entries_today}
                          </td>
                          <td className="py-2.5 px-3 text-rose-600 font-bold">
                            -{item.exits_today}
                          </td>
                          <td className="py-2.5 px-3 font-black text-blue-600 dark:text-blue-400 text-sm">
                            {item.expected_stock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 max-w-[120px]">
                              <input
                                type="number"
                                step="any"
                                disabled={status === 'fechada' && !isAdmin}
                                value={item.physical_stock}
                                onChange={(e) => handlePhysicalChange(item.product_id, e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-sm font-black text-center outline-none transition ${
                                  hasDiff
                                    ? 'border-rose-400 bg-white text-rose-700 font-black'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {hasDiff ? (
                              <div>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-black text-xs inline-block ${
                                    item.diff_stock < 0
                                      ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200'
                                      : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                                  }`}
                                >
                                  {item.diff_stock > 0 ? `+${item.diff_stock}` : item.diff_stock} {item.unit}
                                </span>
                                <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                                  {item.diff_stock < 0 ? 'Falta / Perda' : 'Sobra'} (R$ {Math.abs(item.estimated_diff_value).toFixed(2)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-extrabold text-xs flex items-center justify-end gap-1">
                                <Check className="w-3.5 h-3.5" /> Exato
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Financial Conference (Caixa / Recebimentos) */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>2. Conferência Financeira e Fechamento de Caixa</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Validação entre os valores vendidos no sistema e o dinheiro/comprovantes contados fisicamente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dinheiro */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    💵 Dinheiro em Espécie
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Sist: R$ {aggregatedData.expectedDinheiro.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Valor Contado no Gaveteiro:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={status === 'fechada' && !isAdmin}
                      value={actualDinheiro}
                      onChange={(e) => setActualDinheiro(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Diferença Dinheiro:</span>
                  <span
                    className={`font-black ${
                      diffDinheiro < 0 ? 'text-rose-600' : diffDinheiro > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    R$ {diffDinheiro.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* PIX */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    ⚡ Recebimentos PIX
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Sist: R$ {aggregatedData.expectedPix.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Comprovantes / Extrato PIX:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={status === 'fechada' && !isAdmin}
                      value={actualPix}
                      onChange={(e) => setActualPix(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Diferença PIX:</span>
                  <span
                    className={`font-black ${
                      diffPix < 0 ? 'text-rose-600' : diffPix > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    R$ {diffPix.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Cartões */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    💳 Cartões Débito / Crédito
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Sist: R$ {aggregatedData.expectedCartao.toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Relatório Maquininha Cartão:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={status === 'fechada' && !isAdmin}
                      value={actualCartao}
                      onChange={(e) => setActualCartao(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-black text-base text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Diferença Cartão:</span>
                  <span
                    className={`font-black ${
                      diffCartao < 0 ? 'text-rose-600' : diffCartao > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    R$ {diffCartao.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fiado info box */}
            {aggregatedData.expectedFiado > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>
                    <strong>Vendas a Prazo / Fiado no Dia:</strong> R$ {aggregatedData.expectedFiado.toFixed(2)} (Lançadas em Contas a Receber)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Observações e Justificativas */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>3. Observações e Justificativas do Fechamento</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registre informações Relevantes, motivos de divergências de estoque, avarias ou notas do operador.
            </p>

            <textarea
              rows={3}
              disabled={status === 'fechada' && !isAdmin}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Avaria em 2 unidades de queijo mussarela no transporte. Troco faltante no início do dia de R$ 5,00..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Bottom Action Footer */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">
                Resumo da Conferência: {selectedDate.split('-').reverse().join('/')}
              </span>
              <span className="text-sm font-extrabold text-white block mt-0.5">
                Total Recebido: R$ {(actualDinheiro + actualPix + actualCartao).toFixed(2)} |
                Diferença Geral: <span className={totalFinancialDiff < 0 ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>R$ {totalFinancialDiff.toFixed(2)}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {status === 'em_aberto' && (
                <>
                  <button
                    onClick={() => handleSaveConference('em_aberto')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                  >
                    Salvar Rascunho
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleSaveConference('fechada')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Encerrar e Fechar Conferência</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Histórico de Conferências Diárias Fechadas</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registro permanente dos fechamentos de estoque e caixa anteriores.
              </p>
            </div>
          </div>

          {pastConferences.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhuma conferência diária salva no histórico ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Operador</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Total Vendido</th>
                    <th className="py-3 px-3">Diferença Caixa</th>
                    <th className="py-3 px-3">Perda Estoque</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {pastConferences.map((conf) => (
                    <tr key={conf.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white text-sm">
                        {conf.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {conf.operator_name}
                      </td>
                      <td className="py-3 px-3">
                        {conf.status === 'fechada' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Fechada
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] inline-flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Em Aberto
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                        R$ {conf.financial.total_sold.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-3 font-black ${
                          conf.financial.total_financial_diff < 0
                            ? 'text-rose-600'
                            : conf.financial.total_financial_diff > 0
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        R$ {conf.financial.total_financial_diff.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600">
                        R$ {conf.total_stock_loss_value.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedDate(conf.date);
                              setActiveTab('conference');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition"
                          >
                            Abrir / Ver
                          </button>

                          <button
                            onClick={() => handleOpenWhatsApp(conf)}
                            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                            title="Compartilhar WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Excluir conferência do dia ${conf.date}?`)) {
                                  storage.deleteDailyConference(conf.id);
                                  loadConferences();
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
