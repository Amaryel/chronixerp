/**
 * Aquinos Frios - Supabase Integration Modal
 * Vincule diretamente sua URL e API Key do Supabase (Acesso exclusivo Superadmin amaryelcc@gmail.com).
 */

import React, { useState } from 'react';
import { Database, Copy, Check, X, Sparkles, Server, Crown, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SUPABASE_SQL_SCHEMA, getSupabaseClient } from '../lib/supabase';
import { User } from '../types';
import { SUPERADMIN_EMAIL, storage } from '../services/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, currentUser }) => {
  if (!isOpen) return null;

  const isSuperadmin =
    currentUser?.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser?.role === 'superadmin';

  const initialConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(initialConfig.url);
  const [key, setKey] = useState(initialConfig.key);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperadmin) {
      setStatusMsg({
        type: 'error',
        text: 'Acesso Restrito: Apenas o Superadmin (amaryelcc@gmail.com) tem permissão para vincular o Supabase.',
      });
      return;
    }

    setTesting(true);
    setStatusMsg(null);

    const cleanUrl = url.trim();
    const cleanKey = key.trim();

    if (!cleanUrl || !cleanKey) {
      saveSupabaseConfig('', '');
      setStatusMsg({
        type: 'info',
        text: 'Configuração do Supabase desvinculada. O sistema funcionará com armazenamento local.',
      });
      setTesting(false);
      return;
    }

    const ok = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);

    if (ok) {
      saveSupabaseConfig(cleanUrl, cleanKey);
      setStatusMsg({
        type: 'success',
        text: '✅ Conexão vinculada com sucesso! Seu projeto Supabase está ativo e sincronizado.',
      });
    } else {
      saveSupabaseConfig(cleanUrl, cleanKey);
      setStatusMsg({
        type: 'error',
        text: '⚠️ Credenciais salvas, mas não foi possível conectar ao Supabase. Verifique a URL e a Anon Key.',
      });
    }
  };

  const handleSyncUsersToSupabase = async () => {
    if (!isSuperadmin) return;
    setSyncingUsers(true);
    setStatusMsg(null);

    const client = getSupabaseClient();
    if (!client) {
      setStatusMsg({
        type: 'error',
        text: 'Cliente Supabase não está configurado. Insira e salve as credenciais válidas acima.',
      });
      setSyncingUsers(false);
      return;
    }

    try {
      const localUsers = storage.getUsers();
      let syncedCount = 0;

      for (const u of localUsers) {
        const { error } = await client.from('usuarios').upsert({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
        });
        if (!error) syncedCount++;
      }

      setStatusMsg({
        type: 'success',
        text: `Sincronização concluída! ${syncedCount} usuário(s) sincronizados com a tabela 'usuarios' do Supabase.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Erro ao sincronizar usuários: ${err?.message || 'Verifique se a tabela "usuarios" foi criada no SQL Editor.'}`,
      });
    } finally {
      setSyncingUsers(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Integração Direta Supabase
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cole a URL e a API Key para vincular o sistema diretamente ao seu banco.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Guard Alert if NOT Superadmin */}
        {!isSuperadmin ? (
          <div className="p-6 text-center space-y-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Acesso Restrito
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apenas o usuário Superadmin <strong className="text-amber-500">{SUPERADMIN_EMAIL}</strong> possui permissão para visualizar e alterar os parâmetros de conexão do banco de dados Supabase.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {statusMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : statusMsg.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleTestAndSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  SUPABASE_URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  SUPABASE_ANON_KEY / SERVICE_ROLE_KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={testing}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition active:scale-98"
                >
                  {testing ? 'Testando Conexão...' : 'Vincular & Testar Conexão'}
                </button>

                <button
                  type="button"
                  onClick={handleSyncUsersToSupabase}
                  disabled={syncingUsers}
                  className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 shrink-0"
                  title="Sincronizar tabela de usuários do aplicativo com o Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingUsers ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Usuários</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Script SQL de Migração (Criação das Tabelas)</span>
                </span>

                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                Execute o script abaixo no <strong>SQL Editor</strong> do seu painel do Supabase para criar as tabelas de produtos, movimentações e usuários.
              </p>

              <pre className="p-3 bg-slate-950 text-slate-300 rounded-xl text-[10px] font-mono max-h-28 overflow-y-auto border border-slate-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
