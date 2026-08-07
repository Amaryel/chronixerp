/**
 * Chronix ERP - Guided Tour Component
 * Tour Guiado Interativo de Onboarding para apresentação das principais funções do ERP.
 */

import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  BookOpenCheck,
  LifeBuoy,
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  renderIcon: () => React.ReactNode;
  badge: string;
  tips: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao Chronix ERP!',
    subtitle: 'Sistema de Gestão Comercial e Controle de Estoque',
    description:
      'Projetado para dar controle total da sua empresa em uma única tela simples e rápida. Acompanhe abaixo como navegar pelos módulos principais.',
    renderIcon: () => <Sparkles className="w-8 h-8 text-amber-400" />,
    badge: 'Passo 1 de 6',
    tips: [
      'Funciona no computador, tablet ou smartphone (PWA).',
      'Ative as notificações para receber alertas de estoque crítico.',
    ],
  },
  {
    title: 'Início & Métricas em Tempo Real',
    subtitle: 'Visão Geral do Patrimônio e Faturamento',
    description:
      'O Dashboard exibe o valor total do seu estoque (custo x venda), lucro bruto potencial, resumo de movimentações e alertas de produtos abaixo do mínimo.',
    renderIcon: () => <LayoutDashboard className="w-8 h-8 text-blue-400" />,
    badge: 'Passo 2 de 6',
    tips: [
      'Clique nos cards para ir direto aos produtos com estoque baixo ou vencimento próximo.',
    ],
  },
  {
    title: 'Cadastro de Produtos e Fator de Conversão',
    subtitle: 'Entrada em Caixas (CX) e Venda em KG/UN',
    description:
      'Cadastre seus itens informando preços de custo e margem. Se você compra produtos em Caixa mas vende em quilos ou unidades, configure o Fator de Conversão de Caixa para automação total!',
    renderIcon: () => <Package className="w-8 h-8 text-emerald-400" />,
    badge: 'Passo 3 de 6',
    tips: [
      '1 Caixa de Queijo Mussarela com 20kg -> Fator = 20. A NF-e multiplicará automaticamente!',
    ],
  },
  {
    title: 'Entradas por Leitura de XML de NF-e',
    subtitle: 'Importação Sem Digitação Manual',
    description:
      'Importe o arquivo .xml da NF-e fornecida pela fábrica ou distribuidora. O sistema cadastra fornecedores, atualiza preços e dá entrada física no estoque.',
    renderIcon: () => <ArrowRightLeft className="w-8 h-8 text-purple-400" />,
    badge: 'Passo 4 de 6',
    tips: [
      'Se importou algo incorreto, o botão "Reverter e Excluir" desfaz a movimentação perfeitamente.',
    ],
  },
  {
    title: 'PDV Balcão, Venda Rápida e Fiado',
    subtitle: 'Operação Ágil com Emissão de Comprovantes',
    description:
      'Realize vendas presenciais, aplique descontos, lance fiados com limite de crédito e imprima recibos térmicos ou salve em PDF.',
    renderIcon: () => <ShoppingCart className="w-8 h-8 text-orange-400" />,
    badge: 'Passo 5 de 6',
    tips: [
      'Cadastre seus clientes no módulo Fiado para manter o histórico de compras e cobranças.',
    ],
  },
  {
    title: 'Central de Ajuda e Suporte "Preciso de Ajuda"',
    subtitle: 'Estamos sempre com você!',
    description:
      'Precisou de ajuda? Clique no ícone "?" no topo de qualquer tela para ler os guias ou use o botão "Preciso de Ajuda" para falar direto com nossa equipe via amaryelcc@gmail.com.',
    renderIcon: () => <LifeBuoy className="w-8 h-8 text-cyan-400" />,
    badge: 'Passo 6 de 6',
    tips: [
      'Você pode refazer este tour a qualquer momento na Central de Ajuda.',
    ],
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header Progress */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            {currentStep.badge}
          </span>
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-blue-500'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto shadow-inner">
            {currentStep.renderIcon()}
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-white">{currentStep.title}</h3>
            <p className="text-xs font-medium text-slate-400 mt-1">{currentStep.subtitle}</p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {currentStep.description}
          </p>

          {/* Practical Tips Box */}
          {currentStep.tips.length > 0 && (
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-left text-xs space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                Dicas de Ouro:
              </span>
              {currentStep.tips.map((tip, idx) => (
                <p key={idx} className="text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>{tip}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Pular Tour
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
          >
            <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Concluir Tour' : 'Próximo'}</span>
            {currentStepIndex === TOUR_STEPS.length - 1 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
