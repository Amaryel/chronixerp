/**
 * Aquinos Frios - Reports & Exports Component
 * Relatórios completos de Estoques, Entradas, Saídas, Vendas por Forma de Pagamento e Fiados.
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  Package,
  AlertTriangle,
  Boxes,
  Clock,
  CircleDollarSign,
  CreditCard,
  BookOpenCheck,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Users,
} from 'lucide-react';
import { Product, Batch, Movement, Category, FiadoSale, FiadoPayment, Customer } from '../types';
import { exportToPDF, exportToExcel, exportToCSV, printReport } from '../lib/exportUtils';
import { formatStockDisplay } from '../lib/unitConverter';
import { storage } from '../services/storage';

interface ReportsProps {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  categories: Category[];
}

type PeriodFilter = 'all' | 'today' | '7days' | 'month' | 'custom';

export const Reports: React.FC<ReportsProps> = ({
  products,
  batches,
  movements,
  categories,
}) => {
  const [activeReport, setActiveReport] = useState<
    'current_stock' | 'movements' | 'sales_payment' | 'fiado_summary' | 'expiry'
  >('current_stock');

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [appliedPeriod, setAppliedPeriod] = useState<PeriodFilter>('month');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');

  // Load sales, fiado payments, and customers from storage
  const allSales: FiadoSale[] = useMemo(() => storage.getFiadoSales(), [movements]);
  const allFiadoPayments: FiadoPayment[] = useMemo(() => storage.getFiadoPayments(), [movements]);
  const customers: Customer[] = useMemo(() => storage.getCustomers(), [movements]);

  const handleApplyFilter = (p?: PeriodFilter, s?: string, e?: string) => {
    const targetPeriod = p !== undefined ? p : period;
    const targetStart = s !== undefined ? s : startDate;
    const targetEnd = e !== undefined ? e : endDate;

    setAppliedPeriod(targetPeriod);
    setAppliedStartDate(targetStart);
    setAppliedEndDate(targetEnd);
  };

  // Helper date filter
  const isDateInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);

    if (appliedPeriod === 'custom' || appliedStartDate || appliedEndDate) {
      if (appliedStartDate) {
        const start = new Date(appliedStartDate + 'T00:00:00');
        if (date < start) return false;
      }
      if (appliedEndDate) {
        const end = new Date(appliedEndDate + 'T23:59:59');
        if (date > end) return false;
      }
      return true;
    }

    if (appliedPeriod === 'all') return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (appliedPeriod === 'today') {
      return date >= startOfToday;
    }

    if (appliedPeriod === '7days') {
      const d7 = new Date(startOfToday.getTime() - 7 * 86400000);
      return date >= d7;
    }

    if (appliedPeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }

    return true;
  };

  // Filtered datasets
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => isDateInPeriod(m.date));
  }, [movements, appliedPeriod, appliedStartDate, appliedEndDate]);

  const filteredSales = useMemo(() => {
    return allSales.filter((s) => isDateInPeriod(s.date));
  }, [allSales, appliedPeriod, appliedStartDate, appliedEndDate]);

  const filteredFiadoPayments = useMemo(() => {
    return allFiadoPayments.filter((p) => isDateInPeriod(p.date));
  }, [allFiadoPayments, appliedPeriod, appliedStartDate, appliedEndDate]);

  // Calculations for Stock Report
  const stockValuation = useMemo(() => {
    let totalCost = 0;
    let totalSale = 0;
    let totalItemsCount = 0;

    products.forEach((p) => {
      const costPrice = p.cost_price || p.unit_price || 0;
      const salePrice = p.sale_price || p.unit_price || 0;
      totalCost += p.current_stock * costPrice;
      totalSale += p.current_stock * salePrice;
      totalItemsCount += p.current_stock;
    });

    const projectedProfit = totalSale - totalCost;

    return { totalCost, totalSale, projectedProfit, totalItemsCount };
  }, [products]);

  // Calculations for Sales by Payment Method
  const salesSummary = useMemo(() => {
    let totalDinheiro = 0;
    let totalPix = 0;
    let totalCartao = 0;
    let totalFiado = 0;
    let totalOverall = 0;
    let totalDiscounts = 0;

    filteredSales.forEach((s) => {
      totalOverall += s.total_amount;
      totalDiscounts += s.discount_amount || 0;

      if (s.payment_method === 'dinheiro') totalDinheiro += s.total_amount;
      else if (s.payment_method === 'pix') totalPix += s.total_amount;
      else if (s.payment_method === 'cartao') totalCartao += s.total_amount;
      else if (s.payment_method === 'fiado') totalFiado += s.total_amount;
    });

    const ticketMedio = filteredSales.length > 0 ? totalOverall / filteredSales.length : 0;

    return {
      totalOverall,
      totalDinheiro,
      totalPix,
      totalCartao,
      totalFiado,
      totalDiscounts,
      ticketMedio,
      count: filteredSales.length,
    };
  }, [filteredSales]);

  // Calculations for Fiado Report
  const fiadoSummary = useMemo(() => {
    let totalPendingBalance = 0;
    let totalClientsWithDebt = 0;

    customers.forEach((c) => {
      if (c.total_debt > 0) {
        totalPendingBalance += c.total_debt;
        totalClientsWithDebt += 1;
      }
    });

    const totalReceivedInPeriod = filteredFiadoPayments.reduce((sum, p) => sum + p.received_amount, 0);

    return {
      totalPendingBalance,
      totalClientsWithDebt,
      totalReceivedInPeriod,
    };
  }, [customers, filteredFiadoPayments]);

  // Generate Dataset for Active Report (Exports)
  const getReportData = () => {
    if (activeReport === 'current_stock') {
      return {
        title: 'Relatório de Estoque e Valoração de Produtos',
        subtitle: `Total: ${products.length} cadastros | Valoração em Venda: R$ ${stockValuation.totalSale.toFixed(2)}`,
        columns: [
          { header: 'Produto', key: 'name' },
          { header: 'Marca', key: 'brand' },
          { header: 'Categoria', key: 'category' },
          { header: 'Saldo Atual', key: 'stock' },
          { header: 'P. Custo', key: 'cost' },
          { header: 'P. Venda', key: 'sale' },
          { header: 'Total Estocado (R$)', key: 'total_val' },
          { header: 'Status', key: 'status' },
        ],
        rows: products.map((p) => {
          const cost = p.cost_price || p.unit_price || 0;
          const sale = p.sale_price || p.unit_price || 0;
          const totVal = p.current_stock * sale;
          return {
            name: p.name,
            brand: p.brand || '-',
            category: categories.find((c) => c.id === p.category_id)?.name || 'Geral',
            stock: formatStockDisplay(p, p.current_stock, false),
            cost: `R$ ${cost.toFixed(2)}`,
            sale: `R$ ${sale.toFixed(2)}`,
            total_val: `R$ ${totVal.toFixed(2)}`,
            status:
              p.current_stock <= 0
                ? 'SEM ESTOQUE'
                : p.current_stock <= p.min_stock
                ? 'ESTOQUE BAIXO'
                : 'NORMAL',
          };
        }),
      };
    }

    if (activeReport === 'movements') {
      return {
        title: 'Relatório de Movimentações (Entradas e Saídas)',
        subtitle: `Período: ${period.toUpperCase()} | Registros: ${filteredMovements.length}`,
        columns: [
          { header: 'Data/Hora', key: 'date' },
          { header: 'Produto', key: 'product' },
          { header: 'Tipo', key: 'type' },
          { header: 'Quantidade', key: 'qty' },
          { header: 'Origem', key: 'origin' },
          { header: 'Usuário', key: 'user' },
          { header: 'Observações', key: 'notes' },
        ],
        rows: filteredMovements.map((m) => ({
          date: new Date(m.date).toLocaleString('pt-BR'),
          product: m.product_name,
          type: m.type.toUpperCase(),
          qty: `${m.used_qty} ${m.used_unit} (${m.converted_qty} ${m.main_unit})`,
          origin: m.origin.toUpperCase(),
          user: m.user_name,
          notes: m.notes || '-',
        })),
      };
    }

    if (activeReport === 'sales_payment') {
      return {
        title: 'Relatório de Vendas por Formas de Pagamento',
        subtitle: `Período: ${period.toUpperCase()} | Total: R$ ${salesSummary.totalOverall.toFixed(2)} em ${salesSummary.count} vendas`,
        columns: [
          { header: 'Data/Hora', key: 'date' },
          { header: 'Cliente / Venda', key: 'customer' },
          { header: 'Forma Pagamento', key: 'method' },
          { header: 'Itens', key: 'items' },
          { header: 'Desconto (R$)', key: 'disc' },
          { header: 'Valor Total (R$)', key: 'total' },
        ],
        rows: filteredSales.map((s) => ({
          date: new Date(s.date).toLocaleString('pt-BR'),
          customer: s.customer_name || 'Consumidor Final',
          method: s.payment_method.toUpperCase(),
          items: s.items.map((i) => `${i.product_name} (${i.quantity} ${i.unit})`).join(', '),
          disc: `R$ ${(s.discount_amount || 0).toFixed(2)}`,
          total: `R$ ${s.total_amount.toFixed(2)}`,
        })),
      };
    }

    if (activeReport === 'fiado_summary') {
      return {
        title: 'Relatório de Controle de Fiados e Débitos',
        subtitle: `Saldo Devedor Total em Aberto: R$ ${fiadoSummary.totalPendingBalance.toFixed(2)}`,
        columns: [
          { header: 'Cliente', key: 'name' },
          { header: 'Telefone', key: 'phone' },
          { header: 'CPF/CNPJ', key: 'cpf' },
          { header: 'Limite Crédito', key: 'limit' },
          { header: 'Saldo Devedor (R$)', key: 'debt' },
          { header: 'Situação', key: 'status' },
        ],
        rows: customers.map((c) => ({
          name: c.name,
          phone: c.phone || '-',
          cpf: c.cpf_cnpj || '-',
          limit: `R$ ${(c.credit_limit || 0).toFixed(2)}`,
          debt: `R$ ${(c.total_debt || 0).toFixed(2)}`,
          status: c.total_debt > 0 ? 'EM DÉBITO' : 'QUITADO',
        })),
      };
    }

    // Expiry Report
    const now = new Date();
    const exp30 = new Date(now.getTime() + 30 * 86400000);
    const expiringList = batches.filter((b) => b.current_qty > 0 && new Date(b.expiration_date) <= exp30);

    return {
      title: 'Relatório de Lotes e Controladoria de Validades',
      subtitle: `${expiringList.length} lotes com atenção de vencimento`,
      columns: [
        { header: 'Produto', key: 'product' },
        { header: 'Lote', key: 'batch' },
        { header: 'Data Validade', key: 'exp' },
        { header: 'Qtd Restante', key: 'qty' },
        { header: 'Situação', key: 'status' },
      ],
      rows: expiringList.map((b) => {
        const expDate = new Date(b.expiration_date);
        const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
        return {
          product: b.product_name || 'Produto',
          batch: b.batch_number,
          exp: expDate.toLocaleDateString('pt-BR'),
          qty: `${b.current_qty}`,
          status: daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)}d` : `Vence em ${daysLeft}d`,
        };
      }),
    };
  };

  const currentData = getReportData();

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Title & Global Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Relatórios & Inteligência Operacional</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Relatórios completos de estoques, saídas, vendas por forma de pagamento e fiados.
          </p>
        </div>

        {/* Period Filter & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Select & Custom Date Picker */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
              {(['today', '7days', 'month', 'all'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setStartDate('');
                    setEndDate('');
                    handleApplyFilter(p, '', '');
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    appliedPeriod === p && !appliedStartDate && !appliedEndDate
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p === 'today' ? 'Hoje' : p === '7days' ? '7 Dias' : p === 'month' ? 'Este Mês' : 'Todos'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod('custom');
                }}
                className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-500"
                title="Data Inicial"
              />
              <span className="text-slate-400 font-bold text-[10px]">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod('custom');
                }}
                className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] font-medium outline-none focus:ring-1 focus:ring-blue-500"
                title="Data Final"
              />

              <button
                onClick={() => handleApplyFilter()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                title="Clique para aplicar os filtros no relatório"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtrar</span>
              </button>

              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPeriod('month');
                    handleApplyFilter('month', '', '');
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Export Action Buttons */}
          <button
            onClick={() => exportToPDF(currentData)}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => exportToExcel(currentData)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => exportToCSV(currentData)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => printReport(currentData)}
            className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition"
            title="Imprimir Relatório"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          onClick={() => setActiveReport('current_stock')}
          className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col justify-between gap-2 ${
            activeReport === 'current_stock'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Package className="w-5 h-5" />
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-black/10">
              Estoque
            </span>
          </div>
          <div>
            <span className="block font-black text-sm">1. Estoque & Valores</span>
            <span className="text-[10px] opacity-80 font-normal">Valoração e saldos</span>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('movements')}
          className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col justify-between gap-2 ${
            activeReport === 'movements'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-black/10">
              Kardex
            </span>
          </div>
          <div>
            <span className="block font-black text-sm">2. Entradas & Saídas</span>
            <span className="text-[10px] opacity-80 font-normal">Histórico de fluxo</span>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('sales_payment')}
          className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col justify-between gap-2 ${
            activeReport === 'sales_payment'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <CircleDollarSign className="w-5 h-5" />
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-black/10">
              Caixa
            </span>
          </div>
          <div>
            <span className="block font-black text-sm">3. Vendas & Pagamentos</span>
            <span className="text-[10px] opacity-80 font-normal">Dinheiro, PIX, Cartão</span>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('fiado_summary')}
          className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col justify-between gap-2 ${
            activeReport === 'fiado_summary'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <BookOpenCheck className="w-5 h-5" />
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-black/10">
              Fiados
            </span>
          </div>
          <div>
            <span className="block font-black text-sm">4. Controle de Fiados</span>
            <span className="text-[10px] opacity-80 font-normal">Débitos e cobranças</span>
          </div>
        </button>

        <button
          onClick={() => setActiveReport('expiry')}
          className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition flex flex-col justify-between gap-2 col-span-2 sm:col-span-1 ${
            activeReport === 'expiry'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Boxes className="w-5 h-5" />
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-black/10">
              Lotes
            </span>
          </div>
          <div>
            <span className="block font-black text-sm">5. Validades & Lotes</span>
            <span className="text-[10px] opacity-80 font-normal">Risco de vencimento</span>
          </div>
        </button>
      </div>

      {/* SUMMARY KPI CARDS BASED ON ACTIVE REPORT */}
      {activeReport === 'current_stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Valor Total Estocado (Custo)</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
              R$ {stockValuation.totalCost.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Estimado com base no custo unitário</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Potencial Bruto de Venda</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              R$ {stockValuation.totalSale.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Valor total caso todo estoque seja vendido</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Lucro Projetado Bruto</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              R$ {stockValuation.projectedProfit.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Margem potencial de ganho</span>
          </div>
        </div>
      )}

      {activeReport === 'sales_payment' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs mb-1">
              <CircleDollarSign className="w-4 h-4" /> Dinheiro
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">R$ {salesSummary.totalDinheiro.toFixed(2)}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 text-teal-600 font-bold text-xs mb-1">
              <TrendingUp className="w-4 h-4" /> PIX
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">R$ {salesSummary.totalPix.toFixed(2)}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs mb-1">
              <CreditCard className="w-4 h-4" /> Cartão (Créd/Déb)
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">R$ {salesSummary.totalCartao.toFixed(2)}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
              <BookOpenCheck className="w-4 h-4" /> Fiado (Venda a Prazo)
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">R$ {salesSummary.totalFiado.toFixed(2)}</span>
          </div>
        </div>
      )}

      {activeReport === 'fiado_summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 shadow-sm">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">Total Pendente em Fiados</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              R$ {fiadoSummary.totalPendingBalance.toFixed(2)}
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Acumulado a receber de clientes</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Clientes com Débito Ativo</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
              {fiadoSummary.totalClientsWithDebt} <span className="text-xs font-normal text-slate-400">clientes</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">De um total de {customers.length} cadastrados</span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-sm">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">Pagamentos Recebidos (Período)</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              R$ {fiadoSummary.totalReceivedInPeriod.toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Abatimentos de fiado quitados</span>
          </div>
        </div>
      )}

      {/* REPORT DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5">
        <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {currentData.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentData.subtitle}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            {currentData.rows.length} registros exibidos
          </span>
        </div>

        <div className="overflow-x-auto">
          {currentData.rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Nenhum dado encontrado para os filtros selecionados no período.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  {currentData.columns.map((c) => (
                    <th key={c.key} className="py-3 px-3.5 whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {currentData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    {currentData.columns.map((c) => (
                      <td key={c.key} className="py-3 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
