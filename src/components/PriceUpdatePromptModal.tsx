import React from 'react';
import { DollarSign, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ChangedPriceItem {
  productName: string;
  oldCost?: number;
  newCost?: number;
  oldSale?: number;
  newSale?: number;
  markup?: number;
}

export interface PriceUpdatePromptModalProps {
  isOpen: boolean;
  changedItems?: ChangedPriceItem[];
  items?: ChangedPriceItem[];
  onConfirmUpdatePermanent?: () => void;
  onConfirmPermanent?: () => void;
  onKeepEntryOnly?: () => void;
  onKeepCurrent?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const PriceUpdatePromptModal: React.FC<PriceUpdatePromptModalProps> = ({
  isOpen,
  changedItems,
  items,
  onConfirmUpdatePermanent,
  onConfirmPermanent,
  onKeepEntryOnly,
  onKeepCurrent,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const displayItems = changedItems || items || [];
  const handleConfirm = onConfirmUpdatePermanent || onConfirmPermanent || (() => {});
  const handleKeepCurrent = onKeepEntryOnly || onKeepCurrent || (() => {});
  const handleClose = onCancel || onClose || (() => {});

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Atualização de Preços do Cadastro
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Entrada de Mercadoria
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
            Os novos preços devem atualizar o cadastro permanente do produto?
          </p>
        </div>

        {displayItems.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Produtos com alteração de preço ({displayItems.length}):
            </span>
            {displayItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
              >
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {item.productName}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <div>
                    Custo:{' '}
                    <span className="text-slate-400 line-through">
                      R$ {(item.oldCost || 0).toFixed(2)}
                    </span>{' '}
                    &rarr;{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">
                      R$ {(item.newCost || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    Venda:{' '}
                    <span className="text-slate-400 line-through">
                      R$ {(item.oldSale || 0).toFixed(2)}
                    </span>{' '}
                    &rarr;{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      R$ {(item.newSale || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sim, atualizar o cadastro permanente do produto</span>
          </button>

          <button
            type="button"
            onClick={handleKeepCurrent}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
          >
            Não, manter apenas nesta entrada
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold text-xs text-center"
          >
            Voltar e revisar entrada
          </button>
        </div>
      </div>
    </div>
  );
};
