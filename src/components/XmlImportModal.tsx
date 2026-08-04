/**
 * Aquinos Frios - NF-e XML Import Component
 * Handles XML invoice file reading, smart product matching/linking, unit conversions, and 1-click test generator.
 */

import React, { useState } from 'react';
import {
  FileCode2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  X,
  Sparkles,
  ArrowRight,
  FileCheck,
  Trash2,
  History,
} from 'lucide-react';
import { Product, XmlImportItem } from '../types';
import { parseNFeXml, generateSampleNFeXml, ParsedNFe } from '../lib/xmlParser';
import { storage } from '../services/storage';

interface XmlImportModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const XmlImportModal: React.FC<XmlImportModalProps> = ({
  isOpen,
  products,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [xmlText, setXmlText] = useState<string | null>(null);
  const [parsedNFe, setParsedNFe] = useState<ParsedNFe | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'import' | 'history'>('import');

  const xmlImports = storage.getXmlImports();

  const handleDeleteXmlImport = (importId: string, nfeNum: string) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir a entrada da NF-e #${nfeNum}? Isso irá reverter o estoque adicionado por esta nota.`
      )
    ) {
      try {
        const res = storage.deleteXmlImportWithStockRollback(importId);
        alert(`Entrada XML excluída com sucesso! ${res.rolledBackItems} item(ns) tiveram seu estoque revertido.`);
        onSuccess();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir entrada XML.');
      }
    }
  };

  // Mappings per item index
  const [itemMappings, setItemMappings] = useState<Record<number, any>>({});

  // Step 1: Read XML File or Sample
  const handleFileUpload = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        processXmlText(text);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao ler arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateSampleXml = () => {
    setErrorMsg(null);
    const sampleXml = generateSampleNFeXml();
    processXmlText(sampleXml);
  };

  const processXmlText = (text: string) => {
    try {
      const parsed = parseNFeXml(text);
      setXmlText(text);
      setParsedNFe(parsed);

      // Auto-match items against catalog & stored links
      const storedLinks = storage.getXmlLinks();
      const initialMappings: Record<number, any> = {};

      parsed.items.forEach((item, index) => {
        const xmlUnitLower = item.uCom.toLowerCase();
        let defaultTargetUnit = 'kg';
        let defaultFactor = 1;

        if (xmlUnitLower.includes('cx') || xmlUnitLower.includes('caixa') || xmlUnitLower.includes('fardo')) {
          defaultTargetUnit = 'kg';
          defaultFactor = 20;
        } else if (xmlUnitLower.includes('un') || xmlUnitLower.includes('pc') || xmlUnitLower.includes('peca')) {
          defaultTargetUnit = 'un';
          defaultFactor = 1;
        } else if (xmlUnitLower.includes('kg') || xmlUnitLower.includes('g')) {
          defaultTargetUnit = 'kg';
          defaultFactor = 1;
        }

        // 1. Check stored link
        const link = storedLinks.find((l) => l.xml_cprod === item.cProd);
        if (link) {
          const matchedProd = products.find((p) => p.id === link.product_id);
          initialMappings[index] = {
            action: 'link',
            productId: link.product_id,
            targetUnit: matchedProd?.main_unit || defaultTargetUnit,
            convertUnit: link.xml_unit,
            conversionFactor: link.conversion_factor || defaultFactor,
          };
          return;
        }

        // 2. Check barcode match
        if (item.cEAN) {
          const matchedByBarcode = products.find((p) => p.barcode === item.cEAN);
          if (matchedByBarcode) {
            initialMappings[index] = {
              action: 'link',
              productId: matchedByBarcode.id,
              targetUnit: matchedByBarcode.main_unit,
              convertUnit: item.uCom,
              conversionFactor: defaultFactor,
            };
            return;
          }
        }

        // 3. Check fuzzy name match
        const matchedByName = products.find((p) =>
          p.name.toLowerCase().includes(item.xProd.toLowerCase().slice(0, 8))
        );
        if (matchedByName) {
          initialMappings[index] = {
            action: 'link',
            productId: matchedByName.id,
            targetUnit: matchedByName.main_unit,
            convertUnit: item.uCom,
            conversionFactor: defaultFactor,
          };
          return;
        }

        // Default to create
        initialMappings[index] = {
          action: 'create',
          targetUnit: defaultTargetUnit,
          convertUnit: item.uCom,
          conversionFactor: defaultFactor,
        };
      });

      setItemMappings(initialMappings);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar arquivo XML.');
    }
  };

  // Step 2: Confirm & Import
  const handleConfirmImport = () => {
    if (!parsedNFe) return;

    try {
      let importedItemsCount = 0;

      parsedNFe.items.forEach((item, index) => {
        const mapping = itemMappings[index];
        if (!mapping) return;

        let targetProductId = mapping.productId;
        const targetUnit = mapping.targetUnit || 'kg';
        const factor = mapping.conversionFactor || 1;

        // If action is create new product
        if (mapping.action === 'create' || !targetProductId) {
          const conversionsArray = [];
          if (item.uCom.toLowerCase() !== targetUnit.toLowerCase()) {
            conversionsArray.push({
              id: `conv_${Date.now()}_${index}`,
              product_id: '',
              from_unit: item.uCom.toLowerCase(),
              to_unit: targetUnit,
              factor: factor,
            });
          }

          const newProd = storage.saveProduct({
            name: item.xProd,
            main_unit: targetUnit,
            min_stock: 10,
            current_stock: 0,
            barcode: item.cEAN,
            brand: parsedNFe.supplierName.split(' ')[0],
            notes: `Criado via XML NFe #${parsedNFe.nfeNumber}`,
            conversions: conversionsArray,
          });
          targetProductId = newProd.id;
        } else {
          // Linked to existing product - ensure conversion exists if units differ
          const linkedProd = products.find((p) => p.id === targetProductId);
          if (linkedProd && item.uCom.toLowerCase() !== linkedProd.main_unit.toLowerCase()) {
            const hasConv = (linkedProd.conversions || []).some(
              (c) => c.from_unit.toLowerCase() === item.uCom.toLowerCase()
            );
            if (!hasConv) {
              storage.saveUnitConversion(linkedProd.id, {
                from_unit: item.uCom.toLowerCase(),
                to_unit: linkedProd.main_unit,
                factor: factor,
              });
            }
          }
        }

        // Store XML Link for future auto-recognition
        storage.saveXmlLink({
          xml_cprod: item.cProd,
          xml_xprod: item.xProd,
          xml_cean: item.cEAN,
          product_id: targetProductId,
          xml_unit: item.uCom,
          conversion_factor: factor,
        });

        // Register Entry
        storage.registerEntry({
          productId: targetProductId,
          usedQty: item.qCom,
          usedUnit: item.uCom,
          supplierName: parsedNFe.supplierName,
          unitPrice: item.vUnCom,
          totalPrice: item.vProd,
          batchNumber: item.nLote || `LOTE-${parsedNFe.nfeNumber}-${index + 1}`,
          expirationDate: item.dVal,
          origin: 'xml',
          notes: `Importação XML NFe #${parsedNFe.nfeNumber} (${item.qCom} ${item.uCom} -> ${item.qCom * factor} ${targetUnit})`,
        });

        importedItemsCount++;
      });

      // Save XML import record
      storage.recordXmlImport({
        xml_filename: `NFe_${parsedNFe.nfeNumber}.xml`,
        import_date: new Date().toISOString(),
        user_id: '',
        user_name: '',
        nfe_number: parsedNFe.nfeNumber,
        supplier_cnpj: parsedNFe.supplierCnpj,
        supplier_name: parsedNFe.supplierName,
        total_value: parsedNFe.totalValue,
        items_count: importedItemsCount,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao importar itens do XML.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Importar Nota Fiscal XML (NF-e)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reconhecimento automático de produtos, conversão de unidades e exclusão de notas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setModalTab('import');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
              modalTab === 'import'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Nova Importação XML</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTab('history');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
              modalTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Notas Importadas & Exclusão ({xmlImports.length})</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {modalTab === 'history' ? (
          /* XML History & Rollback Deletion View */
          <div className="space-y-4 my-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <strong>Atenção:</strong> Ao excluir uma entrada de NF-e via XML, as movimentações de estoque registradas por ela serão removidas e a quantidade de estoque adicionada será automaticamente subtraída dos produtos.
            </div>

            {xmlImports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                Nenhuma nota fiscal XML foi importada até o momento.
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {xmlImports.map((imp) => (
                  <div
                    key={imp.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black text-xs">
                          NF-e #{imp.nfe_number || 'S/N'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(imp.import_date).toLocaleDateString('pt-BR')}{' '}
                          {new Date(imp.import_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <strong className="text-sm font-extrabold text-slate-900 dark:text-white block mt-1">
                        {imp.supplier_name || 'Fornecedor não identificado'}
                      </strong>

                      <p className="text-xs text-slate-500 mt-0.5">
                        CNPJ: {imp.supplier_cnpj || 'N/A'} | {imp.items_count} item(ns) importado(s) | Total: R${' '}
                        {(imp.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteXmlImport(imp.id, imp.nfe_number)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs shrink-0 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Entrada & Reverter Estoque</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !parsedNFe ? (
          /* Step 1: Upload or Test Generator */
          <div className="space-y-6 my-4">
            {/* Drag & Drop Area */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition">
              <UploadCloud className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                Arraste o arquivo .XML da NF-e ou clique para selecionar
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Aceita arquivos de Nota Fiscal Eletrônica Padrão SEFAZ
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition">
                <span>Selecionar Arquivo XML</span>
                <input
                  type="file"
                  accept=".xml"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Test XML Generator */}
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="font-bold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Quer testar agora sem um arquivo real?</span>
                </span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Gere um XML de teste com itens reais da Sadia, Perdigão e Seara.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateSampleXml}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shrink-0 shadow-sm transition"
              >
                Gerar XML de Teste (1-Clique)
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Parsed XML Preview & Product Mapping Wizard */
          <div className="space-y-4 my-2 text-xs">
            {/* Header NFe Info Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Fornecedor NF-e
                </span>
                <strong className="text-sm font-extrabold text-slate-900 dark:text-white block">
                  {parsedNFe.supplierName}
                </strong>
                <span className="text-[11px] text-slate-500 font-mono">
                  CNPJ: {parsedNFe.supplierCnpj || 'Não informado'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  NFe #{parsedNFe.nfeNumber}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                  R$ {parsedNFe.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">
                  {parsedNFe.items.length} produto(s) localizado(s)
                </span>
              </div>
            </div>

            {/* Items Mapping List */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
              {parsedNFe.items.map((item, idx) => {
                const mapping = itemMappings[idx] || {
                  action: 'create',
                  targetUnit: 'kg',
                  conversionFactor: 1,
                };

                const targetUnit = mapping.targetUnit || 'kg';
                const totalCalculatedStock = (item.qCom * (mapping.conversionFactor || 1)).toFixed(2);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="font-extrabold text-slate-900 dark:text-white text-xs block">
                          {item.xProd}
                        </strong>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Cód: {item.cProd} | GTIN: {item.cEAN || 'S/ GTIN'} | Qtd NFe: <strong>{item.qCom} {item.uCom}</strong>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-slate-800 dark:text-slate-200 block">
                          R$ {item.vProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (R$ {item.vUnCom.toFixed(2)} /{item.uCom})
                        </span>
                      </div>
                    </div>

                    {/* Link Action & Target Unit Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {/* Column 1: Action (Create or Link) */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          1. Ação no Catálogo:
                        </label>
                        <select
                          value={mapping.action === 'link' ? mapping.productId : 'create'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'create') {
                              setItemMappings({
                                ...itemMappings,
                                [idx]: { ...mapping, action: 'create', productId: undefined },
                              });
                            } else {
                              const matched = products.find((p) => p.id === val);
                              setItemMappings({
                                ...itemMappings,
                                [idx]: {
                                  ...mapping,
                                  action: 'link',
                                  productId: val,
                                  targetUnit: matched?.main_unit || mapping.targetUnit,
                                },
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                        >
                          <option value="create">+ Criar Novo Produto no Estoque</option>
                          <optgroup label="Vincular a Produto Existente">
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.current_stock} {p.main_unit})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Column 2: Entry Unit Selection (kg, un, cx) */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          2. Dar Entrada em:
                        </label>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                          {[
                            { id: 'kg', label: 'Kg' },
                            { id: 'un', label: 'Unidade' },
                            { id: 'cx', label: 'Caixa' },
                          ].map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setItemMappings({
                                  ...itemMappings,
                                  [idx]: { ...mapping, targetUnit: u.id },
                                });
                              }}
                              className={`flex-1 py-1 text-[10px] font-extrabold rounded transition ${
                                targetUnit === u.id
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: Conversion Factor & Formula */}
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                          3. Regra (1 {item.uCom} = X {targetUnit}):
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={mapping.conversionFactor}
                            onChange={(e) =>
                              setItemMappings({
                                ...itemMappings,
                                [idx]: {
                                  ...mapping,
                                  conversionFactor: Math.max(0.001, Number(e.target.value) || 1),
                                },
                              })
                            }
                            className="w-20 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-xs"
                          />
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {targetUnit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Presets & Calculated Stock Addition Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                      <div className="flex items-center gap-1 flex-wrap text-[10px]">
                        <span className="font-bold text-indigo-900 dark:text-indigo-200 mr-1">Atalhos:</span>
                        {[
                          { label: 'Cx 20kg', factor: 20, unit: 'kg' },
                          { label: 'Cx 15kg', factor: 15, unit: 'kg' },
                          { label: 'Peça 4kg', factor: 4, unit: 'kg' },
                          { label: 'Fardo 6un', factor: 6, unit: 'un' },
                          { label: 'Direto (1:1)', factor: 1, unit: targetUnit },
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setItemMappings({
                                ...itemMappings,
                                [idx]: {
                                  ...mapping,
                                  targetUnit: preset.unit,
                                  conversionFactor: preset.factor,
                                },
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold hover:bg-indigo-100 transition"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="text-right font-black text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>Entrada Total:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800">
                          +{totalCalculatedStock} {targetUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setParsedNFe(null)}
                className="text-xs font-bold text-slate-500 hover:underline"
              >
                &larr; Selecionar outro XML
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Confirmar e Dar Entrada no Estoque</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
