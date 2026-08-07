/**
 * Chronix ERP - Context Help Drawer ("Como Usar")
 * Painel Deslizante de Ajuda Contextual específico para a tela/módulo ativo no momento.
 */

import React from 'react';
import {
  X,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  PlayCircle,
  LifeBuoy,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { NavTab } from './Navigation';

interface ContextHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onOpenSupport: () => void;
  onStartTour: () => void;
  onOpenHelpCenter: () => void;
}

const TAB_HELP_CONTENT: Record<
  string,
  {
    title: string;
    subtitle: string;
    summary: string;
    steps: string[];
    tips: string[];
    faqs: { question: string; answer: string }[];
  }
> = {
  dashboard: {
    title: 'Como Usar o Início / Dashboard',
    subtitle: 'Painel Geral de Desempenho e Indicadores do ERP',
    summary:
      'O Dashboard reúne as métricas vitais da sua empresa em tempo real: valor total do estoque, entradas/saídas do dia, produtos com estoque crítico e faturamento.',
    steps: [
      'Observe os cards de resumo no topo para verificar o patrimônio em estoque e faturamento diário.',
      'Acompanhe o gráfico de movimentações diárias para entender o fluxo de entrada e saída.',
      'Verifique a tabela de produtos com Estoque Baixo / Vencimento Próximo para emitir novas ordens de compra.',
      'Utilize os botões de Acesso Rápido para ir direto para Importação XML, Nova Venda ou Cadastro de Produtos.',
    ],
    tips: [
      'Você pode filtrar por categoria para ver dados de estoque de um setor específico.',
      'O valor de custo x valor de venda calcula seu potencial de lucro bruto total.',
    ],
    faqs: [
      {
        question: 'Com que frequência os dados do Dashboard são atualizados?',
        answer: 'Em tempo real. Cada venda, entrada por XML ou ajuste atualiza os totais imediatamente.',
      },
      {
        question: 'O que significa o alerta vermelho no card de Estoque?',
        answer: 'Indica que há produtos cujas quantidades físicas estão abaixo do estoque mínimo definido.',
      },
    ],
  },
  products: {
    title: 'Como Usar o Cadastro de Produtos',
    subtitle: 'Gestão Completa de Itens, Preços e Fatores de Conversão',
    summary:
      'Nesta tela você cadastra e gerencia todos os produtos da sua distribuidora/empresa, ajusta margens de lucro e configura a conversão de Caixas (CX) para Quilos (KG) ou Unidades (UN).',
    steps: [
      'Clique no botão "+ Novo Produto" no canto superior direito.',
      'Informe o Nome do Produto, Código de Barras (opcional) e Categoria.',
      'Defina a Unidade Principal (ex: KG, UN ou CX) e o Estoque Mínimo para alertas.',
      'Ajuste o Preço de Custo e a Margem desejada (Markup). O sistema sugerirá o Preço de Venda.',
      'Se o produto é comprado em Caixa e vendido em KG/UN, configure o Fator de Conversão de Caixa.',
      'Clique em "Salvar Produto".',
    ],
    tips: [
      'Sempre preencha o Fator de Conversão se você compra em caixas (ex: 1 CX = 20 KG). Assim a importação XML dará entrada automática na unidade correta!',
      'Você pode exportar a lista de produtos para Excel ou PDF usando os botões de ação.',
    ],
    faqs: [
      {
        question: 'O que acontece ao alterar o Preço de Venda?',
        answer: 'O novo preço passará a ser utilizado imediatamente em todas as vendas novas no PDV e Venda Rápida.',
      },
      {
        question: 'Como funciona a Exclusão de Produto?',
        answer: 'Somente administradores podem excluir. O histórico de movimentações anteriores é mantido para fins de auditoria.',
      },
    ],
  },
  entries: {
    title: 'Como Usar as Entradas e Leitura de XML de NF-e',
    subtitle: 'Importação Automática de Notas Fiscais e Reposição de Estoque',
    summary:
      'Importe notas fiscais eletrônicas de fornecedores em arquivo XML para dar entrada automática no estoque sem digitação manual.',
    steps: [
      'Clique em "Importar XML de NF-e" e selecione o arquivo .xml fornecido pela distribuidora/fábrica.',
      'O sistema lerá o CNPJ do fornecedor e todos os itens constantes na nota fiscal.',
      'Relacione os itens do XML com os produtos já cadastrados no seu sistema (a relação fica salva para as próximas notas!).',
      'Caso a nota utilize unidade CX (Caixa), selecione o Fator de Conversão para multiplicar pela quantidade em KG ou UN.',
      'Revise os preços de custo e quantidades lidos.',
      'Clique em "Confirmar e Processar Entrada". O estoque e lotes serão atualizados na hora.',
    ],
    tips: [
      'Se você importou uma NF-e por engano, vá em "Histórico de XMLs Importados" e clique no botão "Reverter e Excluir". O sistema reverterá automaticamente o saldo de estoque adicionado!',
    ],
    faqs: [
      {
        question: 'O que acontece se o fornecedor não constar no sistema?',
        answer: 'O sistema cadastra o fornecedor automaticamente a partir do CNPJ constante na NF-e.',
      },
    ],
  },
  venda_rapida: {
    title: 'Como Usar a Venda Rápida e PDV Balcão',
    subtitle: 'Registro Ágil de Vendas, Impressão de Comprovantes e Emissão de Recibo',
    summary:
      'Realize vendas presenciais de balcão com agilidade. Suporta leitor de código de barras, busca rápida e seleção de forma de pagamento.',
    steps: [
      'Pesquise o produto digitando o nome ou utilizando um leitor de código de barras.',
      'Informe a quantidade vendida (em KG, UN ou CX). O valor total é calculado dinamicamente.',
      'Selecione a forma de pagamento (Dinheiro, PIX, Débito, Crédito ou Fiado).',
      'Se for venda no Fiado, selecione o cliente cadastrado.',
      'Clique em "Finalizar Venda". O recibo/comprovante será gerado com opção de impressão térmica ou download.',
    ],
    tips: [
      'Para vendas de itens pesados por balança, digite o peso em quilos usando vírgula ou ponto (ex: 2.500 para 2.5kg).',
    ],
    faqs: [
      {
        question: 'Posso dar desconto no momento da venda?',
        answer: 'Sim, você pode aplicar desconto em valor fixo ou percentual antes de finalizar.',
      },
    ],
  },
  fiados: {
    title: 'Como Usar a Gestão de Fiado e Cobranças',
    subtitle: 'Controle de Vendas a Prazo, Limites de Crédito e Recebimento de Conta',
    summary:
      'Acompanhe os débitos em aberto de clientes, emita extratos, registre pagamentos parciais e envie comprovantes.',
    steps: [
      'Visualize o saldo devedor acumulado de cada cliente na tabela principal.',
      'Clique sobre o cliente para abrir o Extrato Detalhado de Vendas e Pagamentos.',
      'Para dar baixa em um débito, clique em "Baixar / Receber Pagamento".',
      'Digite o valor recebido e a forma de pagamento (Dinheiro, PIX, etc.).',
      'Confirme o recebimento. O saldo do cliente será atualizado e o recibo de quitação gerado.',
    ],
    tips: [
      'Você pode definir limites de crédito para cada cliente no módulo de Clientes para evitar inadimplência.',
    ],
    faqs: [
      {
        question: 'O que ocorre se o cliente pagar apenas uma parte da dívida?',
        answer: 'O pagamento é registrado como abatimento parcial e o saldo restante continua em aberto.',
      },
    ],
  },
};

