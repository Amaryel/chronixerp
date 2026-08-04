/**
 * Aquinos Frios - User Profile & Configuration Modal Component
 * Allows editing user information (Name, Email, Role) and managing test data.
 */

import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Check, X, User as UserIcon, Mail, Save, Trash2, AlertTriangle } from 'lucide-react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onRefresh: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onRefresh,
}) => {
  const [name, setName] = useState(currentUser?.name || 'Francisco Aquino');
  const [email, setEmail] = useState(currentUser?.email || 'francisco@aquinosfrios.com.br');
  const [role, setRole] = useState<UserRole>(currentUser?.role || 'admin');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || 'Francisco Aquino');
      setEmail(currentUser.email || 'francisco@aquinosfrios.com.br');
      setRole(currentUser.role || 'admin');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateUserProfile({
      name: name.trim() || 'Francisco Aquino',
      email: email.trim() || 'francisco@aquinosfrios.com.br',
      role,
    });
    setSavedSuccess(true);
    onRefresh();
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
  };

  const handleClearProducts = () => {
    storage.clearAllProducts();
    onRefresh();
    setShowClearConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Configurações do Usuário
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Edite seu perfil e altere permissões de acesso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo do Usuário
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Francisco Aquino"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: francisco@aquinosfrios.com.br"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nível de Acesso (Perfil)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
                  role === 'admin'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>Administrador</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Acesso total ao sistema</span>
                </div>
                {role === 'admin' && <Check className="w-4 h-4 text-amber-500 font-bold shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setRole('funcionario')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
                  role === 'funcionario'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Funcionário</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Operações de estoque</span>
                </div>
                {role === 'funcionario' && <Check className="w-4 h-4 text-emerald-500 font-bold shrink-0" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                <Check className="w-4 h-4" /> Informações salvas com sucesso!
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

        {/* Data Management Section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
            Gerenciamento de Dados de Teste
          </span>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Todos os Produtos Cadastrados</span>
            </button>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirma a exclusão de todos os produtos?</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Isso apagará todos os produtos do cadastro para você iniciar testes do zero.
              </p>
              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleClearProducts}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs"
                >
                  Sim, Excluir Tudo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
