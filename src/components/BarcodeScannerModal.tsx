/**
 * Aquinos Frios - Camera Barcode & EAN Scanner Component
 * Uses HTML5 Camera Stream / html5-qrcode with manual desktop simulation overlay.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Barcode, Search, X, CheckCircle2, ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react';
import { Product } from '../types';
import { formatStockDisplay } from '../lib/unitConverter';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onSelectEntry: (prod: Product) => void;
  onSelectExit: (prod: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  products,
  onClose,
  onSelectEntry,
  onSelectExit,
}) => {
  if (!isOpen) return null;

  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [cameraError, setCameraError] = useState<boolean>(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize camera scanner
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null;

    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 180 } },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          setScannedResult(decodedText);
          lookupProduct(decodedText);
        },
        (error) => {
          // Continuous scan error - ignore
        }
      );

      scannerRef.current = html5QrcodeScanner;
    } catch (err) {
      console.warn('Camera barcode scanner error:', err);
      setCameraError(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error(e));
      }
    };
  }, []);

  const lookupProduct = (code: string) => {
    const clean = code.trim().toLowerCase();
    const found = products.find((p) => p.barcode && p.barcode.trim().toLowerCase() === clean);
    setMatchedProduct(found || null);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setScannedResult(manualCode.trim());
    lookupProduct(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Leitor de Código de Barras (EAN)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aponte a câmera para o produto ou digite o código EAN.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Feed Stream Area */}
        <div className="mb-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[220px] flex items-center justify-center relative">
          <div id="reader" className="w-full text-white text-xs" />

          {cameraError && (
            <div className="p-4 text-center text-slate-400 text-xs">
              <Camera className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <span>Câmera indisponível ou permissão pendente. Use a busca manual abaixo.</span>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Simulation */}
        <form onSubmit={handleManualSearch} className="mb-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Ou Digite/Bipe o Código EAN Manualmente:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: 7891025100201"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs"
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Match Result Display & Actions */}
        {scannedResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">EAN Lido:</span>
              <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400">
                {scannedResult}
              </span>
            </div>

            {matchedProduct ? (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {matchedProduct.name}
                    </h4>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Estoque atual: <strong>{formatStockDisplay(matchedProduct, matchedProduct.current_stock)}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      onSelectEntry(matchedProduct);
                      onClose();
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>+ Dar Entrada</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectExit(matchedProduct);
                      onClose();
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>- Dar Saída</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-rose-600 dark:text-rose-400 font-bold text-xs">
                ⚠️ Nenhum produto cadastrado com o código {scannedResult}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