const DEFAULT_HELP = {
  title: 'Como Usar esta Funcionalidade',
  subtitle: 'Guia Geral de Operação do Chronix ERP',
  summary:
    'O Chronix ERP oferece ferramentas avançadas de gestão com segurança, relatórios e auditoria contínua.',
  steps: [
    'Navegue pelos submenus no topo para acessar o módulo desejado.',
    'Utilize a barra de pesquisa presente em todas as tabelas para filtrar dados rapidamente.',
    'Em caso de dúvidas técnicas ou problemas, acesse o botão "Preciso de Ajuda".',
  ],
  tips: [
    'Mantenha sempre o cadastro de clientes e produtos atualizados para relatórios mais precisos.',
  ],
  faqs: [
    {
      question: 'Como falar com o suporte?',
      answer: 'Clique no botão "Preciso de Ajuda" ou envie um e-mail para amaryelcc@gmail.com.',
    },
  ],
};

export const ContextHelpDrawer: React.FC<ContextHelpDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onOpenSupport,
  onStartTour,
  onOpenHelpCenter,
}) => {
  if (!isOpen) return null;

  const content = TAB_HELP_CONTENT[activeTab] || DEFAULT_HELP;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-200 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="bg-gradient-to-b from-blue-950 to-slate-900 p-6 border-b border-slate-800 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{content.title}</h2>
                <p className="text-xs text-blue-300/80 mt-0.5">{content.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              {content.summary}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold transition"
              >
                <PlayCircle className="w-4 h-4 text-blue-400" />
                <span>Refazer Tour</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenHelpCenter();
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-xs font-semibold transition"
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>Central de Ajuda</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Passo a Passo de Operação</span>
              </h3>
              <ol className="space-y-2.5 text-xs">
                {content.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Practical Tips */}
            {content.tips.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Dicas Importantes</span>
                </h3>
                <div className="space-y-2">
                  {content.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 leading-relaxed"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {content.faqs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-400" />
                  <span>Dúvidas Frequentes</span>
                </h3>
                <div className="space-y-2.5">
                  {content.faqs.map((faq, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{faq.question}</span>
                      </p>
                      <p className="text-xs text-slate-400 pl-4 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer - Need Support */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Não encontrou o que procurava?</span>
              <span className="text-[10px] text-slate-500">Suporte 24/7</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSupport();
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Solicitar Suporte Técnico ("Preciso de Ajuda")</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
