/**
 * Aquinos Frios - PDF Generator Utility
 * Generates standardized receipts (Venda, Venda Fiado, Recebimento, Quitação) using jsPDF.
 * Compatible with Thermal Printers (80mm / 56mm) and A4 documents.
 */

import { jsPDF } from 'jspdf';

export interface ReceiptPDFData {
  type: 'venda_normal' | 'venda_fiado' | 'recebimento' | 'quitacao' | 'pre_venda';
  saleId?: string;
  customerName?: string;
  customerDocument?: string;
  date?: string;
  companyInfo?: {
    name: string;
    subtitle?: string;
    phone?: string;
    address?: string;
    document?: string;
    footerText?: string;
  };
  items?: {
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    discount_type?: 'percent' | 'value';
    discount_value?: number;
    surcharge_type?: 'percent' | 'value';
    surcharge_value?: number;
  }[];
  subtotalAmount?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  interestRate?: number;
  interestAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  payments?: Array<{ method: string; amount: number }>;
  receivedAmount?: number;
  previousBalance?: number;
  remainingBalance?: number;
  operatorName?: string;
  installmentsCount?: number;
  installments?: {
    installment_number: number;
    total_installments: number;
    amount: number;
    due_date: string;
    status: string;
  }[];
  notes?: string;
  paperWidth?: '80mm' | '56mm' | 'A4';
}

const DEFAULT_COMPANY_INFO = {
  name: 'AQUINOS FRIOS',
  subtitle: 'Distribuidora de Frios & Laticínios',
  phone: '(88) 99999-0000',
  footerText: 'Documento de controle interno. Não possui valor fiscal.',
};

/**
 * Creates a jsPDF document populated with standardized receipt content.
 */
