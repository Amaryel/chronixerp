/**
 * Aquinos Frios - Unified Data Storage & State Engine
 * Manages local persistent storage (LocalStorage / IndexedDB) with auto pre-seeded cold cuts data
 * and optionally syncs with Supabase database when configured.
 */

import chronixLogoImg from '../assets/images/chronix_erp_logo_1785940876233.jpg';
import aquinoLogoImg from '../assets/images/aquino_frios_logo_1785856942770.jpg';

export { chronixLogoImg, aquinoLogoImg };

import {
  Product,
  Category,
  Supplier,
  Batch,
  Movement,
  XmlImport,
  XmlLink,
  Inventory,
  AuditLog,
  User,
  UserRole,
  UnitConversion,
  ConversionPreset,
  Customer,
  FiadoSale,
  FiadoInstallment,
  FiadoPayment,
  PaymentMethod,
  PreSale,
  PreSaleStatus,
  PreSaleItem,
  SystemSettings,
  Company,
} from '../types';

import { convertToMainUnit, normalizeUnitToken } from '../lib/unitConverter';
import { getSupabaseClient } from '../lib/supabase';

const STORAGE_KEYS = {
  USERS: 'aquinos_users',
  CURRENT_USER: 'aquinos_current_user',
  COMPANIES: 'aquinos_companies',
  SUPERADMIN_SELECTED_COMPANY_ID: 'aquinos_superadmin_selected_company_id',
  PRODUCTS: 'aquinos_products',
  CATEGORIES: 'aquinos_categories',
  SUPPLIERS: 'aquinos_suppliers',
  BATCHES: 'aquinos_batches',
  MOVEMENTS: 'aquinos_movements',
  XML_IMPORTS: 'aquinos_xml_imports',
  XML_LINKS: 'aquinos_xml_links',
  INVENTORIES: 'aquinos_inventories',
  AUDIT_LOGS: 'aquinos_audit_logs',
  CONVERSION_PRESETS: 'aquinos_conversion_presets',
  THEME: 'aquinos_theme',
  CUSTOMERS: 'aquinos_customers',
  FIADO_SALES: 'aquinos_fiado_sales',
  FIADO_PAYMENTS: 'aquinos_fiado_payments',
  PRE_SALES: 'aquinos_pre_sales',
  SETTINGS: 'aquinos_settings',
};

// Default Companies (Multi-Empresas / White Label)
const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'comp-chronix',
    name: 'Chronix ERP - Matriz',
    document: '00.000.000/0001-99',
    phone: '(11) 4004-9000',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    email: 'contato@chronix.com.br',
    logo_url: chronixLogoImg,
    theme_color: '#0284c7',
    pwa_title: 'Chronix ERP - Gestão Inteligente',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'comp-aquino',
    name: 'Aquino Frios & Distribuidora',
    document: '30.404.812/0001-63',
    phone: '(88) 99999-0000',
    address: 'Rua Principal, 500 - Juazeiro do Norte, CE',
    email: 'contato@aquinosfrios.com.br',
    logo_url: aquinoLogoImg,
    theme_color: '#2563eb',
    pwa_title: 'Aquino Frios ERP',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'comp-valesol',
    name: 'Laticínios Vale do Sol',
    document: '12.345.678/0001-90',
    phone: '(85) 3333-4444',
    address: 'Rodovia CE-060, Km 42 - Quixadá, CE',
    email: 'financeiro@valedosol.com.br',
    theme_color: '#16a34a',
    pwa_title: 'Laticínios Vale do Sol ERP',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

// Default Conversion Presets (Regras de Conversão Padrão para Frios)
const DEFAULT_CONVERSION_PRESETS: ConversionPreset[] = [
  { id: 'preset-cx20', name: 'Caixa 20kg', from_unit: 'caixa', to_unit: 'kg', factor: 20, description: '1 caixa = 20 kg (padrão queijos e embutidos)' },
  { id: 'preset-cx15', name: 'Caixa 15kg', from_unit: 'caixa', to_unit: 'kg', factor: 15, description: '1 caixa = 15 kg (presuntos e mortadelas)' },
  { id: 'preset-cx10', name: 'Caixa 10kg', from_unit: 'caixa', to_unit: 'kg', factor: 10, description: '1 caixa = 10 kg' },
  { id: 'preset-peca4', name: 'Peça ~4kg', from_unit: 'peça', to_unit: 'kg', factor: 4, description: '1 peça = 4 kg (aproximado)' },
  { id: 'preset-fardo6', name: 'Fardo 6un', from_unit: 'fardo', to_unit: 'un', factor: 6, description: '1 fardo = 6 unidades' },
  { id: 'preset-pct1', name: 'Pacote 1kg', from_unit: 'pacote', to_unit: 'kg', factor: 1, description: '1 pacote = 1 kg' },
];

export const SUPERADMIN_EMAIL = 'amaryelcc@gmail.com';

// Default Users
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-superadmin',
    name: 'Amaryel (Superadmin)',
    email: 'amaryelcc@gmail.com',
    role: 'superadmin',
    company_id: 'comp-aquino',
    is_approved: true,
    password: '123',
    is_blocked: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-admin-1',
    name: 'Francisco Aquino',
    email: 'francisco@aquinosfrios.com.br',
    role: 'admin',
    company_id: 'comp-aquino',
    is_approved: true,
    password: '123',
    is_blocked: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-func-1',
    name: 'João Pedro (Estoquista)',
    email: 'joao@aquinosfrios.com.br',
    role: 'funcionario',
    company_id: 'comp-aquino',
    is_approved: true,
    password: '123',
    is_blocked: false,
    created_at: new Date().toISOString(),
  },
];

// Default Categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-queijos', name: 'Queijos', description: 'Mussarela, Prato, Gouda, Parmesão, Provolone', icon: 'cheese' },
  { id: 'cat-presuntos', name: 'Presuntos & Embutidos', description: 'Presuntos cozidos, mortadelas, peitos de peru', icon: 'meat' },
  { id: 'cat-frango', name: 'Frango & Aves', description: 'Cortes congelados, filezinhos, coxas e sobrecoxas', icon: 'drumstick' },
  { id: 'cat-linguicas', name: 'Linguiças & Salsichas', description: 'Calabresas, toscana, finas e salsichas', icon: 'sausage' },
  { id: 'cat-laticinios', name: 'Laticínios', description: 'Requeijão cremote, manteigas e nata', icon: 'milk' },
  { id: 'cat-bebidas', name: 'Bebidas', description: 'Refrigerantes, energéticos e sucos', icon: 'wine' },
  { id: 'cat-congelados', name: 'Congelados', description: 'Hamburgueres, batatas palito, salgados', icon: 'snowflake' },
  { id: 'cat-outros', name: 'Outros', description: 'Insumos, sacolas, papel acoplado', icon: 'box' },
];

// Default Suppliers
const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'sup-sadia', name: 'BRF S.A. (Sadia / Perdigão)', cnpj: '12.345.678/0001-95', phone: '(11) 3003-2730', email: 'vendas@brf-br.com' },
  { id: 'sup-seara', name: 'JBS S.A. (Seara)', cnpj: '98.765.432/0001-10', phone: '(11) 4004-0000', email: 'comercial@seara.com.br' },
  { id: 'sup-tirolez', name: 'Tirolez Laticínios', cnpj: '45.123.890/0001-22', phone: '(11) 2174-8000', email: 'sac@tirolez.com.br' },
  { id: 'sup-coca', name: 'Coca-Cola FEMSA', cnpj: '55.443.322/0001-88', phone: '(11) 0800-02121', email: 'pedidos@femsa.com.br' },
];

// Initial Pre-seeded Products - Cleared per user request
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_BATCHES: Batch[] = [];
const DEFAULT_MOVEMENTS: Movement[] = [];

