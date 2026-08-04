/**
 * Aquinos Frios - Controle de Fiados (Clientes, Parcelas, Quitações e Histórico)
 */

import React, { useState } from 'react';
import {
  BookOpenCheck,
  Search,
  User,
  CheckCircle2,
  AlertCircle,
  Banknote,
  FileText,
  MessageSquare,
  DollarSign,
  UserX,
  History,
  AlertTriangle,
  X,
  Printer,
  Calendar,
  Check,
  Smartphone,
  Download,
} from 'lucide-react';
import { Customer, FiadoSale, FiadoInstallment, FiadoPayment } from '../types';
import { storage } from '../services/storage';
import { ReceiptModal } from './ReceiptModal';
import { downloadReceiptPDF, shareReceiptPDF } from '../lib/pdfGenerator';

interface FiadoManagementProps {
  onRefresh: () => void;
}

export const FiadoManagement: React.FC<FiadoManagementProps> = ({ onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'contas' | 'historico'>('contas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'com_débito' | 'em_dia'>('com_débito');

  // Customer Note Modal / Input
  const [editingNoteCustomerId, setEditingNoteCustomerId] = useState<string | null>(null);
  const [customerNoteText, setCustomerNoteText] = useState('');

  // Payment Modal State (Quitar Dívida)
  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    totalOpenBalance: number;
    receivedAmount: string;
    paymentMethod: string;
    notes: string;
    overpaymentConfirmed: boolean;
  }>({
    isOpen: false,
    customer: null,
    totalOpenBalance: 0,
    receivedAmount: '',
    paymentMethod: 'Dinheiro',
    notes: '',
    overpaymentConfirmed: false,
  });

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<{
    isOpen: boolean;
    type: 'venda_normal' | 'venda_fiado' | 'recebimento' | 'quitacao';
    sale: FiadoSale | null;
    paidInstallment: FiadoInstallment | null;
    receivedAmount: number;
    previousBalance?: number;
    remainingBalance: number;
    operatorName?: string;
  }>({
    isOpen: false,
    type: 'recebimento',
    sale: null,
    paidInstallment: null,
    receivedAmount: 0,
    remainingBalance: 0,
  });

  // Success Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const customers = storage.getCustomers();
  const allFiadoSales = storage.getFiadoSales();
  const fiadoPayments = storage.getFiadoPayments();

  // Calculate debt per customer
  const customerDebts = customers.map((customer) => {
    const sales = allFiadoSales.filter((s) => s.customer_id === customer.id);
    let totalDebt = 0;
    let overdueCount = 0;
    let pendingInstallmentsCount = 0;

    sales.forEach((s) => {
      if (s.installments) {
        s.installments.forEach((inst) => {
          if (inst.status !== 'paga') {
            totalDebt += inst.amount;
            pendingInstallmentsCount++;
            const isOverdue = new Date(inst.due_date + 'T23:59:59') < new Date();
            if (isOverdue) overdueCount++;
          }
        });
      } else if (s.status !== 'pago') {
        totalDebt += s.total_amount;
        pendingInstallmentsCount++;
      }
    });

    return {
      customer,
      sales,
      totalDebt: Math.round(totalDebt * 100) / 100,
      overdueCount,
      pendingInstallmentsCount,
    };
  });

  // Filtered customer list
  const filteredDebts = customerDebts.filter(({ customer, totalDebt }) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.document && customer.document.includes(searchTerm)) ||
      (customer.phone && customer.phone.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterStatus === 'com_débito') return totalDebt > 0;
    if (filterStatus === 'em_dia') return totalDebt === 0;
    return true;
  });

  // Global totals
  const totalGlobalDebt = customerDebts.reduce((sum, item) => sum + item.totalDebt, 0);
  const totalDebtorsCount = customerDebts.filter((item) => item.totalDebt > 0).length;
  const totalOverdueCount = customerDebts.reduce((sum, item) => sum + item.overdueCount, 0);

  // Selected customer data
  const selectedCustomerData = customerDebts.find((cd) => cd.customer.id === selectedCustomerId);

  // Open "Quitar Dívida / Baixar" Modal
  const handleOpenPaymentModal = (customer: Customer, totalDebt: number) => {
    setPaymentModalData({
      isOpen: true,
      customer,
      totalOpenBalance: totalDebt,
      receivedAmount: totalDebt.toString(),
      paymentMethod: 'Dinheiro',
      notes: '',
      overpaymentConfirmed: false,
    });
  };

  // Submit Payment in Payment Modal
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const { customer, totalOpenBalance, receivedAmount, paymentMethod, notes, overpaymentConfirmed } = paymentModalData;
    if (!customer) return;

    const numReceived = parseFloat(receivedAmount);
    if (isNaN(numReceived) || numReceived <= 0) {
      alert('Por favor, informe um valor recebido válido.');
      return;
    }

    if (numReceived > totalOpenBalance && !overpaymentConfirmed) {
      alert('O valor informado é superior ao saldo devedor. Por favor, marque a opção de confirmação para prosseguir com o troco/crédito.');
      return;
    }

    try {
      const result = storage.processFiadoPayment({
        customerId: customer.id,
        customerName: customer.name,
        receivedAmount: numReceived,
        paymentMethod,
        notes,
      });

      onRefresh();

      setPaymentModalData((prev) => ({ ...prev, isOpen: false }));
      showToast('✓ Pagamento/Quitação registrado com sucesso!');

      // Get last sale for receipt
      const customerSales = allFiadoSales.filter((s) => s.customer_id === customer.id);
      const lastSale = customerSales[0] || {
        id: 'sale-pay-' + Date.now(),
        customer_id: customer.id,
        customer_name: customer.name,
        date: new Date().toISOString(),
        items: [],
        total_amount: numReceived,
        payment_method: paymentMethod as any,
        status: result.fullyPaid ? 'pago' : 'aberto',
        created_at: new Date().toISOString(),
      };

      setReceiptData({
        isOpen: true,
        type: result.fullyPaid ? 'quitacao' : 'recebimento',
        sale: lastSale as FiadoSale,
        paidInstallment: null,
        receivedAmount: numReceived,
        previousBalance: result.payment.previous_balance,
        remainingBalance: result.remainingBalance,
        operatorName: result.payment.operator_name,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao processar pagamento.');
    }
  };

  // Save observation note
  const handleSaveCustomerNote = (customerId: string) => {
    storage.updateCustomerNote(customerId, customerNoteText);
    onRefresh();
    setEditingNoteCustomerId(null);
    showToast('✓ Anotação atualizada.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-amber-500/40 text-amber-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Gestão Financeira
          </span>
          <h1 className="text-2xl font-black tracking-tight">Controle de Fiados & Quitações</h1>
          <p className="text-xs text-amber-100/90 font-medium mt-0.5">
            Acompanhe contas a receber, baixe dívidas, consulte pagamentos e emita comprovantes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-900/60 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-amber-500/30 text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-200 block">
              Total a Receber:
            </span>
            <span className="text-xl font-black text-white">R$ {totalGlobalDebt.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation (Contas x Histórico de Recebimentos) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveSubTab('contas')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
            activeSubTab === 'contas'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>Contas a Receber ({totalDebtorsCount} Clientes)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historico')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition ${
            activeSubTab === 'historico'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Recebimentos ({fiadoPayments.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: CONTAS A RECEBER */}
      {activeSubTab === 'contas' && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Total em Aberto</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                  R$ {totalGlobalDebt.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Clientes Devedores</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{totalDebtorsCount} Clientes</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Parcelas Vencidas</p>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {totalOverdueCount} {totalOverdueCount === 1 ? 'parcela' : 'parcelas'}
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nome, CPF ou tel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFilterStatus('com_débito')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterStatus === 'com_débito'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Com Débito ({customerDebts.filter((cd) => cd.totalDebt > 0).length})
              </button>
              <button
                onClick={() => setFilterStatus('todos')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterStatus === 'todos'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos ({customers.length})
              </button>
            </div>
          </div>

          {/* MAIN LAYOUT: CUSTOMER LIST (LEFT) & DEBT DETAILS (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CUSTOMER LIST */}
            <div className="lg:col-span-1 space-y-2.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                Clientes
              </h2>

              {filteredDebts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <UserX className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Nenhum cliente encontrado.</p>
                </div>
              ) : (
                filteredDebts.map(({ customer, totalDebt, overdueCount, pendingInstallmentsCount }) => {
                  const isSelected = selectedCustomerId === customer.id;

                  return (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-500/10 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {customer.name}
                          </h3>
                          {customer.phone && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              📞 {customer.phone}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 ${
                            totalDebt > 0
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {totalDebt > 0 ? `R$ ${totalDebt.toFixed(2)}` : 'Em Dia'}
                        </span>
                      </div>

                      {totalDebt > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-500">
                            {pendingInstallmentsCount} {pendingInstallmentsCount === 1 ? 'pendência' : 'pendências'}
                          </span>
                          {overdueCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold rounded">
                              ⚠️ {overdueCount} vencida(s)
                            </span>
                          )}
                        </div>
                      )}

                      {customer.notes && (
                        <div className="mt-2 text-[10px] italic text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 p-1.5 rounded-md border border-amber-200/50">
                          💬 "{customer.notes}"
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* DETAILED DEBT & INSTALLMENT SCHEDULE (RIGHT) */}
            <div className="lg:col-span-2">
              {!selectedCustomerData ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <BookOpenCheck className="w-12 h-12 text-amber-500 mx-auto opacity-40" />
                  <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">
                    Selecione um cliente para visualizar o extrato de fiado
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Clique sobre o nome do cliente na lista à esquerda para consultar compras, parcelas, prazos e baixar pagamentos.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                  {/* Customer Header Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-amber-600" />
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                          {selectedCustomerData.customer.name}
                        </h2>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-1">
                        {selectedCustomerData.customer.document && (
                          <span>CPF/CNPJ: {selectedCustomerData.customer.document}</span>
                        )}
                        {selectedCustomerData.customer.phone && (
                          <span>Tel: {selectedCustomerData.customer.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCustomerData.totalDebt > 0 && (
                        <button
                          onClick={() =>
                            handleOpenPaymentModal(
                              selectedCustomerData.customer,
                              selectedCustomerData.totalDebt
                            )
                          }
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Quitar Dívida / Baixar Valor (R$ {selectedCustomerData.totalDebt.toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer Notes / Observations Section */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Anotações / Observações do Cliente</span>
                      </span>
                      {editingNoteCustomerId !== selectedCustomerData.customer.id && (
                        <button
                          onClick={() => {
                            setEditingNoteCustomerId(selectedCustomerData.customer.id);
                            setCustomerNoteText(selectedCustomerData.customer.notes || '');
                          }}
                          className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                        >
                          {selectedCustomerData.customer.notes ? 'Editar Anotação' : '+ Adicionar Anotação'}
                        </button>
                      )}
                    </div>

                    {editingNoteCustomerId === selectedCustomerData.customer.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          placeholder="Ex: Prometeu pagar dia 15 no PIX. Enviar mensagem no WhatsApp..."
                          value={customerNoteText}
                          onChange={(e) => setCustomerNoteText(e.target.value)}
                          className="w-full p-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingNoteCustomerId(null)}
                            className="px-3 py-1 rounded-lg border text-xs font-bold text-slate-600 dark:text-slate-400"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveCustomerNote(selectedCustomerData.customer.id)}
                            className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-lg shadow"
                          >
                            Salvar Anotação
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-medium italic">
                        {selectedCustomerData.customer.notes || 'Nenhuma anotação registrada.'}
                      </p>
                    )}
                  </div>

                  {/* SALES & INSTALLMENTS SCHEDULE */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Histórico de Vendas Fiado e Parcelas
                    </h3>

                    {selectedCustomerData.sales.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">
                        Nenhuma venda fiada registrada para este cliente.
                      </p>
                    ) : (
                      selectedCustomerData.sales.map((sale) => (
                        <div
                          key={sale.id}
                          className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                        >
                          {/* Sale Header */}
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                Venda #{sale.id.slice(-6)}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">
                                {new Date(sale.date || sale.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 dark:text-white">
                                R$ {sale.total_amount.toFixed(2)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                  sale.status === 'pago'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {sale.status === 'pago' ? 'QUITADA' : 'EM ABERTO'}
                              </span>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                            <p className="font-bold text-slate-500 mb-1 text-[11px]">Itens comprados:</p>
                            <div className="space-y-1">
                              {sale.items.map((it, i) => (
                                <div key={i} className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300">
                                  <span>
                                    • {it.product_name} ({it.quantity} {it.unit})
                                  </span>
                                  <span className="font-semibold">R$ {it.total_price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Installments Table */}
                          {sale.installments && sale.installments.length > 0 && (
                            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
                              <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300 mb-2">
                                Plano de Parcelas:
                              </p>
                              <div className="space-y-2">
                                {sale.installments.map((inst) => {
                                  const isOverdue =
                                    inst.status !== 'paga' &&
                                    new Date(inst.due_date + 'T23:59:59') < new Date();

                                  return (
                                    <div
                                      key={inst.id}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                        inst.status === 'paga'
                                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                                          : isOverdue
                                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-slate-900 dark:text-white">
                                          Parc. {inst.installment_number}/{inst.total_installments}
                                        </span>
                                        <span className="text-slate-400">|</span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                                          Venc: {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className="font-black text-slate-900 dark:text-white text-sm">
                                          R$ {inst.amount.toFixed(2)}
                                        </span>

                                        {inst.status === 'paga' ? (
                                          <span className="px-2 py-1 bg-emerald-600 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> PAGA
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              handleOpenPaymentModal(
                                                selectedCustomerData.customer,
                                                inst.amount
                                              )
                                            }
                                            className={`px-3 py-1 font-extrabold rounded-lg text-xs shadow-sm flex items-center gap-1 transition ${
                                              isOverdue
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                                            }`}
                                          >
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span>Baixar Parcela</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* SUBTAB 2: HISTÓRICO DE RECEBIMENTOS */}
      {activeSubTab === 'historico' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <span>Histórico Auditado de Pagamentos / Recebimentos de Fiado</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exibe todos os lançamentos de recebimento com detalhes de cliente, operador, forma de pagamento e saldos.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full font-black text-xs">
              Total Registrado: {fiadoPayments.length}
            </span>
          </div>

          {fiadoPayments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-xs font-bold">Nenhum histórico de recebimento registrado até o momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="p-3.5 pl-4">Data / Hora</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Valor Recebido</th>
                    <th className="p-3.5">Forma de Pagto</th>
                    <th className="p-3.5">Saldo Anterior</th>
                    <th className="p-3.5">Saldo Restante</th>
                    <th className="p-3.5">Operador</th>
                    <th className="p-3.5 text-right pr-4">Ações / Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {fiadoPayments.map((p) => {
                    const isQuitacao = p.remaining_balance === 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 pl-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {new Date(p.date).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">
                          {p.customer_name}
                        </td>
                        <td className="p-3.5">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            R$ {p.received_amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 font-bold rounded-lg text-slate-800 dark:text-slate-200 uppercase text-[10px]">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">
                          R$ {p.previous_balance.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`font-extrabold ${
                              p.remaining_balance === 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {p.remaining_balance === 0 ? '✓ Quitada (R$ 0,00)' : `R$ ${p.remaining_balance.toFixed(2)}`}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {p.operator_name || 'Atendente'}
                        </td>
                        <td className="p-3.5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setReceiptData({
                                  isOpen: true,
                                  type: isQuitacao ? 'quitacao' : 'recebimento',
                                  sale: null,
                                  paidInstallment: null,
                                  receivedAmount: p.received_amount,
                                  previousBalance: p.previous_balance,
                                  remainingBalance: p.remaining_balance,
                                  operatorName: p.operator_name,
                                });
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded-lg shadow transition flex items-center gap-1"
                              title="Ver / Reemitir Comprovante"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ver</span>
                            </button>

                            <button
                              onClick={() => {
                                downloadReceiptPDF({
                                  type: isQuitacao ? 'quitacao' : 'recebimento',
                                  customerName: p.customer_name,
                                  date: p.date,
                                  receivedAmount: p.received_amount,
                                  previousBalance: p.previous_balance,
                                  remainingBalance: p.remaining_balance,
                                  paymentMethod: p.payment_method,
                                  operatorName: p.operator_name,
                                });
                              }}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition flex items-center gap-1"
                              title="Baixar PDF do Comprovante"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>

                            <button
                              onClick={async () => {
                                const result = await shareReceiptPDF({
                                  type: isQuitacao ? 'quitacao' : 'recebimento',
                                  customerName: p.customer_name,
                                  date: p.date,
                                  receivedAmount: p.received_amount,
                                  previousBalance: p.previous_balance,
                                  remainingBalance: p.remaining_balance,
                                  paymentMethod: p.payment_method,
                                  operatorName: p.operator_name,
                                });
                                if (!result.sharedFile) {
                                  window.open(result.whatsappUrl, '_blank');
                                }
                              }}
                              className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                              title="Enviar por WhatsApp"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>Zap</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT / QUITAR DÍVIDA MODAL */}
      {paymentModalData.isOpen && paymentModalData.customer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Quitar / Baixar Dívida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalData((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Cliente: <strong>{paymentModalData.customer.name}</strong>
              </p>
              <div className="flex justify-between items-center text-sm font-black text-amber-800 dark:text-amber-300 pt-1 border-t border-amber-200/60">
                <span>Saldo Devedor Total:</span>
                <span>R$ {paymentModalData.totalOpenBalance.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Valor Recebido (R$) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  onFocus={(e) => e.target.select()}
                  value={paymentModalData.receivedAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseFloat(val);
                    setPaymentModalData((prev) => ({
                      ...prev,
                      receivedAmount: val,
                      overpaymentConfirmed: !isNaN(num) && num > prev.totalOpenBalance ? prev.overpaymentConfirmed : false,
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Overpayment Warning */}
              {parseFloat(paymentModalData.receivedAmount) > paymentModalData.totalOpenBalance && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2 text-rose-800 dark:text-rose-200">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Atenção: Valor recebido é superior ao saldo!</span>
                  </div>
                  <p className="text-[11px]">
                    O valor digitado (R$ {parseFloat(paymentModalData.receivedAmount).toFixed(2)}) excede a dívida de R$ {paymentModalData.totalOpenBalance.toFixed(2)}. Troco/Crédito: R$ {(parseFloat(paymentModalData.receivedAmount) - paymentModalData.totalOpenBalance).toFixed(2)}.
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={paymentModalData.overpaymentConfirmed}
                      onChange={(e) =>
                        setPaymentModalData((prev) => ({ ...prev, overpaymentConfirmed: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Confirmar recebimento com valor maior</span>
                  </label>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Forma de Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentModalData.paymentMethod}
                  onChange={(e) =>
                    setPaymentModalData((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência">Transferência / TED</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold mb-1">
                  Observações / Anotações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento parcial referente à quitação do mês..."
                  value={paymentModalData.notes}
                  onChange={(e) =>
                    setPaymentModalData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPaymentModalData((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Salvar Pagamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL FOR PAYMENT/QUITAÇÃO */}
      <ReceiptModal
        isOpen={receiptData.isOpen}
        type={receiptData.type}
        sale={receiptData.sale}
        paidInstallment={receiptData.paidInstallment}
        receivedAmount={receiptData.receivedAmount}
        previousBalance={receiptData.previousBalance}
        remainingBalance={receiptData.remainingBalance}
        operatorName={receiptData.operatorName}
        onClose={() => setReceiptData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