export function buildReceiptPDFDoc(data: ReceiptPDFData): jsPDF {
  const company = {
    name: data.companyInfo?.name || DEFAULT_COMPANY_INFO.name,
    subtitle: data.companyInfo?.subtitle || DEFAULT_COMPANY_INFO.subtitle,
    phone: data.companyInfo?.phone || DEFAULT_COMPANY_INFO.phone,
    document: data.companyInfo?.document,
    address: data.companyInfo?.address,
    footerText: data.companyInfo?.footerText || DEFAULT_COMPANY_INFO.footerText,
  };

  const paper = data.paperWidth || '80mm';

  if (paper === 'A4') {
    return buildA4Receipt(data);
  }

  const widthMm = paper === '56mm' ? 56 : 80;
  
  // Calculate dynamic height based on content density
  let contentLines = 25; // base lines
  if (data.items) contentLines += data.items.length * 3;
  if (data.installments) contentLines += data.installments.length * 2;
  const heightMm = Math.max(140, Math.min(300, contentLines * 6));

  const doc = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: 'p',
  });

  const margin = 4;
  const contentWidth = widthMm - margin * 2;
  let y = 6;

  // Center Helper
  const printCenter = (text: string, fontSize = 8, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = (doc.getStringUnitWidth(text) * fontSize) / doc.internal.scaleFactor;
    const x = (widthMm - textWidth) / 2;
    doc.text(text, Math.max(margin, x), y);
    y += fontSize * 0.45;
  };

  const printLine = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('-'.repeat(paper === '56mm' ? 32 : 48), margin, y);
    y += 3.5;
  };

  const printRow = (left: string, right: string, isBold = false) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(left, margin, y);
    const rightWidth = (doc.getStringUnitWidth(right) * 7.5) / doc.internal.scaleFactor;
    doc.text(right, widthMm - margin - rightWidth, y);
    y += 4;
  };

  // Header
  printCenter(company.name.toUpperCase(), paper === '56mm' ? 10 : 12, true);
  if (company.subtitle) printCenter(company.subtitle, 7);
  if (company.document) printCenter(`CNPJ/CPF: ${company.document}`, 6.5);
  if (company.phone) printCenter(`Tel/WhatsApp: ${company.phone}`, 7);
  if (company.address) printCenter(company.address, 6.5);

  const dateFormatted = data.date
    ? new Date(data.date).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');
  printCenter(dateFormatted, 6.5);
  y += 1;
  printLine();

  // Receipt Title
  let title = 'COMPROVANTE DE VENDA';
  if (data.type === 'venda_normal') {
    title = `COMPROVANTE DE VENDA #${(data.saleId || '000000').slice(-6)}`;
  } else if (data.type === 'venda_fiado') {
    title = `VENDA A PRAZO (FIADO) #${(data.saleId || '000000').slice(-6)}`;
  } else if (data.type === 'recebimento') {
    title = 'COMPROVANTE DE RECEBIMENTO';
  } else if (data.type === 'quitacao') {
    title = 'COMPROVANTE DE QUITAÇÃO DE DÍVIDA';
  } else if (data.type === 'pre_venda') {
    title = `PRÉ-VENDA / ORÇAMENTO #${data.saleId || 'PV-1000'}`;
  }

  printCenter(title, 8, true);
  y += 1;
  printLine();

  // Customer Info
  if (data.customerName) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cliente: ${data.customerName}`, margin, y);
    y += 4;
    if (data.customerDocument) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Doc: ${data.customerDocument}`, margin, y);
      y += 3.5;
    }
  }

  // Items List
  if (data.items && data.items.length > 0) {
    printLine();
    printRow('ITEM / QTD', 'SUBTOTAL', true);
    y += 0.5;

    data.items.forEach((it) => {
      // Product Name
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const truncatedName =
        it.product_name.length > (paper === '56mm' ? 22 : 32)
          ? it.product_name.substring(0, paper === '56mm' ? 20 : 30) + '...'
          : it.product_name;
      doc.text(truncatedName, margin, y);

      const subtotalText = `R$ ${it.total_price.toFixed(2)}`;
      const subtotalWidth = (doc.getStringUnitWidth(subtotalText) * 7) / doc.internal.scaleFactor;
      doc.text(subtotalText, widthMm - margin - subtotalWidth, y);
      y += 3.5;

      // Qty x Unit Price
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`  ${it.quantity} ${it.unit} x R$ ${it.unit_price.toFixed(2)}`, margin, y);
      y += 3.5;
    });
    printLine();
  }

  // Totals & Payment Info
  if (data.subtotalAmount !== undefined && (data.discountAmount || data.surchargeAmount || data.interestAmount)) {
    printRow('Subtotal:', `R$ ${data.subtotalAmount.toFixed(2)}`);
  }
  if (data.discountAmount && data.discountAmount > 0) {
    printRow('Desconto:', `- R$ ${data.discountAmount.toFixed(2)}`);
  }
  if (data.surchargeAmount && data.surchargeAmount > 0) {
    printRow('Acréscimo:', `+ R$ ${data.surchargeAmount.toFixed(2)}`);
  }
  if (data.interestAmount && data.interestAmount > 0) {
    printRow(`Juros (${data.interestRate || 0}%):`, `+ R$ ${data.interestAmount.toFixed(2)}`);
  }

  if (data.type === 'venda_normal') {
    if (data.totalAmount !== undefined) {
      printRow('TOTAL DA VENDA:', `R$ ${data.totalAmount.toFixed(2)}`, true);
    }
    if (data.payments && data.payments.length > 0) {
      y += 1;
      printRow('PAGAMENTOS:', '', true);
      data.payments.forEach((p) => {
        printRow(` ${p.method.toUpperCase()}:`, `R$ ${p.amount.toFixed(2)}`);
      });
    } else if (data.paymentMethod) {
      printRow('Forma de Pagto:', data.paymentMethod.toUpperCase());
    }
  } else if (data.type === 'venda_fiado') {
    if (data.totalAmount !== undefined) {
      printRow('TOTAL DA VENDA:', `R$ ${data.totalAmount.toFixed(2)}`, true);
    }
    if (data.installmentsCount) {
      printRow('Parcelas:', `${data.installmentsCount}x`);
    }

    if (data.installments && data.installments.length > 0) {
      y += 1;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('PLANO DE PARCELAS:', margin, y);
      y += 4;

      data.installments.forEach((inst) => {
        const dateStr = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
        const text = `Parc ${inst.installment_number}/${inst.total_installments} (${dateStr})`;
        const val = `R$ ${inst.amount.toFixed(2)}`;
        printRow(text, val);
      });
    }
  } else if (data.type === 'recebimento' || data.type === 'quitacao') {
    if (data.previousBalance !== undefined) {
      printRow('Saldo Anterior:', `R$ ${data.previousBalance.toFixed(2)}`);
    }
    if (data.receivedAmount !== undefined) {
      printRow('VALOR RECEBIDO:', `R$ ${data.receivedAmount.toFixed(2)}`, true);
    }
    if (data.paymentMethod) {
      printRow('Forma de Pagto:', data.paymentMethod);
    }
    if (data.remainingBalance !== undefined) {
      printRow(
        'Saldo Restante:',
        data.remainingBalance === 0 ? 'R$ 0,00 (QUITADO)' : `R$ ${data.remainingBalance.toFixed(2)}`,
        true
      );
    }
  } else if (data.type === 'pre_venda') {
    if (data.totalAmount !== undefined) {
      printRow('TOTAL ESTIMADO:', `R$ ${data.totalAmount.toFixed(2)}`, true);
    }
  }

  if (data.operatorName) {
    y += 1;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Atendente: ${data.operatorName}`, margin, y);
    y += 3.5;
  }

  if (data.notes) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.text(`Obs: ${data.notes}`, margin, y);
    y += 3.5;
  }

  printLine();

  // Mandatory Footer
  if (data.type === 'pre_venda') {
    printCenter('*** ATENÇÃO: PRÉ-VENDA ***', 7, true);
    printCenter('Este documento é apenas uma pré-venda', 6.5, true);
    printCenter('e não representa uma venda concluída', 6.5, true);
    printCenter('nem possui valor fiscal.', 6.5, true);
  } else {
    printCenter('*** ATENÇÃO ***', 7, true);
    printCenter(company.footerText, 6, true);
  }
  y += 1;
  printCenter('Obrigado pela preferência!', 6.5);
  printCenter(`${company.name} © ${new Date().getFullYear()}`, 6);

  return doc;
}

/**
 * Creates an A4 format receipt document.
 */
function buildA4Receipt(data: ReceiptPDFData): jsPDF {
  const company = {
    name: data.companyInfo?.name || DEFAULT_COMPANY_INFO.name,
    subtitle: data.companyInfo?.subtitle || DEFAULT_COMPANY_INFO.subtitle,
    phone: data.companyInfo?.phone || DEFAULT_COMPANY_INFO.phone,
    document: data.companyInfo?.document,
    address: data.companyInfo?.address,
    footerText: data.companyInfo?.footerText || DEFAULT_COMPANY_INFO.footerText,
  };

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'p',
  });

  let y = 15;
  const margin = 15;
  const pageWidth = 210;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name.toUpperCase(), margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (company.subtitle) doc.text(company.subtitle, margin, y);
  if (company.phone) doc.text(`Telefone: ${company.phone}`, pageWidth - margin - 60, y);
  y += 10;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  let title = 'COMPROVANTE DE VENDA';
  if (data.type === 'venda_fiado') title = 'COMPROVANTE DE VENDA A PRAZO (FIADO)';
  if (data.type === 'recebimento') title = 'COMPROVANTE DE RECEBIMENTO';
  if (data.type === 'quitacao') title = 'COMPROVANTE DE QUITAÇÃO DE DÍVIDA';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data/Hora: ${data.date ? new Date(data.date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}`, margin, y);
  if (data.customerName) {
    doc.text(`Cliente: ${data.customerName}`, margin + 80, y);
  }
  y += 10;

  if (data.items && data.items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Produto', margin, y);
    doc.text('Qtd / Un', margin + 90, y);
    doc.text('Preço Un.', margin + 130, y);
    doc.text('Subtotal', margin + 160, y);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    data.items.forEach((it) => {
      doc.text(it.product_name, margin, y);
      doc.text(`${it.quantity} ${it.unit}`, margin + 90, y);
      doc.text(`R$ ${it.unit_price.toFixed(2)}`, margin + 130, y);
      doc.text(`R$ ${it.total_price.toFixed(2)}`, margin + 160, y);
      y += 6;
    });
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (data.totalAmount !== undefined) {
    doc.text(`Total: R$ ${data.totalAmount.toFixed(2)}`, margin, y);
  }
  if (data.receivedAmount !== undefined) {
    doc.text(`Valor Recebido: R$ ${data.receivedAmount.toFixed(2)}`, margin + 60, y);
  }
  if (data.remainingBalance !== undefined) {
    doc.text(`Saldo Restante: R$ ${data.remainingBalance.toFixed(2)}`, margin + 120, y);
  }
  y += 15;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(company.footerText, margin, y);

  return doc;
}

