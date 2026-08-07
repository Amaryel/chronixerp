/**
 * Chronix ERP - Help Center ("Central de Ajuda")
 * Módulo completo com tutoriais, pesquisa inteligente, novidades do sistema e suporte direto.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  LifeBuoy,
  Play,
  Sparkles,
  ChevronRight,
  Video,
  CheckCircle2,
  X,
  FileText,
  Clock,
  Eye,
  Tag,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { KnowledgeTutorial, ReleaseNote, User, Company } from '../types';
import { storage } from '../services/storage';

interface HelpCenterProps {
  currentUser: User;
  activeCompany: Company;
  onOpenSupport: () => void;
  onStartTour: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  currentUser,
  activeCompany,
  onOpenSupport,
  onStartTour,
}) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'updates'>('tutorials');
  const [tutorials, setTutorials] = useState<KnowledgeTutorial[]>([]);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTutorial, setSelectedTutorial] = useState<KnowledgeTutorial | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const tuts = storage.getKnowledgeTutorials();
    const rels = storage.getReleaseNotes();
    setTutorials(tuts.filter((t) => t.is_published));
    setReleaseNotes(rels);
  };

  const categories = [
    { id: 'all', name: 'Todos os Tutoriais' },
    { id: 'Primeiros passos', name: 'Primeiros Passos' },
    { id: 'Cadastro de produtos', name: 'Produtos & Conversão' },
    { id: 'Entradas', name: 'Entradas & XML' },
    { id: 'PDV', name: 'Venda Rápida & PDV' },
    { id: 'Fiado', name: 'Fiado & Cobranças' },
  ];

  const filteredTutorials = tutorials.filter((tut) => {
    const matchCategory = selectedCategory === 'all' || tut.category === selectedCategory;
    const matchSearch =
      tut.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tut.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-200">
      {/* Banner Top Header */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Central de Ajuda & Conhecimento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Como podemos ajudar você hoje?
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Consulte tutoriais em texto, assista aos vídeos demonstrativos de operação do ERP ou solicite atendimento direto com nossa equipe técnica.
          </p>

          {/* Buttons Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenSupport}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Preciso de Ajuda / Abrir Suporte</span>
            </button>
            <button
              onClick={onStartTour}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Refazer Tour Guiado</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'tutorials'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tutoriais & Manuais</span>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'updates'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Novidades do Sistema ({releaseNotes.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        {activeTab === 'tutorials' && (
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar em tutoriais..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* TUTORIALS TAB */}
      {activeTab === 'tutorials' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Tutorials Grid */}
          {filteredTutorials.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">Nenhum tutorial encontrado para sua pesquisa.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                Limpar filtros de pesquisa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTutorials.map((tut) => (
                <div
                  key={tut.id}
                  onClick={() => setSelectedTutorial(tut)}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between group space-y-4 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                        {tut.category}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tut.reading_time}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition leading-snug">
                      {tut.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {tut.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400">
                    <span className="flex items-center gap-1">
                      {tut.video_url ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-red-400">Com Vídeo</span>
                        </>
                      ) : (
                        <span>Ler Guia</span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* UPDATES TAB */}
      {activeTab === 'updates' && (
        <div className="space-y-6 max-w-4xl">
          {releaseNotes.map((rel) => (
            <div key={rel.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs rounded-xl">
                    {rel.version}
                  </span>
                  <h2 className="text-base font-bold text-white">{rel.title}</h2>
                </div>
                <span className="text-xs text-slate-500">{new Date(rel.date).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  ✨ Novos Recursos & Módulos
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {rel.features.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              {rel.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    ⚡ Melhorias de Desempenho e Usabilidade
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {rel.improvements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tutorial Detail Modal */}
      {selectedTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-400 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  {selectedTutorial.category}
                </span>
                <h2 className="text-lg font-bold text-white mt-2 leading-tight">
                  {selectedTutorial.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTutorial(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-300 leading-relaxed">
              {selectedTutorial.video_url && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-6 h-6 text-red-400" />
                    <div>
                      <p className="font-bold text-white">Vídeo Demonstrativo de Operação</p>
                      <p className="text-slate-400 text-[11px]">Assista ao passo a passo em vídeo</p>
                    </div>
                  </div>
                  <a
                    href={selectedTutorial.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    <span>Assistir</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Markdown Render simulation */}
              <div className="whitespace-pre-wrap font-sans space-y-3">
                {selectedTutorial.content_markdown}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={onOpenSupport}
                className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Ainda tem dúvidas? Fale com o Suporte</span>
              </button>
              <button
                onClick={() => setSelectedTutorial(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
