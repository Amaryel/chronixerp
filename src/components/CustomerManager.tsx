/**
 * Aquinos Frios - Cadastro de Clientes e Controle de Fiado
 * Interface enxuta e direta para gestão de clientes e cobranças fiadas.
 */

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  Phone,
  FileText,
  Trash2,
  X,
  AlertCircle,
  Banknote,
  History,
  Download,
  Smartphone,
  Printer,
} from 'lucide-react';
import { Customer, FiadoSale, FiadoPayment } from '../types';
import { storage } from '../services/storage';
import { ReceiptModal } from './ReceiptModal';
import { downloadReceiptPDF, shareReceiptPDF } from '../lib/pdfGenerator';

interface CustomerManagerProps {
  onRefresh: () => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal create/edit customer
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  // Receipt Modal State
  const [receiptState, setReceiptState] = useState<{
    isOpen: boolean;
    type: 'venda_normal' | 'venda_fiado' | 'recebimento' | 'quitacao';
    sale: FiadoSale | null;
    receivedAmount?: number;
    previousBalance?: number;
    remainingBalance?: number;
    operatorName?: string;
  }>({
    isOpen: false,
    type: 'venda_fiado',
    sale: null,
  });
  const [formName, setFormName] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const customers = storage.getCustomers();
  const fiadoSales = storage.getFiadoSales();

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.document && c.document.includes(searchTerm)) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormDoc('');
    setFormPhone('');
    setFormNotes('');
    setIsCustomerModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormDoc(customer.document || '');
    setFormPhone(customer.phone || '');
    setFormNotes(customer.notes || '');
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    storage.saveCustomer({
      id: editingCustomer ? editingCustomer.id : undefined,
      name: formName.trim(),
      document: formDoc.trim(),
      phone: formPhone.trim(),
      notes: formNotes.trim(),
    });

    onRefresh();
    setIsCustomerModalOpen(false);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Deseja excluir o cadastro do cliente "${name}"?`)) {
      storage.deleteCustomer(id);
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
      onRefresh();
    }
  };

  const handleMarkPaid = (saleId: string) => {
    storage.markFiadoSalePaid(saleId);
    onRefresh();
  };

  const totalAllOpenBalance = customers.reduce(
    (sum, c) => sum + storage.getCustomerOpenBalance(c.id),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-amber-400/40 text-amber-100 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Controle de Fiado & Clientes
          </span>
          <h1 className="text-2xl font-black tracking-tight">Clientes</h1>
          <p className="text-xs text-amber-100/90 font-medium mt-0.5">
            Cadastros simples e gestão imediata de valores em aberto.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-amber-900/40 backdrop-blur px-4 py-2 rounded-xl border border-amber-400/30 text-right">
            <div className="text-[10px] text-amber-200 font-bold uppercase">Total Fiado Geral</div>
            <div className="text-lg font-black text-white">R$ {totalAllOpenBalance.toFixed(2)}</div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-3 bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: CUSTOMER LIST */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto stroke-1 text-slate-300 mb-1" />
                <p className="font-bold text-xs">Nenhum cliente cadastrado</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => {
                const openBalance = storage.getCustomerOpenBalance(customer.id);
                const isSelected = selectedCustomer?.id === customer.id;

                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {customer.name}
                      </h3>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        {customer.document && <span>{customer.document}</span>}
                        {customer.phone && <span>• {customer.phone}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Em Aberto</div>
                      <div
                        className={`text-xs font-black ${
                          openBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                        }`}
                      >
                        R$ {openBalance.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER DETAIL & FIADO HISTORY */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-2">
              <BookOpen className="w-12 h-12 mx-auto text-amber-500/40 stroke-1" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Selecione um cliente ao lado
              </h3>
              <p className="text-xs">
                Visualize as vendas fiadas em aberto e marque pagamentos efetuados.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              {/* Customer Info Card */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedCustomer.name}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    {selectedCustomer.document && (
                      <p className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>CPF/CNPJ: {selectedCustomer.document}</span>
                      </p>
                    )}
                    {selectedCustomer.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Telefone: {selectedCustomer.phone}</span>
                      </p>
                    )}
                    {selectedCustomer.notes && (
                      <p className="italic text-slate-400">Obs: {selectedCustomer.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedCustomer)}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total Open Balance Display */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Saldo de Dívida em Aberto
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Valor total a receber deste cliente
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300">
                  R$ {storage.getCustomerOpenBalance(selectedCustomer.id).toFixed(2)}
                </div>
              </div>

              {/* Sales History for Selected Customer */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Histórico de Vendas / Fiados
                </h3>

                {(() => {
                  const custSales = fiadoSales.filter(
                    (s) => s.customer_id === selectedCustomer.id
                  );

                  if (custSales.length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl text-xs">
                        Nenhuma venda registrada para este cliente.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {custSales.map((sale) => {
                        const isOpen = sale.status === 'aberto';
                        return (
                          <div
                            key={sale.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isOpen
                                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    isOpen
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  }`}
                                >
                                  {isOpen ? 'Em Aberto' : 'Pago'}
                                </span>
                                <span className="text-xs font-bold text-slate-500">
                                  {new Date(sale.date).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(sale.date).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                                {sale.items.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                              <div className="text-right">
                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                  R$ {sale.total_amount.toFixed(2)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    setReceiptState({
                                      isOpen: true,
                                      type: 'venda_fiado',
                                      sale,
                                    })
                                  }
                                  className="p-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="Ver Comprovante"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Ver</span>
                                </button>

                                <button
                                  onClick={() =>
                                    downloadReceiptPDF({
                                      type: 'venda_fiado',
                                      saleId: sale.id,
                                      customerName: sale.customer_name,
                                      date: sale.date,
                                      items: sale.items,
                                      totalAmount: sale.total_amount,
                                      paymentMethod: sale.payment_method,
                                      installmentsCount: sale.installments_count,
                                    })
                                  }
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition"
                                  title="Baixar PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                {isOpen && (
                                  <button
                                    onClick={() => handleMarkPaid(sale.id)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow transition flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Quitar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Customer Payments History */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-extrabold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>Histórico de Pagamentos Recebidos</span>
                </h3>

                {(() => {
                  const payments = storage
                    .getFiadoPayments()
                    .filter((p) => p.customer_id === selectedCustomer.id);

                  if (payments.length === 0) {
                    return (
                      <div className="p-4 text-center text-slate-400 border border-dashed rounded-xl text-xs">
                        Nenhum pagamento registrado ainda para este cliente.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {payments.map((p) => {
                        const isQuitacao = p.remaining_balance === 0;
                        return (
                          <div
                            key={p.id}
                            className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                  {new Date(p.date).toLocaleString('pt-BR')}
                                </span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase rounded">
                                  {p.payment_method}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Anterior: R$ {p.previous_balance.toFixed(2)} | Restante: R${' '}
                                {p.remaining_balance.toFixed(2)} ({p.operator_name || 'Atendente'})
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm mr-2">
                                R$ {p.received_amount.toFixed(2)}
                              </span>

                              <button
                                onClick={() =>
                                  setReceiptState({
                                    isOpen: true,
                                    type: isQuitacao ? 'quitacao' : 'recebimento',
                                    sale: null,
                                    receivedAmount: p.received_amount,
                                    previousBalance: p.previous_balance,
                                    remainingBalance: p.remaining_balance,
                                    operatorName: p.operator_name,
                                  })
                                }
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                                title="Ver Comprovante"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  downloadReceiptPDF({
                                    type: isQuitacao ? 'quitacao' : 'recebimento',
                                    customerName: p.customer_name,
                                    date: p.date,
                                    receivedAmount: p.received_amount,
                                    previousBalance: p.previous_balance,
                                    remainingBalance: p.remaining_balance,
                                    paymentMethod: p.payment_method,
                                    operatorName: p.operator_name,
                                  })
                                }
                                className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg transition"
                                title="Baixar PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={async () => {
                                  const res = await shareReceiptPDF({
                                    type: isQuitacao ? 'quitacao' : 'recebimento',
                                    customerName: p.customer_name,
                                    date: p.date,
                                    receivedAmount: p.received_amount,
                                    previousBalance: p.previous_balance,
                                    remainingBalance: p.remaining_balance,
                                    paymentMethod: p.payment_method,
                                    operatorName: p.operator_name,
                                  });
                                  if (!res.sharedFile) {
                                    window.open(res.whatsappUrl, '_blank');
                                  }
                                }}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                                title="Enviar no WhatsApp"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4 animate-scale-up"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Francisco Aquino"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  CPF ou CNPJ
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123.456.789-00"
                  value={formDoc}
                  onChange={(e) => setFormDoc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Telefone (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: (88) 99888-7766"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Comprador frequente de presuntos e queijos..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 font-extrabold text-xs text-white rounded-xl shadow"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={receiptState.isOpen}
        type={receiptState.type}
        sale={receiptState.sale}
        receivedAmount={receiptState.receivedAmount}
        previousBalance={receiptState.previousBalance}
        remainingBalance={receiptState.remainingBalance}
        operatorName={receiptState.operatorName}
        onClose={() => setReceiptState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