/**
 * Generates Blob of the PDF receipt.
 */
export function generateReceiptPDFBlob(data: ReceiptPDFData): Blob {
  const doc = buildReceiptPDFDoc(data);
  return doc.output('blob');
}

/**
 * Triggers PDF file download directly in browser.
 */
export function downloadReceiptPDF(data: ReceiptPDFData, filename?: string): void {
  const doc = buildReceiptPDFDoc(data);
  const name =
    filename ||
    `comprovante_${data.type}_${data.saleId || Date.now()}_${new Date()
      .toISOString()
      .split('T')[0]}.pdf`;
  doc.save(name);
}

/**
 * Share PDF file using Web Share API or return text fallback.
 */
export async function shareReceiptPDF(
  data: ReceiptPDFData
): Promise<{ sharedFile: boolean; whatsappUrl: string }> {
  const companyName = data.companyInfo?.name || DEFAULT_COMPANY_INFO.name;
  const companySub = data.companyInfo?.subtitle || DEFAULT_COMPANY_INFO.subtitle;
  const companyFooter = data.companyInfo?.footerText || DEFAULT_COMPANY_INFO.footerText;

  const blob = generateReceiptPDFBlob(data);
  const filename = `comprovante_${data.type}_${(data.saleId || Date.now().toString()).slice(-6)}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });

  // Format Whatsapp text as fallback
  let text = `*${companyName.toUpperCase()}*\n${companySub}\n------------------------------\n`;
  if (data.type === 'venda_normal') {
    text += `*COMPROVANTE DE VENDA #${(data.saleId || '').slice(-6)}*\n`;
    text += `Data: ${data.date ? new Date(data.date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}\n`;
    if (data.customerName) text += `Cliente: ${data.customerName}\n`;
    text += `Pagamento: ${(data.paymentMethod || 'DINHEIRO').toUpperCase()}\n`;
    if (data.totalAmount !== undefined) text += `*TOTAL: R$ ${data.totalAmount.toFixed(2)}*\n`;
  } else if (data.type === 'venda_fiado') {
    text += `*COMPROVANTE DE VENDA A PRAZO (FIADO) #${(data.saleId || '').slice(-6)}*\n`;
    text += `Cliente: ${data.customerName || 'Não informado'}\n`;
    if (data.totalAmount !== undefined) text += `Total: R$ ${data.totalAmount.toFixed(2)}\n`;
    if (data.installmentsCount) text += `Parcelas: ${data.installmentsCount}x\n`;
  } else if (data.type === 'pre_venda') {
    text += `*PRÉ-VENDA / ORÇAMENTO #${data.saleId || 'PV-1000'}*\n`;
    text += `Data: ${data.date ? new Date(data.date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}\n`;
    if (data.customerName) text += `Cliente: ${data.customerName}\n`;
    if (data.totalAmount !== undefined) text += `*TOTAL ESTIMADO: R$ ${data.totalAmount.toFixed(2)}*\n`;
    text += `\n*ATENÇÃO:* Este documento é apenas uma pré-venda e não representa uma venda concluída nem possui valor fiscal.\n`;
  } else {
    text += `*COMPROVANTE DE RECEBIMENTO / QUITAÇÃO*\n`;
    text += `Cliente: ${data.customerName || 'Não informado'}\n`;
    if (data.receivedAmount !== undefined) text += `Valor Recebido: R$ ${data.receivedAmount.toFixed(2)}\n`;
    if (data.remainingBalance !== undefined) text += `Saldo Restante: R$ ${data.remainingBalance.toFixed(2)}\n`;
  }
  text += `------------------------------\n_${companyFooter}_`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  // Attempt Web Share API if browser supports files
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Comprovante ${companyName}`,
          text: `Comprovante de Venda/Recebimento - ${companyName}`,
          files: [file],
        });
        return { sharedFile: true, whatsappUrl };
      }
    } catch (e) {
      console.warn('File share canceled or not supported:', e);
    }
  }

  return { sharedFile: false, whatsappUrl };
}
