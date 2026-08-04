/**
 * Aquinos Frios - Configurações e Ferramentas Auxiliares
 */

import React, { useState } from 'react';
import {
  FileCode2,
  Database,
  Calendar,
  FileSpreadsheet,
  ShieldCheck,
  User,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Product, Batch, Movement, Category, User as UserType } from '../types';
import { XmlImportModal } from './XmlImportModal';
import { BatchManager } from './BatchManager';
import { InventoryManager } from './InventoryManager';
import { Reports } from './Reports';
import { AuditLogView } from './AuditLogView';
import { UserProfileModal } from './UserProfileModal';
import { SupabaseModal } from './SupabaseModal';
import { OperationalPreferences } from './OperationalPreferences';
import { storage } from '../services/storage';

interface SettingsPageProps {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  categories: Category[];
  currentUser: UserType;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  products,
  batches,
  movements,
  categories,
  currentUser,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'preferences' | 'xml' | 'batches' | 'inventory' | 'reports' | 'audit' | 'profile' | 'supabase'
  >('preferences');

  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 bg-slate-600/50 text-slate-200 rounded-md text-xs font-bold uppercase tracking-wider mb-1">
            Painel do Sistema
          </span>
          <h1 className="text-2xl font-black tracking-tight">Configurações & Ferramentas</h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Preferências operacionais, importação XML, relatórios, backup e auditoria.
          </p>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'preferences', label: 'Preferências Operacionais', icon: Sliders },
          { id: 'xml', label: 'Importar XML', icon: FileCode2 },
          { id: 'batches', label: 'Lotes e Validades', icon: Calendar },
          { id: 'inventory', label: 'Inventário de Estoque', icon: Sliders },
          { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
          { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
          { id: 'profile', label: 'Perfil do Usuário', icon: User },
          { id: 'supabase', label: 'Banco Supabase', icon: Database },
        ].map((sub) => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => {
                if (sub.id === 'xml') setIsXmlModalOpen(true);
                else if (sub.id === 'profile') setIsProfileModalOpen(true);
                else if (sub.id === 'supabase') setIsSupabaseModalOpen(true);
                else setActiveSubTab(sub.id as any);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main SubTab Content */}
      {activeSubTab === 'preferences' && (
        <OperationalPreferences onRefresh={onRefresh} />
      )}

      {activeSubTab === 'batches' && (
        <BatchManager
          products={products}
          batches={batches}
          currentUser={currentUser}
          onRefresh={onRefresh}
        />
      )}

      {activeSubTab === 'inventory' && (
        <InventoryManager
          products={products}
          currentUser={currentUser}
          onRefresh={onRefresh}
        />
      )}

      {activeSubTab === 'reports' && (
        <Reports
          products={products}
          batches={batches}
          movements={movements}
          categories={categories}
        />
      )}

      {activeSubTab === 'audit' && (
        <AuditLogView logs={storage.getAuditLogs()} />
      )}

      {/* Modals triggered from settings */}
      <XmlImportModal
        isOpen={isXmlModalOpen}
        products={products}
        onClose={() => setIsXmlModalOpen(false)}
        onSuccess={onRefresh}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onRefresh={onRefresh}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        currentUser={currentUser}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