// Initial Audit Logs
const now = new Date();
const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    date: new Date(now.getTime() - 24 * 3600000).toISOString(),
    user_id: 'usr-admin-1',
    user_name: 'Francisco Aquino',
    user_role: 'admin',
    action: 'login',
    details: 'Acesso realizado via PWA Android',
    created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
  },
  {
    id: 'log-2',
    date: new Date(now.getTime() - 24 * 3600000).toISOString(),
    user_id: 'usr-admin-1',
    user_name: 'Francisco Aquino',
    user_role: 'admin',
    action: 'importacao_xml',
    details: 'Importada NF-e #10023 da BRF S.A. com 3 itens',
    created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
  },
  {
    id: 'log-3',
    date: new Date(now.getTime() - 5 * 3600000).toISOString(),
    user_id: 'usr-func-1',
    user_name: 'João Pedro',
    user_role: 'funcionario',
    action: 'saida',
    details: 'Registrada saída de 15 kg de Queijo Mussarela Sadia',
    created_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
  },
];

class StorageService {
  private listeners: Array<() => void> = [];

  constructor() {
    this.initDefaultData();
  }

  private initDefaultData() {
    // Check if legacy pre-seeded products exist and clear them per user request
    const clearedFlag = localStorage.getItem('aquinos_products_cleared_v2');
    if (!clearedFlag) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
      localStorage.setItem('aquinos_products_cleared_v2', 'true');
    }

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    } else {
      let users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      let hasSuperAdmin = false;
      users = users.map((u) => {
        if (u.email.toLowerCase() === SUPERADMIN_EMAIL) {
          hasSuperAdmin = true;
          return { ...u, role: 'superadmin' as UserRole, is_blocked: false };
        }
        return u;
      });
      if (!hasSuperAdmin) {
        users.unshift(DEFAULT_USERS[0]);
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    const currUserStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!currUserStr) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
    } else {
      try {
        const parsed = JSON.parse(currUserStr);
        if (parsed.email && parsed.email.toLowerCase() === SUPERADMIN_EMAIL) {
          parsed.role = 'superadmin';
          parsed.is_blocked = false;
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(parsed));
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BATCHES)) {
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.XML_IMPORTS)) {
      localStorage.setItem(STORAGE_KEYS.XML_IMPORTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.XML_LINKS)) {
      localStorage.setItem(STORAGE_KEYS.XML_LINKS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORIES)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEFAULT_AUDIT_LOGS));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.notify();
  }

  // --- COMPANY & WHITE LABEL MANAGEMENT ---
  public getCompanies(): Company[] {
    const list = this.getItem<Company[]>(STORAGE_KEYS.COMPANIES, DEFAULT_COMPANIES);
    if (!list || list.length === 0) return DEFAULT_COMPANIES;

    return list.map((comp) => {
      let logo = comp.logo_url;
      if (!logo) {
        if (comp.id === 'comp-chronix' || comp.name.toLowerCase().includes('chronix')) {
          logo = chronixLogoImg;
        } else if (comp.id === 'comp-aquino' || comp.name.toLowerCase().includes('aquino')) {
          logo = aquinoLogoImg;
        } else {
          logo = chronixLogoImg;
        }
      }
      return {
        ...comp,
        logo_url: logo,
        theme_color: comp.theme_color || '#0284c7',
        pwa_title: comp.pwa_title || `${comp.name} ERP`,
      };
    });
  }

  public getCompanyById(id: string): Company | null {
    const companies = this.getCompanies();
    return companies.find((c) => c.id === id) || null;
  }

  public getActiveCompany(): Company {
    const currentUser = this.getCurrentUser();
    const companies = this.getCompanies();

    if (currentUser && currentUser.company_id) {
      const found = companies.find((c) => c.id === currentUser.company_id);
      if (found) return found;
    }
    return companies[0] || DEFAULT_COMPANIES[0];
  }

  public saveCompany(data: Partial<Company> & { name: string; document: string }): { success: boolean; company?: Company; error?: string } {
    const companies = this.getCompanies();
    const cleanDoc = data.document.trim();

    if (data.id) {
      const idx = companies.findIndex((c) => c.id === data.id);
      if (idx !== -1) {
        const updatedCompany: Company = {
          ...companies[idx],
          ...data,
          name: data.name.trim(),
          document: cleanDoc,
          logo_url: data.logo_url || companies[idx].logo_url || chronixLogoImg,
          theme_color: data.theme_color || companies[idx].theme_color || '#0284c7',
          pwa_title: data.pwa_title || companies[idx].pwa_title || `${data.name.trim()} ERP`,
        };
        companies[idx] = updatedCompany;
        this.setItem(STORAGE_KEYS.COMPANIES, companies);
        this.addAuditLog('alteracao_lote', `Empresa atualizada: ${updatedCompany.name} (CNPJ: ${updatedCompany.document})`);
        return { success: true, company: updatedCompany };
      }
    }

    // Check duplicate document
    if (companies.some((c) => c.document === cleanDoc)) {
      return { success: false, error: 'Já existe uma empresa cadastrada com este CNPJ/CPF.' };
    }

    const newCompany: Company = {
      id: 'comp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: data.name.trim(),
      document: cleanDoc,
      phone: data.phone || '',
      address: data.address || '',
      email: data.email || '',
      logo_url: data.logo_url || chronixLogoImg,
      theme_color: data.theme_color || '#0284c7',
      pwa_title: data.pwa_title || `${data.name.trim()} ERP`,
      status: data.status || 'active',
      supabase_url: data.supabase_url || '',
      supabase_key: data.supabase_key || '',
      created_at: new Date().toISOString(),
    };

    companies.push(newCompany);
    this.setItem(STORAGE_KEYS.COMPANIES, companies);
    this.addAuditLog('cadastro_produto', `Nova empresa cadastrada: ${newCompany.name} (CNPJ/CPF: ${newCompany.document})`);

    return { success: true, company: newCompany };
  }

  public toggleCompanyStatus(companyId: string): { success: boolean; status?: 'active' | 'blocked'; error?: string } {
    const companies = this.getCompanies();
    const idx = companies.findIndex((c) => c.id === companyId);
    if (idx === -1) return { success: false, error: 'Empresa não encontrada.' };

    const newStatus = companies[idx].status === 'active' ? 'blocked' : 'active';
    companies[idx] = { ...companies[idx], status: newStatus };
    this.setItem(STORAGE_KEYS.COMPANIES, companies);

    return { success: true, status: newStatus };
  }

  public deleteCompany(companyId: string): { success: boolean; error?: string } {
    const companies = this.getCompanies();
    if (companies.length <= 1) {
      return { success: false, error: 'Não é possível excluir a única empresa cadastrada.' };
    }

    const filtered = companies.filter((c) => c.id !== companyId);
    this.setItem(STORAGE_KEYS.COMPANIES, filtered);
    return { success: true };
  }

  // --- AUTHENTICATION & USER MANAGEMENT ---
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public getActiveSession(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      const user: User = JSON.parse(data);

      const users = this.getUsers();
      const dbUser = users.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (dbUser && dbUser.is_blocked) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }
      if (dbUser) return dbUser;
      return user;
    } catch {
      return null;
    }
  }

  public getCurrentUser(): User | null {
    return this.getActiveSession();
  }

  public setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
    this.addAuditLog('troca_perfil', `Sessão ativa para ${user.name} (${user.role.toUpperCase()})`);
  }

  public login(email: string, password?: string): { success: boolean; user?: User; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    // If superadmin email and not found yet, create automatically
    if (!found && cleanEmail === SUPERADMIN_EMAIL) {
      found = {
        id: 'usr-superadmin',
        name: 'Amaryel (Superadmin)',
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        company_id: 'comp-aquino',
        is_approved: true,
        password: password || '123',
        is_blocked: false,
        created_at: new Date().toISOString(),
      };
      users.unshift(found);
      this.setItem(STORAGE_KEYS.USERS, users);
    }

    if (!found) {
      return { success: false, error: 'Usuário não encontrado com este e-mail. Solicite o cadastro ao Administrador.' };
    }

    // Always ensure superadmin role and auto-update password if superadmin login
    if (cleanEmail === SUPERADMIN_EMAIL) {
      found.role = 'superadmin';
      found.is_approved = true;
      found.is_blocked = false;
      found.company_id = found.company_id || 'comp-aquino';
      if (password) {
        found.password = password;
        this.setItem(STORAGE_KEYS.USERS, users);
      }
    } else {
      // Check if blocked
      if (found.is_blocked) {
        return {
          success: false,
          error: 'Sua conta foi bloqueada. Entre em contato com o suporte ou Superadmin.',
        };
      }

      // Check if approved
      if (found.is_approved === false) {
        return {
          success: false,
          error: 'Sua conta está pendente de liberação pelo Superadmin.',
        };
      }

      // Check password
      if (password && found.password && found.password !== password) {
        return { success: false, error: 'Senha incorreta. Tente novamente.' };
      }

      // Check company status if user belongs to a company
      if (found.company_id) {
        const company = this.getCompanyById(found.company_id);
        if (company && company.status === 'blocked') {
          return {
            success: false,
            error: `A empresa ${company.name} está inativa no sistema. Acesso suspenso.`,
          };
        }
      }
    }

    this.setCurrentUser(found);
    return { success: true, user: found };
  }

  public registerUser(data: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
    company_id?: string;
  }): { success: boolean; user?: User; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const users = this.getUsers();

    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (existingIndex !== -1) {
      if (cleanEmail === SUPERADMIN_EMAIL) {
        // Update superadmin credentials directly
        const superUser: User = {
          ...users[existingIndex],
          name: data.name.trim() || 'Amaryel (Superadmin)',
          password: data.password || users[existingIndex].password || '123',
          role: 'superadmin',
          is_approved: true,
          is_blocked: false,
        };
        users[existingIndex] = superUser;
        this.setItem(STORAGE_KEYS.USERS, users);
        this.setCurrentUser(superUser);
        return { success: true, user: superUser };
      }
      return { success: false, error: 'Este e-mail já está cadastrado no sistema.' };
    }

    const isSuper = cleanEmail === SUPERADMIN_EMAIL;
    const assignedRole: UserRole = isSuper ? 'superadmin' : data.role || 'funcionario';

    const newUser: User = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: data.name.trim(),
      email: cleanEmail,
      role: assignedRole,
      company_id: data.company_id || 'comp-aquino',
      is_approved: isSuper ? true : true, // Standard approval
      password: data.password || '123',
      is_blocked: false,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.setItem(STORAGE_KEYS.USERS, users);

    this.addAuditLog('cadastro_produto', `Novo usuário cadastrado: ${newUser.name} (${newUser.email} - ${newUser.role})`);

    return { success: true, user: newUser };
  }

  public toggleUserApproval(userId: string): { success: boolean; is_approved?: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) return { success: false, error: 'Usuário não encontrado.' };

    const user = users[userIndex];
    if (user.email.toLowerCase() === SUPERADMIN_EMAIL) {
      return { success: false, error: 'O Superadmin Principal está sempre liberado.' };
    }

    const newApprovalState = user.is_approved === false ? true : false;
    users[userIndex] = { ...user, is_approved: newApprovalState };
    this.setItem(STORAGE_KEYS.USERS, users);

    this.addAuditLog(
      'alteracao_lote',
      `Acesso do usuário ${user.name} (${user.email}) alterado para: ${newApprovalState ? 'LIBERADO' : 'PENDENTE'}`
    );

    return { success: true, is_approved: newApprovalState };
  }

  public updateUserCompany(userId: string, companyId: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) return { success: false, error: 'Usuário não encontrado.' };

    users[userIndex] = { ...users[userIndex], company_id: companyId };
    this.setItem(STORAGE_KEYS.USERS, users);

    const comp = this.getCompanyById(companyId);
    this.addAuditLog('alteracao_lote', `Usuário ${users[userIndex].name} vinculado à empresa ${comp?.name || companyId}`);

    return { success: true };
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.notify();
  }

  public toggleBlockUser(userId: string): { success: boolean; is_blocked?: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const user = users[userIndex];
    if (user.email.toLowerCase() === SUPERADMIN_EMAIL) {
      return { success: false, error: 'O Superadmin Principal não pode ser bloqueado.' };
    }

    const newBlockedState = !user.is_blocked;
    users[userIndex] = { ...user, is_blocked: newBlockedState };
    this.setItem(STORAGE_KEYS.USERS, users);

    this.addAuditLog(
      'alteracao_lote',
      `Status do usuário ${user.name} (${user.email}) alterado para: ${newBlockedState ? 'BLOQUEADO' : 'ATIVO'}`
    );

    return { success: true, is_blocked: newBlockedState };
  }

  public updateUserRole(userId: string, newRole: UserRole): { success: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) return { success: false, error: 'Usuário não encontrado.' };

    const user = users[userIndex];
    if (user.email.toLowerCase() === SUPERADMIN_EMAIL && newRole !== 'superadmin') {
      return { success: false, error: 'O Superadmin Principal deve ter a função superadmin.' };
    }

    users[userIndex] = { ...user, role: newRole };
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('alteracao_lote', `Função do usuário ${user.name} alterada para ${newRole.toUpperCase()}`);

    return { success: true };
  }

  public updateUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) return { success: false, error: 'Usuário não encontrado.' };

    users[userIndex] = { ...users[userIndex], password: newPassword };
    this.setItem(STORAGE_KEYS.USERS, users);
    return { success: true };
  }

  public deleteUser(userId: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);

    if (!target) return { success: false, error: 'Usuário não encontrado.' };
    if (target.email.toLowerCase() === SUPERADMIN_EMAIL) {
      return { success: false, error: 'Não é possível excluir o Superadmin Principal.' };
    }

    const filtered = users.filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, filtered);
    this.addAuditLog('exclusao_produto', `Usuário removido: ${target.name} (${target.email})`);

    return { success: true };
  }

  public switchRole(role: UserRole): void {
    const users = this.getUsers();
    const target = users.find((u) => u.role === role) || {
      id: `usr-${role}-temp`,
      name: role === 'admin' ? 'Francisco Aquino' : 'Funcionário',
      email: `${role}@aquinosfrios.com.br`,
      role,
      created_at: new Date().toISOString(),
    };
    this.setCurrentUser(target);
  }

  public updateUserProfile(updated: { name?: string; email?: string; role?: UserRole }) {
    const current = this.getCurrentUser();
    if (!current) return;
    const newUser = { ...current, ...updated };
    this.setItem(STORAGE_KEYS.CURRENT_USER, newUser);

    const users = this.getUsers().map((u) => (u.id === newUser.id ? newUser : u));
    if (!users.find((u) => u.id === newUser.id)) {
      users.push(newUser);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    this.addAuditLog('edicao_produto', `Perfil do usuário atualizado: ${newUser.name} (${newUser.email})`);
  }

  public clearAllProducts(): void {
    this.setItem(STORAGE_KEYS.PRODUCTS, []);
    this.setItem(STORAGE_KEYS.BATCHES, []);
    this.setItem(STORAGE_KEYS.MOVEMENTS, []);
    this.addAuditLog('exclusao_produto', 'Excluídos todos os produtos cadastrados do sistema.');
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public addAuditLog(action: AuditLog['action'], details: string, target_id?: string) {
    const user = this.getCurrentUser();
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString(),
      user_id: user?.id || 'sys-anon',
      user_name: user?.name || 'Sistema',
      user_role: user?.role || 'admin',
      action,
      details,
      target_id,
      created_at: new Date().toISOString(),
    };
    const logs = [log, ...this.getAuditLogs()];
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- CONVERSION PRESETS ---
  public getConversionPresets(): ConversionPreset[] {
    return this.getItem<ConversionPreset[]>(STORAGE_KEYS.CONVERSION_PRESETS, DEFAULT_CONVERSION_PRESETS);
  }

  public saveConversionPreset(preset: Partial<ConversionPreset>): ConversionPreset {
    const presets = this.getConversionPresets();
    let saved: ConversionPreset;

    if (preset.id) {
      const idx = presets.findIndex((p) => p.id === preset.id);
      if (idx >= 0) {
        presets[idx] = { ...presets[idx], ...preset } as ConversionPreset;
        saved = presets[idx];
      } else {
        saved = {
          id: preset.id,
          name: preset.name || 'Regra de Conversão',
          from_unit: preset.from_unit || 'caixa',
          to_unit: preset.to_unit || 'kg',
          factor: preset.factor || 1,
          description: preset.description,
        };
        presets.push(saved);
      }
    } else {
      saved = {
        id: 'preset-' + Date.now(),
        name: preset.name || 'Regra de Conversão',
        from_unit: preset.from_unit || 'caixa',
        to_unit: preset.to_unit || 'kg',
        factor: preset.factor || 1,
        description: preset.description,
      };
      presets.push(saved);
    }

    this.setItem(STORAGE_KEYS.CONVERSION_PRESETS, presets);
    this.addAuditLog('cadastro_produto', `Regra de conversão salva: ${saved.name} (1 ${saved.from_unit} = ${saved.factor} ${saved.to_unit})`);
    return saved;
  }

  public deleteConversionPreset(id: string): void {
    const presets = this.getConversionPresets().filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.CONVERSION_PRESETS, presets);
  }

  // --- CATEGORIES & SUPPLIERS ---
  public getCategories(): Category[] {
    return this.getItem<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  public addCategory(name: string, description?: string): Category {
    const categories = this.getCategories();
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      description,
    };
    categories.push(newCat);
    this.setItem(STORAGE_KEYS.CATEGORIES, categories);
    this.addAuditLog('cadastro_produto', `Nova categoria cadastrada: ${name}`);
    return newCat;
  }

  public getSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public addSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSup: Supplier = {
      ...supplier,
      id: 'sup-' + Date.now(),
    };
    suppliers.push(newSup);
    this.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    return newSup;
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    return this.getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode) return undefined;
    const clean = barcode.trim().toLowerCase();
    return this.getProducts().find((p) => p.barcode && p.barcode.trim().toLowerCase() === clean);
  }

  public saveProduct(productData: Partial<Product> & { name: string; main_unit: string; min_stock: number }): Product {
    const products = this.getProducts();
    const nowStr = new Date().toISOString();

    if (productData.id) {
      // Edit existing
      const index = products.findIndex((p) => p.id === productData.id);
      if (index !== -1) {
        const updatedProduct: Product = {
          ...products[index],
          ...productData,
          updated_at: nowStr,
        };
        products[index] = updatedProduct;
        this.setItem(STORAGE_KEYS.PRODUCTS, products);
        this.addAuditLog('edicao_produto', `Produto editado: ${updatedProduct.name}`, updatedProduct.id);
        return updatedProduct;
      }
    }

    // Create new
    const newProduct: Product = {
      id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: productData.name,
      main_unit: normalizeUnitToken(productData.main_unit || 'UN'),
      min_stock: Number(productData.min_stock) || 0,
      current_stock: Number(productData.current_stock) || 0,
      unit_price: Number(productData.unit_price) || 0,
      box_conversion_unit: productData.box_conversion_unit || undefined,
      box_conversion_value: Number(productData.box_conversion_value) || undefined,
      barcode: productData.barcode || undefined,
      category_id: productData.category_id || undefined,
      brand: productData.brand || undefined,
      notes: productData.notes || undefined,
      conversions: productData.conversions || [],
      created_at: nowStr,
      updated_at: nowStr,
    };

    products.push(newProduct);
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('cadastro_produto', `Novo produto cadastrado: ${newProduct.name}`, newProduct.id);
    return newProduct;
  }

  public deleteProduct(id: string): boolean {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem excluir produtos.');
    }

    const products = this.getProducts();
    const prod = products.find((p) => p.id === id);
    if (!prod) return false;

    const filtered = products.filter((p) => p.id !== id);
    this.setItem(STORAGE_KEYS.PRODUCTS, filtered);
    this.addAuditLog('exclusao_produto', `Produto excluído: ${prod.name}`, id);
    return true;
  }

  // --- UNIT CONVERSIONS ---
  public saveUnitConversion(productId: string, conversion: Omit<UnitConversion, 'id' | 'product_id'>): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) throw new Error('Produto não encontrado');

    const product = products[index];
    const conversions = product.conversions || [];

    const newConv: UnitConversion = {
      id: 'cv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
      product_id: productId,
      from_unit: conversion.from_unit.toLowerCase().trim(),
      to_unit: conversion.to_unit.toLowerCase().trim(),
      factor: Number(conversion.factor) || 1,
      created_at: new Date().toISOString(),
    };

    product.conversions = [...conversions, newConv];
    product.updated_at = new Date().toISOString();
    products[index] = product;

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog(
      'edicao_produto',
      `Conversão adicionada em ${product.name}: 1 ${newConv.from_unit} = ${newConv.factor} ${newConv.to_unit}`,
      productId
    );

    return product;
  }

  public deleteUnitConversion(productId: string, conversionId: string): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) throw new Error('Produto não encontrado');

    const product = products[index];
    product.conversions = (product.conversions || []).filter((c) => c.id !== conversionId);
    product.updated_at = new Date().toISOString();
    products[index] = product;

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    return product;
  }

  // --- MOVEMENTS (ENTRADA & SAÍDA) ---
  public registerEntry({
    productId,
    usedQty,
    usedUnit,
    supplierId,
    supplierName,
    unitPrice,
    totalPrice,
    batchNumber,
    expirationDate,
    origin = 'manual',
    notes,
    xmlImportId,
    nfeNumber,
  }: {
    productId: string;
    usedQty: number;
    usedUnit: string;
    supplierId?: string;
    supplierName?: string;
    unitPrice?: number;
    totalPrice?: number;
    batchNumber?: string;
    expirationDate?: string;
    origin?: 'manual' | 'xml' | 'inventario';
    notes?: string;
    xmlImportId?: string;
    nfeNumber?: string;
  }): Movement {
    const product = this.getProductById(productId);
    if (!product) throw new Error('Produto não encontrado.');

    // Convert input quantity to main unit
    const conversion = convertToMainUnit(product, usedQty, usedUnit);
    const convertedQty = conversion.mainQty;

    const prevStock = product.current_stock || 0;
    const currentStock = prevStock + convertedQty;

    // Update product stock
    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === productId);
    products[prodIndex].current_stock = currentStock;
    products[prodIndex].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Create / update Lot (Batch) if specified
    if (batchNumber && expirationDate) {
      this.addOrUpdateBatch({
        productId,
        productName: product.name,
        batchNumber,
        expirationDate,
        addQty: convertedQty,
      });
    }

    const user = this.getCurrentUser();
    const movement: Movement = {
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString(),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      product_id: product.id,
      product_name: product.name,
      type: 'entrada',
      used_qty: Number(usedQty),
      used_unit: usedUnit,
      converted_qty: convertedQty,
      main_unit: product.main_unit,
      prev_stock: prevStock,
      current_stock: currentStock,
      supplier_id: supplierId,
      supplier_name: supplierName,
      unit_price: unitPrice,
      total_price: totalPrice,
      batch_number: batchNumber,
      expiration_date: expirationDate,
      origin,
      notes,
      created_at: new Date().toISOString(),
    };

    const movements = this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'entrada',
      `Entrada de ${usedQty} ${usedUnit} (${convertedQty} ${product.main_unit}) no produto ${product.name}`,
      product.id
    );

    return movement;
  }

  public registerExit({
    productId,
    usedQty,
    usedUnit,
    origin = 'manual',
    notes,
  }: {
    productId: string;
    usedQty: number;
    usedUnit: string;
    origin?: 'manual' | 'xml' | 'inventario';
    notes?: string;
  }): Movement {
    const product = this.getProductById(productId);
    if (!product) throw new Error('Produto não encontrado.');

    // Convert input quantity to main unit
    const conversion = convertToMainUnit(product, usedQty, usedUnit);
    const convertedQty = conversion.mainQty;

    const prevStock = product.current_stock || 0;

    const settings = this.getSettings();
    // Check negative stock setting
    if (!settings.allow_negative_stock && prevStock < convertedQty) {
      const formattedAvail = `${prevStock.toLocaleString('pt-BR')} ${product.main_unit}`;
      const formattedReq = `${convertedQty.toLocaleString('pt-BR')} ${product.main_unit}`;
      throw new Error(
        `Estoque insuficiente para "${product.name}"! Solicitado: ${usedQty} ${usedUnit} (${formattedReq}). Disponível em estoque: ${formattedAvail}.`
      );
    }

    const currentStock = prevStock - convertedQty;

    // Update product stock
    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === productId);
    products[prodIndex].current_stock = currentStock;
    products[prodIndex].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // FIFO PEPS Batch Consumption
    const consumedBatchesInfo = this.consumeBatchesFifo(productId, convertedQty);

    const user = this.getCurrentUser();
    const movement: Movement = {
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString(),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      product_id: product.id,
      product_name: product.name,
      type: 'saida',
      used_qty: Number(usedQty),
      used_unit: usedUnit,
      converted_qty: convertedQty,
      main_unit: product.main_unit,
      prev_stock: prevStock,
      current_stock: currentStock,
      batch_number: consumedBatchesInfo.batchNumbers,
      origin,
      notes,
      created_at: new Date().toISOString(),
    };

    const movements = this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'saida',
      `Saída de ${usedQty} ${usedUnit} (${convertedQty} ${product.main_unit}) no produto ${product.name}`,
      product.id
    );

    return movement;
  }

  public registerAdjustment(productId: string, countedMainQty: number, notes?: string): Movement {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem realizar ajustes diretos de estoque.');
    }

    const product = this.getProductById(productId);
    if (!product) throw new Error('Produto não encontrado.');

    const prevStock = product.current_stock || 0;
    const diff = countedMainQty - prevStock;

    // Update product stock
    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === productId);
    products[prodIndex].current_stock = countedMainQty;
    products[prodIndex].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    const movement: Movement = {
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString(),
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      product_id: product.id,
      product_name: product.name,
      type: 'ajuste',
      used_qty: diff,
      used_unit: product.main_unit,
      converted_qty: Math.abs(diff),
      main_unit: product.main_unit,
      prev_stock: prevStock,
      current_stock: countedMainQty,
      origin: 'inventario',
      notes: notes || `Ajuste manual de inventário (${diff >= 0 ? '+' : ''}${diff} ${product.main_unit})`,
      created_at: new Date().toISOString(),
    };

    const movements = this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'ajuste_manual',
      `Ajuste de estoque em ${product.name}: de ${prevStock} para ${countedMainQty} ${product.main_unit}`,
      product.id
    );

    return movement;
  }

  public getMovements(): Movement[] {
    return this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
  }

  public deleteMovement(movementId: string): boolean {
    const movements = this.getMovements();
    const movIndex = movements.findIndex((m) => m.id === movementId);
    if (movIndex === -1) {
      throw new Error('Movimentação não encontrada.');
    }

    const mov = movements[movIndex];
    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === mov.product_id);

    if (prodIndex !== -1) {
      const prod = products[prodIndex];
      let newStock = prod.current_stock || 0;

      if (mov.type === 'entrada') {
        // Revert entry -> subtract converted_qty
        newStock = Math.max(0, newStock - mov.converted_qty);
      } else if (mov.type === 'saida') {
        // Revert exit -> add converted_qty back
        newStock = newStock + mov.converted_qty;
      } else if (mov.type === 'ajuste') {
        // Revert adjustment -> restore prev_stock
        newStock = mov.prev_stock;
      }

      products[prodIndex].current_stock = newStock;
      products[prodIndex].updated_at = new Date().toISOString();
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    movements.splice(movIndex, 1);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'exclusao_movimentacao',
      `Excluída movimentação ${mov.type} id: ${mov.id} do produto ${mov.product_name} e estoque revertido.`
    );

    return true;
  }

  // --- CUSTOMERS & FIADO SALES (ALTERAÇÃO 4 & 5) ---
  public getCustomers(): Customer[] {
    return this.getItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  }

  public saveCustomer(customerData: Partial<Customer>): Customer {
    const customers = this.getCustomers();
    if (customerData.id) {
      const idx = customers.findIndex((c) => c.id === customerData.id);
      if (idx !== -1) {
        customers[idx] = { ...customers[idx], ...customerData };
        this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
        return customers[idx];
      }
    }

    const newCustomer: Customer = {
      id: 'cust-' + Date.now(),
      name: customerData.name || 'Cliente Sem Nome',
      document: customerData.document || '',
      phone: customerData.phone || '',
      notes: customerData.notes || '',
      created_at: new Date().toISOString(),
    };

    customers.unshift(newCustomer);
    this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  public deleteCustomer(id: string): boolean {
    const customers = this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.CUSTOMERS, filtered);
    return true;
  }

  public updateCustomerNote(id: string, notes: string): Customer | null {
    const customers = this.getCustomers();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      customers[idx].notes = notes;
      this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
      return customers[idx];
    }
    return null;
  }

  public getFiadoSales(): FiadoSale[] {
    return this.getItem<FiadoSale[]>(STORAGE_KEYS.FIADO_SALES, []);
  }

  public recordFiadoSale(saleData: Omit<FiadoSale, 'id' | 'created_at'>): FiadoSale {
    const saleId = 'sale-' + Date.now();
    let installments: FiadoInstallment[] | undefined = undefined;

    if (saleData.payment_method === 'fiado') {
      const numInstallments = Math.max(1, saleData.installments_count || 1);
      const firstDueDate = saleData.first_due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const baseDate = new Date(firstDueDate + 'T12:00:00');
      const baseAmount = Math.round((saleData.total_amount / numInstallments) * 100) / 100;

      installments = [];
      let accumulated = 0;

      for (let i = 1; i <= numInstallments; i++) {
        const dueDateObj = new Date(baseDate);
        dueDateObj.setMonth(baseDate.getMonth() + (i - 1));
        const dueDateStr = dueDateObj.toISOString().split('T')[0];

        const isLast = i === numInstallments;
        const instAmount = isLast
          ? Math.round((saleData.total_amount - accumulated) * 100) / 100
          : baseAmount;
        accumulated += instAmount;

        installments.push({
          id: `inst-${saleId}-${i}`,
          sale_id: saleId,
          installment_number: i,
          total_installments: numInstallments,
          amount: instAmount,
          due_date: dueDateStr,
          status: 'aberta',
        });
      }
    }

    const newSale: FiadoSale = {
      ...saleData,
      id: saleId,
      installments,
      created_at: new Date().toISOString(),
    };

    const sales = this.getFiadoSales();
    sales.unshift(newSale);
    this.setItem(STORAGE_KEYS.FIADO_SALES, sales);

    this.addAuditLog(
      'saida',
      `Venda rápida (${newSale.payment_method}) registrada no valor de R$ ${newSale.total_amount.toFixed(2)} ${
        newSale.customer_name ? `para ${newSale.customer_name}` : ''
      }`
    );

    return newSale;
  }

  public markFiadoSalePaid(saleId: string): FiadoSale {
    const sales = this.getFiadoSales();
    const idx = sales.findIndex((s) => s.id === saleId);
    if (idx === -1) throw new Error('Venda não encontrada.');

    const nowStr = new Date().toISOString();
    sales[idx].status = 'pago';
    sales[idx].paid_at = nowStr;

    if (sales[idx].installments) {
      sales[idx].installments = sales[idx].installments?.map((inst) => ({
        ...inst,
        status: 'paga',
        paid_at: inst.paid_at || nowStr,
      }));
    }

    this.setItem(STORAGE_KEYS.FIADO_SALES, sales);

    this.addAuditLog(
      'ajuste_manual',
      `Fiado do cliente ${sales[idx].customer_name} no valor de R$ ${sales[idx].total_amount.toFixed(2)} foi marcado como PAGO.`
    );

    return sales[idx];
  }

  public markFiadoInstallmentPaid(
    saleId: string,
    installmentId: string,
    notes?: string
  ): { sale: FiadoSale; paidInstallment: FiadoInstallment } {
    const sales = this.getFiadoSales();
    const saleIdx = sales.findIndex((s) => s.id === saleId);
    if (saleIdx === -1) throw new Error('Venda fiada não encontrada.');

    const sale = sales[saleIdx];
    if (!sale.installments) throw new Error('Parcelas não encontradas para esta venda.');

    const instIdx = sale.installments.findIndex((i) => i.id === installmentId);
    if (instIdx === -1) throw new Error('Parcela não encontrada.');

    const nowStr = new Date().toISOString();
    sale.installments[instIdx].status = 'paga';
    sale.installments[instIdx].paid_at = nowStr;
    if (notes) sale.installments[instIdx].notes = notes;

    // Check if all installments are now paid
    const allPaid = sale.installments.every((i) => i.status === 'paga');
    if (allPaid) {
      sale.status = 'pago';
      sale.paid_at = nowStr;
    }

    sales[saleIdx] = sale;
    this.setItem(STORAGE_KEYS.FIADO_SALES, sales);

    const paidInst = sale.installments[instIdx];
    this.addAuditLog(
      'ajuste_manual',
      `Baixa na parcela ${paidInst.installment_number}/${paidInst.total_installments} (R$ ${paidInst.amount.toFixed(
        2
      )}) do cliente ${sale.customer_name}.`
    );

    return { sale, paidInstallment: paidInst };
  }

  public payAllFiadoInstallmentsForCustomer(customerId: string): number {
    const sales = this.getFiadoSales();
    let totalPaidCount = 0;
    const nowStr = new Date().toISOString();

    sales.forEach((sale) => {
      if (sale.customer_id === customerId && sale.status === 'aberto') {
        sale.status = 'pago';
        sale.paid_at = nowStr;
        if (sale.installments) {
          sale.installments.forEach((inst) => {
            if (inst.status === 'aberta') {
              inst.status = 'paga';
              inst.paid_at = nowStr;
              totalPaidCount++;
            }
          });
        }
      }
    });

    this.setItem(STORAGE_KEYS.FIADO_SALES, sales);
    this.addAuditLog('ajuste_manual', `Quitado todo o débito do cliente ID ${customerId}.`);
    return totalPaidCount;
  }

  public getCustomerOpenBalance(customerId: string): number {
    const sales = this.getFiadoSales();
    let totalOpen = 0;

    sales
      .filter((s) => s.customer_id === customerId)
      .forEach((s) => {
        if (s.installments && s.installments.length > 0) {
          s.installments.forEach((inst) => {
            if (inst.status === 'aberta') {
              totalOpen += inst.amount;
            }
          });
        } else if (s.status === 'aberto') {
          totalOpen += s.total_amount;
        }
      });

    return totalOpen;
  }

  public getFiadoPayments(): FiadoPayment[] {
    return this.getItem<FiadoPayment[]>(STORAGE_KEYS.FIADO_PAYMENTS, []);
  }

  public processFiadoPayment({
    customerId,
    customerName,
    receivedAmount,
    paymentMethod,
    notes,
  }: {
    customerId: string;
    customerName: string;
    receivedAmount: number;
    paymentMethod: string;
    notes?: string;
  }): { payment: FiadoPayment; remainingBalance: number; fullyPaid: boolean } {
    if (receivedAmount <= 0) {
      throw new Error('O valor recebido deve ser maior que zero.');
    }

    const previousBalance = this.getCustomerOpenBalance(customerId);
    const user = this.getCurrentUser();
    const nowISO = new Date().toISOString();

    const sales = this.getFiadoSales();
    let remainingToDeduct = receivedAmount;

    // Process open sales for this customer chronologically
    const customerSales = sales
      .filter((s) => s.customer_id === customerId && s.status === 'aberto')
      .sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

    for (const sale of customerSales) {
      if (remainingToDeduct <= 0) break;

      if (sale.installments && sale.installments.length > 0) {
        for (const inst of sale.installments) {
          if (remainingToDeduct <= 0) break;
          if (inst.status === 'aberta') {
            if (remainingToDeduct >= inst.amount) {
              remainingToDeduct -= inst.amount;
              inst.status = 'paga';
              inst.paid_at = nowISO;
            } else {
              // Partial installment payment
              inst.amount = Math.round((inst.amount - remainingToDeduct) * 100) / 100;
              remainingToDeduct = 0;
            }
          }
        }
        if (sale.installments.every((i) => i.status === 'paga')) {
          sale.status = 'pago';
          sale.paid_at = nowISO;
        }
      } else {
        if (remainingToDeduct >= sale.total_amount) {
          remainingToDeduct -= sale.total_amount;
          sale.status = 'pago';
          sale.paid_at = nowISO;
        } else {
          // Partial sale payment
          sale.total_amount = Math.round((sale.total_amount - remainingToDeduct) * 100) / 100;
          remainingToDeduct = 0;
        }
      }
    }

    this.setItem(STORAGE_KEYS.FIADO_SALES, sales);

    const newBalance = this.getCustomerOpenBalance(customerId);

    const payment: FiadoPayment = {
      id: 'pay-' + Date.now(),
      customer_id: customerId,
      customer_name: customerName,
      received_amount: receivedAmount,
      previous_balance: previousBalance,
      remaining_balance: newBalance,
      payment_method: paymentMethod,
      operator_id: user.id,
      operator_name: user.name,
      date: nowISO,
      notes,
    };

    const payments = this.getFiadoPayments();
    payments.unshift(payment);
    this.setItem(STORAGE_KEYS.FIADO_PAYMENTS, payments);

    this.addAuditLog(
      'ajuste_manual',
      `Recebimento de Fiado (${paymentMethod}): R$ ${receivedAmount.toFixed(2)} de ${customerName}. Saldo restante: R$ ${newBalance.toFixed(2)}`
    );

    return {
      payment,
      remainingBalance: newBalance,
      fullyPaid: newBalance === 0,
    };
  }

  // --- BATCH PRICE UPDATES (ALTERAÇÃO EM LOTE DE PREÇOS) ---
  public bulkUpdatePricesBatch(
    updatedProductsList: {
      id: string;
      cost_price?: number;
      markup?: number;
      sale_price?: number;
      unit_price?: number;
    }[]
  ): number {
    const products = this.getProducts();
    let count = 0;

    updatedProductsList.forEach((up) => {
      const idx = products.findIndex((p) => p.id === up.id);
      if (idx !== -1) {
        if (up.cost_price !== undefined) products[idx].cost_price = up.cost_price;
        if (up.markup !== undefined) products[idx].markup = up.markup;
        const finalSale = up.sale_price !== undefined ? up.sale_price : up.unit_price;
        if (finalSale !== undefined) {
          products[idx].sale_price = finalSale;
          products[idx].unit_price = finalSale;
        }
        products[idx].updated_at = new Date().toISOString();
        count++;
      }
    });

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('alteracao_lote', `Atualização em lote de preços realizada para ${count} produto(s).`);
    return count;
  }

  // --- BATCH STOCK ADJUSTMENT (AJUSTE DE ESTOQUE EM LOTE) ---
  public bulkAdjustStockBatch(
    adjustments: {
      productId: string;
      newStock: number;
      notes?: string;
    }[],
    globalReason: string
  ): number {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem realizar ajustes de estoque em lote.');
    }
    if (!globalReason.trim()) {
      throw new Error('O motivo do ajuste é obrigatório.');
    }

    const products = this.getProducts();
    const movements = this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
    let count = 0;
    const nowISO = new Date().toISOString();

    adjustments.forEach((adj) => {
      const idx = products.findIndex((p) => p.id === adj.productId);
      if (idx !== -1) {
        const prod = products[idx];
        const prevStock = prod.current_stock || 0;
        const newStock = Number(adj.newStock);

        if (prevStock !== newStock) {
          const diff = newStock - prevStock;
          prod.current_stock = newStock;
          prod.updated_at = nowISO;

          const movement: Movement = {
            id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            date: nowISO,
            user_id: user.id,
            user_name: user.name,
            user_role: user.role,
            product_id: prod.id,
            product_name: prod.name,
            type: 'ajuste',
            used_qty: diff,
            used_unit: prod.main_unit,
            converted_qty: Math.abs(diff),
            main_unit: prod.main_unit,
            prev_stock: prevStock,
            current_stock: newStock,
            origin: 'inventario',
            notes: adj.notes
              ? `${globalReason} - ${adj.notes}`
              : `Ajuste em lote: ${globalReason} (Anterior: ${prevStock}, Novo: ${newStock})`,
            created_at: nowISO,
          };

          movements.unshift(movement);
          count++;
        }
      }
    });

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'ajuste_manual',
      `Ajuste de estoque em lote realizado em ${count} produto(s). Motivo: ${globalReason}`
    );

    return count;
  }

  // --- BATCHES (LOTES & VALIDADE - FIFO) ---
  public getBatches(): Batch[] {
    return this.getItem<Batch[]>(STORAGE_KEYS.BATCHES, []);
  }

  public addOrUpdateBatch({
    productId,
    productName,
    batchNumber,
    expirationDate,
    addQty,
  }: {
    productId: string;
    productName: string;
    batchNumber: string;
    expirationDate: string;
    addQty: number;
  }): Batch {
    const batches = this.getBatches();
    const index = batches.findIndex((b) => b.product_id === productId && b.batch_number === batchNumber);

    if (index !== -1) {
      batches[index].current_qty += addQty;
      this.setItem(STORAGE_KEYS.BATCHES, batches);
      return batches[index];
    }

    const newBatch: Batch = {
      id: 'bt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
      product_id: productId,
      product_name: productName,
      batch_number: batchNumber,
      expiration_date: expirationDate,
      initial_qty: addQty,
      current_qty: addQty,
      created_at: new Date().toISOString(),
    };

    batches.push(newBatch);
    this.setItem(STORAGE_KEYS.BATCHES, batches);
    return newBatch;
  }

  private consumeBatchesFifo(productId: string, qtyToConsume: number): { batchNumbers: string } {
    const batches = this.getBatches()
      .filter((b) => b.product_id === productId && b.current_qty > 0)
      .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()); // Earliest expiration first

    let remaining = qtyToConsume;
    const consumedLotNumbers: string[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      if (batch.current_qty >= remaining) {
        batch.current_qty -= remaining;
        remaining = 0;
        consumedLotNumbers.push(batch.batch_number);
      } else {
        remaining -= batch.current_qty;
        consumedLotNumbers.push(`${batch.batch_number} (${batch.current_qty})`);
        batch.current_qty = 0;
      }
    }

    // Save updated batches
    const allBatches = this.getBatches().map((b) => {
      const updated = batches.find((ub) => ub.id === b.id);
      return updated || b;
    });
    this.setItem(STORAGE_KEYS.BATCHES, allBatches);

    return {
      batchNumbers: consumedLotNumbers.join(', ') || 'Sem lote',
    };
  }

  // --- XML IMPORTS & LINKS ---
  public getXmlImports(): XmlImport[] {
    return this.getItem<XmlImport[]>(STORAGE_KEYS.XML_IMPORTS, []);
  }

  public getXmlLinks(): XmlLink[] {
    return this.getItem<XmlLink[]>(STORAGE_KEYS.XML_LINKS, []);
  }

  public saveXmlLink(link: Omit<XmlLink, 'id' | 'created_at'>): XmlLink {
    const links = this.getXmlLinks();
    const existingIndex = links.findIndex((l) => l.xml_cprod === link.xml_cprod);

    const newLink: XmlLink = {
      ...link,
      id: existingIndex !== -1 ? links[existingIndex].id : 'link-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      links[existingIndex] = newLink;
    } else {
      links.push(newLink);
    }

    this.setItem(STORAGE_KEYS.XML_LINKS, links);
    return newLink;
  }

  public recordXmlImport(importData: Omit<XmlImport, 'id' | 'created_at'>): XmlImport {
    const user = this.getCurrentUser();
    const newImport: XmlImport = {
      ...importData,
      id: 'xml-' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      created_at: new Date().toISOString(),
    };

    const imports = this.getXmlImports();
    imports.unshift(newImport);
    this.setItem(STORAGE_KEYS.XML_IMPORTS, imports);

    this.addAuditLog(
      'importacao_xml',
      `Importação de XML da NFe #${importData.nfe_number || 'S/N'} (${importData.items_count} itens)`
    );

    return newImport;
  }

  public deleteXmlImport(id: string): boolean {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem excluir histórico de XML.');
    }

    const imports = this.getXmlImports();
    const filtered = imports.filter((x) => x.id !== id);
    this.setItem(STORAGE_KEYS.XML_IMPORTS, filtered);
    this.addAuditLog('exclusao_xml', `Excluído registro de importação XML id: ${id}`);
    return true;
  }

  public deleteXmlImportWithStockRollback(importId: string): { success: boolean; rolledBackItems: number } {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem excluir entradas XML e reverter estoque.');
    }

    const xmlImports = this.getXmlImports();
    const xmlImp = xmlImports.find((x) => x.id === importId);
    if (!xmlImp) {
      throw new Error('Registro de importação XML não encontrado.');
    }

    const nfeNum = xmlImp.nfe_number;
    const movements = this.getMovements();
    const products = this.getProducts();
    let rolledBackCount = 0;

    // Find all movements associated with this NFe
    const movementsToRemove = movements.filter(
      (m) => m.origin === 'xml' && (
        (m.notes && (m.notes.includes(`NFe #${nfeNum}`) || m.notes.includes(nfeNum))) ||
        (xmlImp.supplier_name && m.supplier_name === xmlImp.supplier_name && Math.abs(new Date(m.date).getTime() - new Date(xmlImp.import_date).getTime()) < 3600000)
      )
    );

    // Rollback stock for each movement
    movementsToRemove.forEach((mov) => {
      const prodIndex = products.findIndex((p) => p.id === mov.product_id);
      if (prodIndex !== -1) {
        const current = products[prodIndex].current_stock || 0;
        // Subtract stock imported by this XML entry
        products[prodIndex].current_stock = Math.max(0, current - mov.converted_qty);
        products[prodIndex].updated_at = new Date().toISOString();
        rolledBackCount++;
      }
    });

    this.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Remove movements
    const remainingMovements = movements.filter(
      (m) => !movementsToRemove.some((rm) => rm.id === m.id)
    );
    this.setItem(STORAGE_KEYS.MOVEMENTS, remainingMovements);

    // Remove XML import record
    const remainingImports = xmlImports.filter((x) => x.id !== importId);
    this.setItem(STORAGE_KEYS.XML_IMPORTS, remainingImports);

    this.addAuditLog(
      'exclusao_xml',
      `Excluída entrada XML NFe #${nfeNum} e revertido estoque de ${rolledBackCount} item(ns).`
    );

    return { success: true, rolledBackItems: rolledBackCount };
  }

  // --- BULK PRODUCT OPERATIONS ---
  public bulkUpdateProducts(
    productIds: string[],
    updates: {
      category_id?: string;
      main_unit?: string;
      min_stock?: number;
      add_conversion?: { from_unit: string; to_unit: string; factor: number };
      replace_conversions?: boolean;
      save_as_global_preset?: { name: string };
    }
  ): number {
    const products = this.getProducts();
    let updatedCount = 0;

    if (updates.save_as_global_preset && updates.add_conversion) {
      this.saveConversionPreset({
        name: updates.save_as_global_preset.name || `${updates.add_conversion.from_unit} -> ${updates.add_conversion.to_unit}`,
        from_unit: updates.add_conversion.from_unit,
        to_unit: updates.add_conversion.to_unit,
        factor: updates.add_conversion.factor,
      });
    }

    products.forEach((p) => {
      if (productIds.includes(p.id)) {
        if (updates.category_id !== undefined && updates.category_id !== '') {
          p.category_id = updates.category_id;
        }
        if (updates.main_unit !== undefined && updates.main_unit !== '') {
          p.main_unit = updates.main_unit.toLowerCase().trim();
        }
        if (updates.min_stock !== undefined && !isNaN(updates.min_stock)) {
          p.min_stock = updates.min_stock;
        }
        if (updates.add_conversion) {
          if (!p.conversions || updates.replace_conversions) {
            p.conversions = [];
          }
          const existingIdx = p.conversions.findIndex(
            (c) =>
              c.from_unit.toLowerCase() === updates.add_conversion!.from_unit.toLowerCase() &&
              c.to_unit.toLowerCase() === updates.add_conversion!.to_unit.toLowerCase()
          );
          if (existingIdx !== -1) {
            p.conversions[existingIdx].factor = updates.add_conversion.factor;
          } else {
            p.conversions.push({
              id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              product_id: p.id,
              from_unit: updates.add_conversion.from_unit.toLowerCase(),
              to_unit: updates.add_conversion.to_unit.toLowerCase(),
              factor: updates.add_conversion.factor,
            });
          }
        }
        p.updated_at = new Date().toISOString();
        updatedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('alteracao_lote', `Alteração em lote realizada para ${updatedCount} produto(s).`);
    return updatedCount;
  }

  public bulkDeleteProducts(productIds: string[]): number {
    const user = this.getCurrentUser();
    if (user.role !== 'admin') {
      throw new Error('Apenas Administradores podem excluir produtos em lote.');
    }

    let products = this.getProducts();
    const initialCount = products.length;
    products = products.filter((p) => !productIds.includes(p.id));
    const deletedCount = initialCount - products.length;

    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog('exclusao_lote', `Excluídos ${deletedCount} produto(s) em lote.`);
    return deletedCount;
  }

  // --- INVENTORIES ---
  public getInventories(): Inventory[] {
    return this.getItem<Inventory[]>(STORAGE_KEYS.INVENTORIES, []);
  }

  public saveInventory(inventory: Omit<Inventory, 'id' | 'created_at'>): Inventory {
    const user = this.getCurrentUser();
    const newInv: Inventory = {
      ...inventory,
      id: 'inv-' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      created_at: new Date().toISOString(),
    };

    const inventories = this.getInventories();
    inventories.unshift(newInv);
    this.setItem(STORAGE_KEYS.INVENTORIES, inventories);

    // Automatically apply stock adjustments for items with difference
    for (const item of newInv.items) {
      if (item.diff_qty !== undefined && item.diff_qty !== 0 && item.converted_counted_qty !== undefined) {
        this.registerAdjustment(item.product_id, item.converted_counted_qty, `Inventário #${newInv.id}`);
      }
    }

    this.addAuditLog('inventario', `Concluído inventário de estoque com ${newInv.items.length} itens.`);
    return newInv;
  }

  // --- PRODUCT PRICE UPDATE FROM ENTRY ---
  public updateProductPrices(
    productId: string,
    costPrice?: number,
    salePrice?: number,
    markup?: number
  ): Product | null {
    const products = this.getProducts();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return null;

    const current = products[idx];
    const newCost = costPrice !== undefined && costPrice >= 0 ? costPrice : current.cost_price;
    const newSale = salePrice !== undefined && salePrice >= 0 ? salePrice : (current.sale_price || current.unit_price);
    const newMarkup = markup !== undefined ? markup : current.markup;

    const updatedProduct: Product = {
      ...current,
      cost_price: newCost,
      sale_price: newSale,
      unit_price: newSale,
      markup: newMarkup,
      updated_at: new Date().toISOString(),
    };

    products[idx] = updatedProduct;
    this.setItem(STORAGE_KEYS.PRODUCTS, products);
    this.addAuditLog(
      'alteracao_preco',
      `Preços do produto ${current.name} atualizados na entrada: Custo R$ ${newCost?.toFixed(
        2
      )} | Venda R$ ${newSale?.toFixed(2)} | Markup ${newMarkup?.toFixed(1)}%`,
      productId
    );

    return updatedProduct;
  }

  // --- PRÉ-VENDAS (PRE-SALES) ---
  public getPreSales(): PreSale[] {
    return this.getItem<PreSale[]>(STORAGE_KEYS.PRE_SALES, []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getPreSaleById(id: string): PreSale | null {
    return this.getPreSales().find((p) => p.id === id) || null;
  }

  public savePreSale(
    preSaleData: Omit<PreSale, 'id' | 'code' | 'created_at' | 'status'> & {
      id?: string;
      code?: string;
      status?: PreSaleStatus;
    }
  ): PreSale {
    const preSales = this.getPreSales();
    const now = new Date().toISOString();

    if (preSaleData.id) {
      const idx = preSales.findIndex((p) => p.id === preSaleData.id);
      if (idx !== -1) {
        const updated: PreSale = {
          ...preSales[idx],
          ...preSaleData,
          updated_at: now,
        };
        preSales[idx] = updated;
        this.setItem(STORAGE_KEYS.PRE_SALES, preSales);
        this.addAuditLog('pre_venda', `Pré-venda ${updated.code} atualizada. Total R$ ${updated.total_amount.toFixed(2)}`, updated.id);
        return updated;
      }
    }

    const nextNumber = preSales.length + 1001;
    const code = preSaleData.code || `PV-${nextNumber}`;

    const newPreSale: PreSale = {
      id: 'pv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      code,
      customer_id: preSaleData.customer_id,
      customer_name: preSaleData.customer_name,
      date: preSaleData.date || now,
      valid_until: preSaleData.valid_until,
      items: preSaleData.items,
      total_amount: preSaleData.total_amount,
      notes: preSaleData.notes,
      status: preSaleData.status || 'pendente',
      created_at: now,
    };

    preSales.unshift(newPreSale);
    this.setItem(STORAGE_KEYS.PRE_SALES, preSales);
    this.addAuditLog('pre_venda', `Nova pré-venda ${newPreSale.code} criada (${newPreSale.customer_name || 'Cliente Avulso'}). Total R$ ${newPreSale.total_amount.toFixed(2)}`, newPreSale.id);

    return newPreSale;
  }

  public updatePreSaleStatus(id: string, status: PreSaleStatus): boolean {
    const preSales = this.getPreSales();
    const idx = preSales.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    preSales[idx].status = status;
    preSales[idx].updated_at = new Date().toISOString();

    this.setItem(STORAGE_KEYS.PRE_SALES, preSales);

    if (status === 'cancelada') {
      this.addAuditLog('cancelamento_pre_venda', `Pré-venda ${preSales[idx].code} CANCELADA. Nenhum estoque movimentado.`, id);
    } else if (status === 'finalizada') {
      this.addAuditLog('pre_venda', `Pré-venda ${preSales[idx].code} FINALIZADA e convertida em venda no PDV.`, id);
    }

    return true;
  }

  // --- SYSTEM SETTINGS ---
  public getSettings(): SystemSettings {
    const defaultSettings: SystemSettings = {
      allow_negative_stock: false,
      auto_clear_form: true,
      fiado_interest_rate: 5,
    };
    return this.getItem<SystemSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
  }

  public updateSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...newSettings,
    };

    this.setItem(STORAGE_KEYS.SETTINGS, updated);

    if (newSettings.allow_negative_stock !== undefined && newSettings.allow_negative_stock !== current.allow_negative_stock) {
      this.addAuditLog(
        'configuracao',
        `Configuração de Estoque alterada: Permitir estoque negativo = ${newSettings.allow_negative_stock ? 'Sim' : 'Não'}`
      );
    }

    if (newSettings.auto_clear_form !== undefined && newSettings.auto_clear_form !== current.auto_clear_form) {
      this.addAuditLog(
        'configuracao',
        `Configuração Operacional alterada: Limpar tela após lançamento = ${newSettings.auto_clear_form ? 'Sim' : 'Não'}`
      );
    }

    if (newSettings.fiado_interest_rate !== undefined && newSettings.fiado_interest_rate !== current.fiado_interest_rate) {
      this.addAuditLog(
        'configuracao',
        `Configuração Financeira alterada: Juros fiado padrão = ${newSettings.fiado_interest_rate}%`
      );
    }

    return updated;
  }

  public getSuperadminSelectedCompanyId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SUPERADMIN_SELECTED_COMPANY_ID);
  }

  public setSuperadminSelectedCompanyId(companyId: string | null): void {
    if (!companyId) {
      localStorage.removeItem(STORAGE_KEYS.SUPERADMIN_SELECTED_COMPANY_ID);
    } else {
      localStorage.setItem(STORAGE_KEYS.SUPERADMIN_SELECTED_COMPANY_ID, companyId);
    }
    this.notify();
  }

  public getCurrentUserCompany(): Company {
    const currentUser = this.getCurrentUser();
    const companies = this.getCompanies();

    // If Superadmin has manually selected a company view override
    if (currentUser && (currentUser.email.toLowerCase() === SUPERADMIN_EMAIL || currentUser.role === 'superadmin')) {
      const selectedId = this.getSuperadminSelectedCompanyId();
      if (selectedId) {
        const selectedComp = companies.find((c) => c.id === selectedId);
        if (selectedComp) return selectedComp;
      }
    }

    if (currentUser && currentUser.company_id) {
      const found = companies.find((c) => c.id === currentUser.company_id);
      if (found) return found;
    }
    return companies[0] || DEFAULT_COMPANIES[0];
  }
}

export const storage = new StorageService();

