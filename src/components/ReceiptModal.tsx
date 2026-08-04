/**
 * Aquinos Frios - Receipt Modal (Comprovante de Venda, Fiado e Recebimento)
 * Supports WhatsApp Sharing, PDF/Thermal Printer Printing (56mm & 80mm).
 */

import React, { useState } from 'react';
import { X, Printer, Share2, CheckCircle2, FileText, Smartphone, Download } from 'lucide-react';
import { FiadoSale, FiadoInstallment } from '../types';
import { storage } from '../services/storage';
import {
  downloadReceiptPDF,
  shareReceiptPDF,
  ReceiptPDFData,
} from '../lib/pdfGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  type: 'venda_normal' | 'venda_fiado' | 'recebimento' | 'quitacao' | 'pre_venda';
  sale?: FiadoSale | null;
  preSale?: {
    id: string;
    code: string;
    customer_name?: string;
    date: string;
    items: {
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      total_price: number;
    }[];
    total_amount: number;
    notes?: string;
  } | null;
  paidInstallment?: FiadoInstallment | null;
  receivedAmount?: number;
  previousBalance?: number;
  remainingBalance?: number;
  operatorName?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  type,
  sale,
  preSale,
  paidInstallment,
  receivedAmount,
  previousBalance,
  remainingBalance,
  operatorName = 'Atendimento Aquinos Frios',
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '56mm' | 'A4'>('80mm');
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || (!sale && !preSale && type !== 'quitacao' && type !== 'recebimento')) return null;

  const activeCompany = storage.getCurrentUserCompany();
  const companyName = activeCompany.name || 'AQUINOS FRIOS';
  const companySub = 'Distribuidora de Frios & Laticínios';
  const companyPhone = activeCompany.phone || '(88) 99999-0000';
  const companyDoc = activeCompany.document;
  const companyAddress = activeCompany.address;

  const displayItems = type === 'pre_venda' ? preSale?.items : sale?.items;
  const displayTotal = type === 'pre_venda' ? preSale?.total_amount : sale?.total_amount;
  const displayCustomer = type === 'pre_venda' ? preSale?.customer_name : sale?.customer_name;
  const displayCode = type === 'pre_venda' ? preSale?.code : sale?.id;
  const displayDate = type === 'pre_venda' ? preSale?.date : (sale?.date || sale?.created_at);

  const saleDateFormatted = displayDate
    ? new Date(displayDate).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  const pdfData: ReceiptPDFData = {
    type,
    saleId: displayCode,
    customerName: displayCustomer,
    date: displayDate,
    companyInfo: {
      name: companyName,
      subtitle: companySub,
      phone: companyPhone,
      document: companyDoc,
      address: companyAddress,
    },
    items: displayItems,
    subtotalAmount: sale?.subtotal_amount,
    discountAmount: sale?.discount_amount,
    surchargeAmount: sale?.surcharge_amount,
    interestRate: sale?.interest_rate,
    interestAmount: sale?.interest_amount,
    totalAmount: displayTotal,
    paymentMethod: sale?.payment_method,
    receivedAmount,
    previousBalance,
    remainingBalance,
    operatorName,
    installmentsCount: sale?.installments_count,
    notes: preSale?.notes,
    installments: sale?.installments?.map((i) => ({
      installment_number: i.installment_number,
      total_installments: i.total_installments,
      amount: i.amount,
      due_date: i.due_date,
      status: i.status,
    })),
    paperWidth,
  };

  const handleSendWhatsapp = async () => {
    setIsSharing(true);
    try {
      const result = await shareReceiptPDF(pdfData);
      if (!result.sharedFile) {
        // Fallback: download PDF file directly & inform user before opening WhatsApp
        downloadReceiptPDF(pdfData);
        alert('O comprovante PDF foi gerado e baixado! Anexe-o no WhatsApp que será aberto em seguida.');
        window.open(result.whatsappUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
      downloadReceiptPDF(pdfData);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPDF = () => {
    downloadReceiptPDF(pdfData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden my-auto">
        {/* Header bar (screen only) */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-black text-sm">Comprovante do Sistema</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper format switcher (screen only) */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold print:hidden">
          <span className="text-slate-600 dark:text-slate-400">Formato / Papel:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded-lg ${
                paperWidth === '80mm'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              80mm
            </button>
            <button
              onClick={() => setPaperWidth('56mm')}
              className={`px-2.5 py-1 rounded-lg ${
                paperWidth === '56mm'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              56mm
            </button>
            <button
              onClick={() => setPaperWidth('A4')}
              className={`px-2.5 py-1 rounded-lg ${
                paperWidth === 'A4'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              A4
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT (PRINTABLE REGION) */}
        <div
          id="printable-receipt"
          className={`p-6 text-slate-900 dark:text-slate-100 font-mono text-xs mx-auto ${
            paperWidth === '56mm' ? 'max-w-[260px]' : 'max-w-[340px]'
          }`}
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400 dark:border-slate-600">
            <h2 className="font-black text-base uppercase tracking-wider">{companyName}</h2>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase">{companySub}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">Tel/WhatsApp: {companyPhone}</p>
            <p className="text-[10px] text-slate-500 mt-1">{saleDateFormatted}</p>
          </div>

          {/* Title based on Type */}
          <div className="my-3 text-center font-extrabold uppercase border-b border-dashed border-slate-400 dark:border-slate-600 pb-2">
            {type === 'venda_normal' && `Comprovante de Venda #${sale?.id ? sale.id.slice(-6) : ''}`}
            {type === 'venda_fiado' && `Comprovante Venda a Prazo #${sale?.id ? sale.id.slice(-6) : ''}`}
            {type === 'recebimento' && `Comprovante de Recebimento`}
            {type === 'quitacao' && `Comprovante de Quitação de Dívida`}
            {type === 'pre_venda' && `Pré-Venda / Orçamento #${displayCode}`}
          </div>

          {/* Customer info */}
          {displayCustomer && (
            <div className="mb-3 text-[11px] leading-tight">
              <span className="font-bold">Cliente: </span>
              <span>{displayCustomer}</span>
            </div>
          )}

          {/* Items list for sales */}
          {type !== 'recebimento' && type !== 'quitacao' && displayItems && displayItems.length > 0 && (
            <div className="mb-3 border-b border-dashed border-slate-400 dark:border-slate-600 pb-3">
              <div className="font-bold mb-1 border-b border-slate-300 pb-1 flex justify-between text-[10px]">
                <span>ITEM / QTD</span>
                <span>SUBTOTAL</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                {displayItems.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-1">
                    <div className="flex-1">
                      <p className="font-bold leading-tight">{it.product_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {it.quantity} {it.unit} x R$ {it.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold shrink-0">R$ {it.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals section */}
          {sale && (sale.subtotal_amount !== undefined || sale.discount_amount || sale.surcharge_amount || sale.interest_amount) && (
            <div className="mb-2 space-y-0.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 pt-2">
              {sale.subtotal_amount !== undefined && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {sale.subtotal_amount.toFixed(2)}</span>
                </div>
              )}
              {!!sale.discount_amount && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                  <span>Desconto:</span>
                  <span>- R$ {sale.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {!!sale.surcharge_amount && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Acréscimo:</span>
                  <span>+ R$ {sale.surcharge_amount.toFixed(2)}</span>
                </div>
              )}
              {!!sale.interest_amount && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                  <span>Juros ({sale.interest_rate || 0}%):</span>
                  <span>+ R$ {sale.interest_amount.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {type === 'venda_normal' && sale && (
            <div className="mb-3 space-y-1 text-right text-xs">
              <div className="flex justify-between">
                <span>Forma Pagto:</span>
                <span className="font-bold uppercase">{sale.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>R$ {sale.total_amount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Fiado Installments Schedule */}
          {type === 'venda_fiado' && sale && (
            <div className="mb-3">
              <div className="flex justify-between font-bold text-xs mb-2">
                <span>TOTAL VENDA:</span>
                <span>R$ {sale.total_amount.toFixed(2)}</span>
              </div>
              <p className="font-bold text-[11px] mb-1 uppercase">Plano de Parcelas ({sale.installments_count || 1}x):</p>
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg p-2 space-y-1 text-[10px]">
                {sale.installments && sale.installments.length > 0 ? (
                  sale.installments.map((inst) => (
                    <div key={inst.id} className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1 last:border-0 last:pb-0">
                      <span>
                        Parc. {inst.installment_number}/{inst.total_installments}
                      </span>
                      <span>Venc: {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="font-bold">R$ {inst.amount.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-500">1x parcela única de R$ {sale.total_amount.toFixed(2)}</p>
                )}
              </div>
            </div>
          )}

          {/* Payment receipt info */}
          {(type === 'recebimento' || type === 'quitacao') && (
            <div className="mb-3 space-y-2 text-xs border-b border-dashed border-slate-400 pb-3">
              {previousBalance !== undefined && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Saldo Anterior:</span>
                  <span>R$ {previousBalance.toFixed(2)}</span>
                </div>
              )}
              {paidInstallment && (
                <div className="flex justify-between">
                  <span>Parcela Quitada:</span>
                  <span className="font-bold">
                    {paidInstallment.installment_number} de {paidInstallment.total_installments}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400">
                <span>VALOR RECEBIDO:</span>
                <span>R$ {(receivedAmount || paidInstallment?.amount || sale?.total_amount || 0).toFixed(2)}</span>
              </div>
              {remainingBalance !== undefined && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>Saldo Restante:</span>
                  <span className="font-bold">
                    {remainingBalance === 0 ? '✓ DÍVIDA QUITADA (R$ 0,00)' : `R$ ${remainingBalance.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>Atendente:</span>
                <span>{operatorName}</span>
              </div>
            </div>
          )}

          {/* Totals for normal sales */}
          {(type === 'venda_normal' || type === 'venda_fiado' || type === 'pre_venda') && (
            <div className="space-y-1 pb-3 border-b border-dashed border-slate-400 dark:border-slate-600 text-[11px]">
              <div className="flex justify-between font-black text-sm">
                <span>{type === 'pre_venda' ? 'TOTAL ESTIMADO:' : 'TOTAL DA VENDA:'}</span>
                <span>R$ {(displayTotal || 0).toFixed(2)}</span>
              </div>
              {type === 'venda_normal' && (
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold uppercase">{sale?.payment_method || 'DINHEIRO'}</span>
                </div>
              )}
            </div>
          )}

          {/* Mandatory Disclaimer / Footer */}
          <div className="text-center pt-2 text-[9px] text-slate-500 space-y-1">
            {type === 'pre_venda' ? (
              <p className="font-extrabold text-amber-700 dark:text-amber-400 uppercase text-[9px] leading-tight">
                *** ATENÇÃO ***
                <br />
                Este documento é apenas uma pré-venda e não representa uma venda concluída nem possui valor fiscal.
              </p>
            ) : (
              <p className="font-extrabold text-amber-700 dark:text-amber-400 uppercase text-[9px]">
                Documento de controle interno.
                <br />
                Não possui valor fiscal.
              </p>
            )}
            <p>Obrigado pela preferência!</p>
            <p className="text-[8px]">Aquinos Frios © {new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Action Buttons (screen only) */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={handleSendWhatsapp}
            disabled={isSharing}
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>{isSharing ? 'Gerando...' : 'WhatsApp'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Baixar PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 shadow transition"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

