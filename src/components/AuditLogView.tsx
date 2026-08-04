/**
 * Aquinos Frios - Audit Trail Component (Auditoria Completa)
 */

import React, { useState } from 'react';
import { ShieldCheck, Search, Shield, UserCheck, Clock } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Auditoria & Registro de Operações</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rastreabilidade total de cadastros, entradas, saídas, alterações e acessos no sistema.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por ação, usuário ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {log.details}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Por: {log.user_name} ({log.user_role.toUpperCase()})
                  </span>
                  <span>•</span>
                  <span className="uppercase font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {log.action}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                {new Date(log.date).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
