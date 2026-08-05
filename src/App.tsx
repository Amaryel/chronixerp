/**
 * Aquinos Frios - Main PWA Application
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { VendaRapida } from './components/VendaRapida';
import { CustomerManager } from './components/CustomerManager';
import { SettingsPage } from './components/SettingsPage';
import { MovementModal } from './components/MovementModal';
import { XmlImportModal } from './components/XmlImportModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { HistoryList } from './components/HistoryList';
import { UserProfileModal } from './components/UserProfileModal';
import { SupabaseModal } from './components/SupabaseModal';
import { UserManagementModal } from './components/UserManagementModal';
import { LoginPage } from './components/LoginPage';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { FullMovementPage } from './components/FullMovementPage';
import { FiadoManagement } from './components/FiadoManagement';
import { BulkPriceUpdate } from './components/BulkPriceUpdate';
import { BulkStockAdjustment } from './components/BulkStockAdjustment';
import { Reports } from './components/Reports';

import { Product, Batch, Movement, Category, Supplier, User, Company } from './types';
import { storage, SUPERADMIN_EMAIL } from './services/storage';
import { Building2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aquinos_dark_mode') === 'true';
  });

  // Reactive State from storage
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company>(storage.getCurrentUserCompany());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (localStorage.getItem('aquinos_remember_me') !== 'true') {
      localStorage.removeItem('aquinos_current_user');
    }
    return storage.getCurrentUser();
  });

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null);

  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(() => {
    const user = storage.getCurrentUser();
    if (user && (user.email.toLowerCase() === SUPERADMIN_EMAIL || user.role === 'superadmin')) {
      return true;
    }
    return false;
  });

  // Sync state from storage
  const loadState = () => {
    setProducts(storage.getProducts());
    setCategories(storage.getCategories());
    setSuppliers(storage.getSuppliers());
    setBatches(storage.getBatches());
    setMovements(storage.getMovements());
    setCompanies(storage.getCompanies());
    setActiveCompany(storage.getCurrentUserCompany());
    setCurrentUser(storage.getCurrentUser());
  };

  useEffect(() => {
    loadState();
    const unsubscribe = storage.subscribe(() => {
      loadState();
    });
    return () => unsubscribe();
  }, []);

  // Sync Dark Mode class on <html> element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aquinos_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aquinos_dark_mode', 'false');
    }
  }, [darkMode]);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const handleBrandClick = () => {
    if (activeTab === 'dashboard') return;
    if (['venda_rapida', 'entries', 'exits'].includes(activeTab)) {
      const confirmProceed = window.confirm(
        'Atenção: Há uma operação em andamento (no Caixa ou Movimentação de Estoque).\n\nDeseja cancelar/sair e voltar para a Tela Inicial?'
      );
      if (!confirmProceed) return;
    }
    setActiveTab('dashboard');
  };

  const handleOpenEntry = (prod?: Product) => {
    if (prod) {
      setSelectedProductForMovement(prod);
      setIsEntryModalOpen(true);
    } else {
      setActiveTab('entries');
    }
  };

  const handleOpenExit = (prod?: Product) => {
    if (prod) {
      setSelectedProductForMovement(prod);
      setIsExitModalOpen(true);
    } else {
      setActiveTab('exits');
    }
  };

  // Badge counters
  const lowStockCount = products.filter((p) => p.current_stock <= p.min_stock).length;
  const expiringCount = batches.filter((b) => {
    if (b.current_qty <= 0) return false;
    const exp = new Date(b.expiration_date);
    const d30 = new Date(Date.now() + 30 * 86400000);
    return exp <= d30;
  }).length;

  const activeSession = storage.getActiveSession();

  if (!activeSession) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadState();
          if (user.email.toLowerCase() === SUPERADMIN_EMAIL || user.role === 'superadmin') {
            setIsUserManagementModalOpen(true);
          }
        }}
      />
    );
  }

  const isSuperadmin =
    currentUser.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser.role === 'superadmin';
  const superadminCompanyOverride = storage.getSuperadminSelectedCompanyId();

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased selection:bg-blue-500 selection:text-white pb-24 lg:pb-0`}>
      {/* Superadmin Active Company Override Banner */}
      {isSuperadmin && superadminCompanyOverride && (
        <div className="bg-amber-400 dark:bg-amber-500 text-slate-950 font-black text-xs py-2 px-4 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>
              Modo Superadmin Ativo: Você está visualizando os dados e operações da empresa <strong>{activeCompany?.name} ({activeCompany?.document})</strong>
            </span>
          </div>
          <button
            onClick={() => {
              storage.setSuperadminSelectedCompanyId(null);
              loadState();
            }}
            className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition active:scale-95"
          >
            Voltar para Visão Padrão
          </button>
        </div>
      )}

      {/* Top Header */}
      <Header
        user={currentUser}
        activeCompany={activeCompany}
        companies={companies}
        onSelectCompany={(compId) => {
          storage.setSuperadminSelectedCompanyId(compId);
          loadState();
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onLogout={() => {
          storage.logout();
          loadState();
        }}
        onBrandClick={handleBrandClick}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        lowStockCount={lowStockCount}
        expiringCount={expiringCount}
      />

      {/* PWA Installation Banner */}
      <PWAInstallBanner />

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            batches={batches}
            movements={movements}
            onOpenEntryModal={handleOpenEntry}
            onOpenExitModal={handleOpenExit}
            onOpenXmlModal={() => setIsXmlModalOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'products' && (
          <ProductList
            products={products}
            categories={categories}
            currentUser={currentUser}
            onOpenEntryModal={handleOpenEntry}
            onOpenExitModal={handleOpenExit}
            onRefresh={loadState}
          />
        )}

        {activeTab === 'entries' && (
          <FullMovementPage
            type="entrada"
            products={products}
            suppliers={suppliers}
            movements={movements}
            onOpenCreateProductModal={() => setActiveTab('products')}
            onRefresh={loadState}
          />
        )}

        {activeTab === 'exits' && (
          <FullMovementPage
            type="saida"
            products={products}
            suppliers={suppliers}
            movements={movements}
            onOpenCreateProductModal={() => setActiveTab('products')}
            onRefresh={loadState}
          />
        )}

        {activeTab === 'venda_rapida' && (
          <VendaRapida
            products={products}
            onRefresh={loadState}
            onOpenCustomersTab={() => setActiveTab('fiados')}
          />
        )}

        {activeTab === 'fiados' && (
          <FiadoManagement onRefresh={loadState} />
        )}

        {activeTab === 'reports' && (
          <Reports
            products={products}
            batches={batches}
            movements={movements}
            categories={categories}
          />
        )}

        {activeTab === 'bulk_prices' && (
          <BulkPriceUpdate products={products} onRefresh={loadState} />
        )}

        {activeTab === 'bulk_stock' && (
          <BulkStockAdjustment products={products} onRefresh={loadState} />
        )}

        {activeTab === 'customers' && (
          <CustomerManager onRefresh={loadState} />
        )}

        {activeTab === 'history' && (
          <HistoryList movements={movements} onRefresh={loadState} />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            products={products}
            batches={batches}
            movements={movements}
            categories={categories}
            currentUser={currentUser}
            onRefresh={loadState}
          />
        )}
      </main>

      {/* Modals */}
      <MovementModal
        isOpen={isEntryModalOpen}
        type="entrada"
        initialProduct={selectedProductForMovement}
        products={products}
        suppliers={suppliers}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={loadState}
      />

      <MovementModal
        isOpen={isExitModalOpen}
        type="saida"
        initialProduct={selectedProductForMovement}
        products={products}
        suppliers={suppliers}
        onClose={() => setIsExitModalOpen(false)}
        onSuccess={loadState}
      />

      <XmlImportModal
        isOpen={isXmlModalOpen}
        products={products}
        onClose={() => setIsXmlModalOpen(false)}
        onSuccess={loadState}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        products={products}
        onClose={() => setIsScannerOpen(false)}
        onSelectEntry={handleOpenEntry}
        onSelectExit={handleOpenExit}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onRefresh={loadState}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        currentUser={currentUser}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
