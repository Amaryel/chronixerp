import React, { useState } from 'react';
import { Sliders, ShieldAlert, CheckCircle2, RefreshCw, Save } from 'lucide-react';
import { storage } from '../services/storage';

interface OperationalPreferencesProps {
  onRefresh: () => void;
}

export const OperationalPreferences: React.FC<OperationalPreferencesProps> = ({ onRefresh }) => {
  const currentSettings = storage.getSettings();

  const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(
    currentSettings.allow_negative_stock
  );
  const [autoClearForm, setAutoClearForm] = useState<boolean>(currentSettings.auto_clear_form);
  const [fiadoInterestRate, setFiadoInterestRate] = useState<number | string>(
    currentSettings.fiado_interest_rate !== undefined ? currentSettings.fiado_interest_rate : 5
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const rateNum = typeof fiadoInterestRate === 'number' ? fiadoInterestRate : parseFloat(fiadoInterestRate) || 0;

    storage.updateSettings({
      allow_negative_stock: allowNegativeStock,
      auto_clear_form: autoClearForm,
      fiado_interest_rate: Math.max(0, rateNum),
    });

    setSavedMessage('✓ Configurações salvas e aplicadas com sucesso ao sistema!');
    onRefresh();

    setTimeout(() => {
      setSavedMessage(null);
    }, 4000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
            Preferências Operacionais & Regras de Negócio
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Personalize o comportamento das telas de lançamento, PDV e controle de estoque.
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. CONTROLE DE ESTOQUE INSUFICIENTE */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>1. Controle de Estoque Insuficiente</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Define como o sistema deve agir ao tentar vender ou dar saída em produtos com saldo em estoque menor que a quantidade solicitada.
          </p>

          <div className="space-y-2.5 pt-1">
            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                !allowNegativeStock
                  ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 opacity-80'
              }`}
            >
              <input
                type="radio"
                name="negative_stock"
                checked={!allowNegativeStock}
                onChange={() => setAllowNegativeStock(false)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Não permitir (Recomendado)
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Bloqueia vendas e saídas caso a quantidade seja superior ao saldo em estoque disponível. Exibe mensagem clara detalhando os itens insuficientes.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                allowNegativeStock
                  ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 opacity-80'
              }`}
            >
              <input
                type="radio"
                name="negative_stock"
                checked={allowNegativeStock}
                onChange={() => setAllowNegativeStock(true)}
                className="mt-1 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Permitir estoque negativo
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Permite concluir saídas e vendas normalmente mesmo sem estoque prévio, registrando o saldo negativo para ajuste posterior.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* 2. LIMPEZA AUTOMÁTICA DA TELA */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <RefreshCw className="w-5 h-5 text-indigo-500" />
            <span>2. Comportamento Após Concluir um Lançamento</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Aplica-se às telas de Entradas, Saídas, Pré-Vendas, PDV e Cadastros.
          </p>

          <div className="space-y-2.5 pt-1">
            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                autoClearForm
                  ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 opacity-80'
              }`}
            >
              <input
                type="radio"
                name="auto_clear"
                checked={autoClearForm}
                onChange={() => setAutoClearForm(true)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Limpar tela automaticamente (Padrão)
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Ao salvar uma operação com sucesso, o sistema limpa os campos, esvazia as listas e posiciona o cursor no primeiro campo para agilizar o próximo lançamento.
                </span>
              </div>
            </label>

            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                !autoClearForm
                  ? 'bg-white dark:bg-slate-900 border-slate-400 ring-2 ring-slate-400/20 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 opacity-80'
              }`}
            >
              <input
                type="radio"
                name="auto_clear"
                checked={!autoClearForm}
                onChange={() => setAutoClearForm(false)}
                className="mt-1 text-slate-600 focus:ring-slate-500"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Permanecer na tela com os dados preenchidos
                </span>
                <span className="text-slate-500 dark:text-slate-400 block mt-0.5">
                  Mantém as informações preenchidas na tela após a gravação.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* 3. FINANCEIRO & JUROS VENDAS FIADAS */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <Sliders className="w-5 h-5 text-emerald-500" />
            <span>3. Financeiro & Vendas a Prazo (Fiado)</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Configure a taxa de juros padrão aplicável ao finalizar vendas a prazo (fiado). Ao realizar uma venda fiada, o sistema solicitará confirmação do operador para aplicar este percentual.
          </p>

          <div className="space-y-1.5 pt-1 max-w-xs">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Percentual Padrão de Juros (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={fiadoInterestRate}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setFiadoInterestRate(val === '' ? '' : parseFloat(val));
                }}
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-extrabold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Preferências Operacionais</span>
          </button>
        </div>
      </form>
    </div>
  );
};
