/**
 * Chronix ERP - Support Modal ("Preciso de Ajuda")
 * Modal global para abertura de chamados de suporte técnico.
 * Captura dados técnicos da sessão e envia solicitação diretamente com opção mailto para amaryelcc@gmail.com
 */

import React, { useState } from 'react';
import {
  X,
  LifeBuoy,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Clock,
  User,
  Building2,
  Mail,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { User as UserType, Company } from '../types';
import { storage } from '../services/storage';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  activeCompany: Company;
  currentScreenName?: string;
  activeTab?: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeCompany,
  currentScreenName = 'Sistema Início',
}) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const browserInfo = navigator.userAgent.includes('Chrome')
    ? 'Google Chrome / Chromium'
    : navigator.userAgent.includes('Firefox')
    ? 'Mozilla Firefox'
    : navigator.userAgent.includes('Safari')
    ? 'Apple Safari'
    : 'Navegador Web';

  const osInfo = navigator.userAgent.includes('Windows')
    ? 'Windows OS'
    : navigator.userAgent.includes('Macintosh')
    ? 'macOS'
    : navigator.userAgent.includes('Android')
    ? 'Android Mobile/PWA'
    : navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')
    ? 'iOS Mobile/PWA'
    : 'Linux/Unix';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem anexada deve ser menor que 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentUrl(reader.result as string);
      setAttachmentName(file.name);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Por favor, preencha o assunto e a descrição do problema.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const techInfo = {
      screen: currentScreenName,
      date: new Date().toLocaleString('pt-BR'),
      browser: browserInfo,
      os: osInfo,
      device: window.innerWidth < 768 ? 'Smartphone / Mobile' : 'Desktop / Notebook',
      app_version: 'v2.5.0',
    };

    // Save ticket locally and in database engine
    storage.saveSupportTicket({
      subject: subject.trim(),
      description: description.trim(),
      attachment_url: attachmentUrl,
      screen: currentScreenName,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_email: currentUser.email,
      company_id: activeCompany.id,
      company_name: activeCompany.name,
      technical_info: techInfo,
    });

    // Prepare mailto link to amaryelcc@gmail.com with subject "Suporte ChronixErp"
    const mailtoSubject = encodeURIComponent(`Suporte ChronixErp - [${subject.trim()}]`);
    const mailtoBody = encodeURIComponent(
      `SISTEMA CHRONIX ERP - SOLICITAÇÃO DE SUPORTE TÉCNICO\n` +
        `--------------------------------------------------\n` +
        `Data/Hora: ${techInfo.date}\n` +
        `Empresa: ${activeCompany.name} (CNPJ: ${activeCompany.document})\n` +
        `Usuário: ${currentUser.name} (${currentUser.email})\n` +
        `Tela Atual: ${currentScreenName}\n` +
        `Dispositivo: ${techInfo.device} | ${techInfo.os} | ${techInfo.browser}\n` +
        `Versão: ${techInfo.app_version}\n\n` +
        `ASSUNTO: ${subject.trim()}\n\n` +
        `DESCRIÇÃO DETALHADA DO PROBLEMA:\n` +
        `${description.trim()}\n\n` +
        `--------------------------------------------------\n` +
        `Solicitação gerada automaticamente pelo Chronix ERP.`
    );

    const mailtoUrl = `mailto:amaryelcc@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      // Trigger email client in background
      window.open(mailtoUrl, '_blank');
    }, 400);
  };

  const handleReset = () => {
    setSubject('');
    setDescription('');
    setAttachmentUrl(undefined);
    setAttachmentName('');
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Preciso de Ajuda / Suporte Técnico
              </h2>
              <p className="text-xs text-slate-400">
                Canal direto com a equipe técnica (amaryelcc@gmail.com)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Solicitação de Suporte Registrada!</h3>
            <p className="text-sm text-slate-300 max-w-lg mx-auto">
              Seu chamado foi gravado com sucesso no sistema e o seu cliente de e-mail foi acionado com todas as informações técnicas pré-preenchidas para{' '}
              <strong className="text-blue-400">amaryelcc@gmail.com</strong>.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl text-left border border-slate-800 max-w-md mx-auto text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ticket ID: #{Date.now().toString().slice(-6)}</span>
              </p>
              <p>• Empresa: {activeCompany.name}</p>
              <p>• Solicitante: {currentUser.name} ({currentUser.email})</p>
            </div>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Context Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-blue-400" />
                <span>
                  <strong>Usuário:</strong> {currentUser.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>
                  <strong>Empresa:</strong> {activeCompany.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Laptop className="w-4 h-4 text-slate-500" />
                <span>
                  <strong>Tela Atual:</strong> {currentScreenName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>
                  <strong>E-mail Destino:</strong> amaryelcc@gmail.com
                </span>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assunto da Dúvida ou Problema <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Erro ao emitir recibo no PDV, Dúvida no cálculo de estoque..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Descrição Detalhada <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que ocorreu, passos para reproduzir ou o que gostaria de solicitar..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Image Attachment Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Anexar Captura de Tela / Imagem (Opcional)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition">
                  <Paperclip className="w-4 h-4 text-blue-400" />
                  <span>{attachmentName ? 'Trocar Anexo' : 'Escolher Imagem'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {attachmentName && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{attachmentName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(undefined);
                        setAttachmentName('');
                      }}
                      className="text-slate-400 hover:text-red-400 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {attachmentUrl && (
                <div className="mt-2.5 p-2 bg-slate-950 rounded-xl border border-slate-800 max-w-xs">
                  <img
                    src={attachmentUrl}
                    alt="Anexo"
                    className="max-h-28 rounded-lg object-contain mx-auto"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitação de Suporte</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
