/**
 * Aquinos Frios - Report Export Utility
 * Handles exporting reports & tables to PDF, Excel (.xlsx), CSV and Printable Views
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
}

export interface ExportData {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  fileName?: string;
}

export function exportToCSV({ title, columns, rows, fileName }: ExportData) {
  const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headers, ...rowLines].join('\n'); // Add BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName || title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel({ title, columns, rows, fileName }: ExportData) {
  const formattedData = rows.map((row) => {
    const formattedRow: Record<string, any> = {};
    columns.forEach((col) => {
      formattedRow[col.header] = row[col.key] ?? '';
    });
    return formattedRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

  XLSX.writeFile(
    workbook,
    `${fileName || title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

export function exportToPDF({ title, subtitle, columns, rows, fileName }: ExportData) {
  const doc = new jsPDF();

  // Header background
  doc.setFillColor(30, 58, 138); // Primary dark blue
  doc.rect(0, 0, 210, 25, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AQUINOS FRIOS - CONTROLE DE ESTOQUE', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 19);

  // Subtitle / Date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} ${subtitle ? `| ${subtitle}` : ''}`, 14, 32);

  // Table
  const head = [columns.map((c) => c.header)];
  const body = rows.map((r) => columns.map((c) => String(r[c.key] ?? '')));

  autoTable(doc, {
    startY: 36,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - Aquinos Frios PWA`, 14, 287);
  }

  doc.save(`${fileName || title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
