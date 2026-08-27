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
  NavTab,
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
  DailyConference,
  SupportTicket,
  KnowledgeTutorial,
  ReleaseNote,
  SellerLoad,
  SellerLoadItem,
  SellerLoadSale,
  SellerLoadStatus,
  MovementOrigin,
  Driver,
} from '../types';

import { convertToMainUnit, normalizeUnitToken } from '../lib/unitConverter';
import { getSupabaseClient } from '../lib/supabase';

const STORAGE_KEYS = {
  USERS: 'aquinos_users',
  CURRENT_USER: 'aquinos_current_user',
  COMPANIES: 'aquinos_companies',
  SUPERADMIN_SELECTED_COMPANY_ID: 'aquinos_superadmin_selected_company_id',
  IMPERSONATED_COMPANY_ID: 'aquinos_impersonated_company_id',
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
  DAILY_CONFERENCES: 'aquinos_daily_conferences',
  SUPPORT_TICKETS: 'aquinos_support_tickets',
  KNOWLEDGE_TUTORIALS: 'aquinos_knowledge_tutorials',
  SELLER_LOADS: 'aquinos_seller_loads',
  DRIVERS: 'aquinos_drivers',
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
    username: 'amaryel',
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
    username: 'francisco',
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
    username: 'joao',
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

const DEFAULT_TUTORIALS: KnowledgeTutorial[] = [
  {
    id: 'tut-1',
    category: 'Primeiros passos',
    title: 'Visão Geral do Chronix ERP e Navegação Principal',
    description: 'Aprenda os conceitos básicos do sistema, navegação pelos módulos e atalhos rápidos.',
    content_markdown: `
### Bem-vindo ao Chronix ERP!

O Chronix ERP foi projetado para ser intuitivo, rápido e seguro. A barra de navegação principal permite acesso direto a:

1. **Início (Dashboard)**: Métricas globais de estoque, vendas do dia, alertas de produtos críticos e atalhos de ação.
2. **Cadastros**: Gestão de Produtos, Unidades de Conversão, Clientes e Atualização em Lote de Preços.
3. **Movimentações**: Entradas por XML de NF-e, Ajuste Manual de Estoque e Registro de Saídas.
4. **Vendas & PDV**: Venda Rápida / Balcão e PDV Completo.
5. **Fiado**: Gestão de Cobranças, Vendas a Prazo e Extrato do Cliente.
6. **Conferência Diária**: Fechamento de Caixa e Contagem Física de Estoque.
7. **Relatórios & Auditoria**: Análise financeira, lucratividade e registro de ações dos usuários.
8. **Central de Ajuda**: Tutoriais e Suporte Técnico Direto.

> **Dica**: Use o botão **"?" (Como usar)** no topo de qualquer tela para ver instruções específicas daquela funcionalidade.
`,
    reading_time: '3 min',
    is_featured: true,
    is_published: true,
    views_count: 142,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tut-2',
    category: 'Cadastro de produtos',
    title: 'Como Cadastrar Produtos com Conversão de Unidades (CX para KG/UN)',
    description: 'Aprenda a cadastrar itens, configurar fatores de conversão e definir estoque mínimo.',
    content_markdown: `
### Cadastro e Conversão de Unidades

Ao cadastrar um produto, informe:
- **Nome do Produto**: Ex: Queijo Mussarela Sadia
- **Unidade Principal**: A unidade que você vende ou estoca (ex: **KG** ou **UN**).
- **Estoque Mínimo**: Quantidade para receber alertas de reposição.
- **Preço de Custo e Preço de Venda**: O sistema calcula automaticamente o markup (margem de lucro).

#### Fator de Conversão de Caixa (CX)
Se você compra produtos por Caixa (CX) mas vende em Quilos (KG) ou Unidades (UN):
1. Selecione se 1 Caixa equivale a **KG** ou **UN**.
2. Digite o valor do fator (ex: 20 se cada caixa vem com 20 KG).
3. Ao importar uma NF-e XML com a unidade CX, o sistema multiplicará automaticamente pela quantidade de caixas!
`,
    reading_time: '4 min',
    is_featured: true,
    is_published: true,
    views_count: 98,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tut-3',
    category: 'Entradas',
    title: 'Importação Automática de NF-e via Arquivo XML',
    description: 'Dê entrada de mercadorias no estoque em segundos lendo o arquivo XML da Nota Fiscal.',
    content_markdown: `
### Entrada de Estoque via XML

1. Acesse **Entradas / Importar XML** ou clique em **Importar XML** no topo do sistema.
2. Arraste ou selecione o arquivo XML da NF-e fornecida pela fábrica/distribuidora.
3. O sistema lerá todos os itens do XML e sugerirá a associação automática com os produtos cadastrados.
4. Se for um produto novo, você poderá cadastrá-lo diretamente na tela da importação.
5. Se a unidade do XML for Caixa (CX), selecione o fator de conversão para transformar em KG/UN.
6. Clique em **Confirmar Entrada**. O estoque será atualizado e um registro de auditoria será gerado!

> **Reversão**: Se precisar excluir uma importação incorreta, acesse o Histórico de XML e clique em **Reverter e Excluir**. O sistema subtrairá exatamente o estoque importado.
`,
    reading_time: '5 min',
    is_featured: true,
    is_published: true,
    views_count: 215,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tut-4',
    category: 'PDV',
    title: 'Como Realizar Vendas Rápidas e Operação no PDV',
    description: 'Passo a passo para registrar vendas no balcão, aplicar descontos e emitir recibos.',
    content_markdown: `
### Venda Rápida e Balcão

1. Acesse o menu **Venda Rápida / PDV**.
2. Selecione o produto pelo nome, código de barras ou pesagem.
3. Ajuste a quantidade e a unidade (CX, KG ou UN).
4. Escolha a forma de pagamento: **Dinheiro**, **PIX**, **Cartão de Débito/Crédito** ou **Fiado**.
5. Se for Fiado, selecione o cliente e o número de parcelas.
6. Clique em **Finalizar Venda**. O comprovante/recibo será exibido com opção de impressão ou download em PDF.
`,
    reading_time: '3 min',
    is_featured: false,
    is_published: true,
    views_count: 178,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tut-5',
    category: 'Fiado',
    title: 'Gestão de Fiado, Limite de Crédito e Extrato do Cliente',
    description: 'Como controlar contas a receber, receber pagamentos parciais e emitir comprovantes.',
    content_markdown: `
### Gestão do Módulo Fiado

1. **Cadastrar Cliente**: Defina limite de crédito e dados de contato no menu **Clientes**.
2. **Vender no Fiado**: Selecione o cliente no PDV. Se a venda ultrapassar o limite, o sistema emitirá um alerta.
3. **Receber Pagamento**:
   - Vá no menu **Fiado & Cobranças**.
   - Busque o cliente e clique em **Baixar / Receber Pagamento**.
   - Informe o valor recebido e o meio (Dinheiro, PIX, Cartão).
   - O saldo devedor será abatido automaticamente e um recibo de pagamento será gerado.
`,
    reading_time: '4 min',
    is_featured: false,
    is_published: true,
    views_count: 112,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_RELEASE_NOTES: ReleaseNote[] = [
  {
    id: 'rel-1',
    version: 'v2.5.0',
    date: new Date().toISOString(),
    title: 'Atualização do Painel Super Admin, Onboarding e Central de Suporte',
    features: [
      'Novo Painel Super Admin isolado com Métricas Globais, Gestão Multi-Empresas e Aprovação de Contas.',
      'Acesso Impersonado às Empresas ("Acessar Empresa") com registro de auditoria.',
      'Central de Ajuda e Tutoriais em Texto e Vídeo com Pesquisa Inteligente.',
      'Tour Guiado Interativo para novos usuários.',
      'Botão "Preciso de Ajuda" em todas as telas com envio direto para amaryelcc@gmail.com.',
    ],
    improvements: [
      'Aprimoramento do fluxo de login e verificação de senhas e aprovações.',
      'Exclusão de importações XML com reversão total e precisa de estoque.',
      'Interface responsiva otimizada para mobile e PWA.',
    ],
    fixes: [
      'Remoção de logins automáticos de não-autenticados.',
      'Bloqueio de solicitações com contas não aprovadas.',
    ],
  },
];

class StorageService {
  private listeners: Array<() => void> = [];

  constructor() {
    this.initDefaultData();
    this.syncUsersFromSupabase();
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
    if (currUserStr) {
      try {
        const parsed = JSON.parse(currUserStr);
        if (parsed.email && parsed.email.toLowerCase() === SUPERADMIN_EMAIL) {
          parsed.role = 'superadmin';
          parsed.is_blocked = false;
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(parsed));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
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
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_TUTORIALS)) {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_TUTORIALS, JSON.stringify(DEFAULT_TUTORIALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify([]));
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

  // --- SUPABASE USER SYNC HELPERS ---
  public async saveUserToSupabase(user: User): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      await client.from('usuarios').upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username || null,
        password: user.password || '123',
        role: user.role,
        company_id: user.company_id || 'comp-aquino',
        is_approved: user.is_approved !== false,
        is_blocked: user.is_blocked === true,
        allowed_modules: user.allowed_modules ? JSON.stringify(user.allowed_modules) : null,
        created_at: user.created_at || new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to save user to Supabase:', err);
    }
  }

  public async deleteUserFromSupabase(userId: string): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;
      await client.from('usuarios').delete().eq('id', userId);
    } catch (err) {
      console.warn('Failed to delete user from Supabase:', err);
    }
  }

  public async syncUsersFromSupabase(): Promise<User[]> {
    try {
      const client = getSupabaseClient();
      if (!client) return this.getUsers();

      const { data, error } = await client.from('usuarios').select('*');
      if (error || !data) {
        return this.getUsers();
      }

      if (data.length === 0) {
        const local = this.getUsers();
        for (const u of local) {
          await this.saveUserToSupabase(u);
        }
        return local;
      }

      const localUsers = this.getUsers();
      const userMap = new Map<string, User>();

      for (const u of localUsers) {
        userMap.set(u.id, u);
      }

      for (const row of data) {
        let allowedModules: NavTab[] | undefined = undefined;
        if (row.allowed_modules) {
          try {
            allowedModules = typeof row.allowed_modules === 'string'
              ? JSON.parse(row.allowed_modules)
              : Array.isArray(row.allowed_modules)
              ? row.allowed_modules
              : undefined;
          } catch {
            allowedModules = undefined;
          }
        }

        const remoteUser: User = {
          id: row.id || 'usr-' + Date.now(),
          name: row.name || 'Usuário',
          email: row.email,
          username: row.username || undefined,
          password: row.password || '123',
          role: row.role || 'funcionario',
          company_id: row.company_id || 'comp-aquino',
          is_approved: row.is_approved !== false,
          is_blocked: row.is_blocked === true,
          allowed_modules: allowedModules,
          created_at: row.created_at || new Date().toISOString(),
        };

        const existingById = userMap.get(remoteUser.id);
        const existingByEmail = Array.from(userMap.values()).find(
          (u) => u.email.toLowerCase() === remoteUser.email.toLowerCase()
        );

        const target = existingById || existingByEmail;
        if (target) {
          const merged: User = {
            ...target,
            ...remoteUser,
            allowed_modules: remoteUser.allowed_modules !== undefined ? remoteUser.allowed_modules : target.allowed_modules,
            role: remoteUser.email.toLowerCase() === SUPERADMIN_EMAIL ? 'superadmin' : remoteUser.role,
            is_approved: remoteUser.email.toLowerCase() === SUPERADMIN_EMAIL ? true : remoteUser.is_approved,
            is_blocked: remoteUser.email.toLowerCase() === SUPERADMIN_EMAIL ? false : remoteUser.is_blocked,
          };
          userMap.set(merged.id, merged);
        } else {
          userMap.set(remoteUser.id, remoteUser);
        }
      }

      const mergedUsers = Array.from(userMap.values());
      let hasSuper = false;
      for (const u of mergedUsers) {
        if (u.email.toLowerCase() === SUPERADMIN_EMAIL) {
          hasSuper = true;
          u.role = 'superadmin';
          u.is_approved = true;
          u.is_blocked = false;
        }
      }
      if (!hasSuper) {
        mergedUsers.unshift(DEFAULT_USERS[0]);
      }

      this.setItem(STORAGE_KEYS.USERS, mergedUsers);
      return mergedUsers;
    } catch (err) {
      console.warn('Error in syncUsersFromSupabase:', err);
      return this.getUsers();
    }
  }

  // --- AUTHENTICATION & USER MANAGEMENT ---
  public getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public getActiveSession(): User | null {
    try {
      const rememberMe = localStorage.getItem('aquinos_remember_me') === 'true';
      const sessionActive = sessionStorage.getItem('aquinos_session_active') === 'true';

      if (!rememberMe && !sessionActive) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }

      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      const user: User = JSON.parse(data);

      const users = this.getUsers();
      const dbUser = users.find((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (dbUser && dbUser.is_blocked) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        sessionStorage.removeItem('aquinos_session_active');
        return null;
      }
      if (dbUser) return dbUser;
      return user;
    } catch {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      return null;
    }
  }

  public getCurrentUser(): User | null {
    return this.getActiveSession();
  }

  public setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
    sessionStorage.setItem('aquinos_session_active', 'true');
    this.addAuditLog('troca_perfil', `Sessão ativa para ${user.name} (${user.role.toUpperCase()})`);
  }

  public login(identifier: string, password?: string): { success: boolean; user?: User; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const users = this.getUsers();

    // Match by email, username or name
    let found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.name && u.name.toLowerCase() === cleanId)
    );

    // If superadmin email and not found yet, create automatically
    if (!found && cleanId === SUPERADMIN_EMAIL) {
      found = {
        id: 'usr-superadmin',
        name: 'Amaryel (Superadmin)',
        email: SUPERADMIN_EMAIL,
        username: 'amaryel',
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
      return { success: false, error: 'Usuário não encontrado com este e-mail ou nome de usuário. Solicite o cadastro ou verifique seus dados.' };
    }

    // Special logic for Superadmin (amaryelcc@gmail.com): always approve and auto-update password if entered
    if (cleanId === SUPERADMIN_EMAIL || found.email.toLowerCase() === SUPERADMIN_EMAIL) {
      found.role = 'superadmin';
      found.is_approved = true;
      found.is_blocked = false;
      if (password) {
        found.password = password;
        const idx = users.findIndex((u) => u.email.toLowerCase() === SUPERADMIN_EMAIL);
        if (idx !== -1) {
          users[idx] = { ...found };
          this.setItem(STORAGE_KEYS.USERS, users);
        }
      }
    } else {
      // Check if blocked
      if (found.is_blocked) {
        return {
          success: false,
          error: 'Sua conta foi bloqueada. Entre em contato com o suporte ou Administrador.',
        };
      }

      // Check if approved
      if (found.is_approved === false) {
        return {
          success: false,
          error: 'Sua conta está pendente de liberação pelo Administrador.',
        };
      }

      // Password verification for regular users
      const expectedPassword = found.password || '123';
      if (password && expectedPassword !== password) {
        return { success: false, error: 'Senha incorreta. Verifique sua senha ou clique em "Esqueci minha senha" para redefinir.' };
      }
    }

    // Check company status if user belongs to a company
    if (found.company_id && found.email.toLowerCase() !== SUPERADMIN_EMAIL) {
      const company = this.getCompanyById(found.company_id);
      if (company && company.status === 'blocked') {
        return {
          success: false,
          error: `A empresa ${company.name} está inativa no sistema. Acesso suspenso.`,
        };
      }
    }

    this.setCurrentUser(found);
    return { success: true, user: found };
  }

  public resetUserPasswordByEmail(email: string, newPassword: string): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === cleanEmail || (u.username && u.username.toLowerCase() === cleanEmail)
    );

    if (idx === -1) {
      return { success: false, error: 'Usuário ou e-mail não encontrado no sistema.' };
    }

    users[idx].password = newPassword;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.saveUserToSupabase(users[idx]);
    this.addAuditLog('alteracao_lote', `Senha redefinida com sucesso para ${users[idx].name}`);

    return { success: true };
  }

  public registerUser(data: {
    name: string;
    email: string;
    username?: string;
    password?: string;
    role?: UserRole;
    company_id?: string;
    is_approved?: boolean;
    allowed_modules?: NavTab[];
  }): { success: boolean; user?: User; error?: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = (data.username || '').trim().toLowerCase();
    const users = this.getUsers();

    // Check existing by email or username
    const existingIndex = users.findIndex(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (cleanUsername && u.username && u.username.toLowerCase() === cleanUsername)
    );

    if (existingIndex !== -1) {
      if (cleanEmail === SUPERADMIN_EMAIL) {
        // Update superadmin credentials directly
        const superUser: User = {
          ...users[existingIndex],
          name: data.name.trim() || 'Amaryel (Superadmin)',
          username: cleanUsername || users[existingIndex].username || 'amaryel',
          password: data.password || users[existingIndex].password || '123',
          role: 'superadmin',
          is_approved: true,
          is_blocked: false,
        };
        users[existingIndex] = superUser;
        this.setItem(STORAGE_KEYS.USERS, users);
        this.saveUserToSupabase(superUser);
        this.setCurrentUser(superUser);
        return { success: true, user: superUser };
      }
      return { success: false, error: 'Este e-mail ou nome de usuário já está cadastrado no sistema.' };
    }

    const isSuper = cleanEmail === SUPERADMIN_EMAIL;
    const assignedRole: UserRole = isSuper ? 'superadmin' : data.role || 'funcionario';

    const newUser: User = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: data.name.trim(),
      email: cleanEmail,
      username: cleanUsername || cleanEmail.split('@')[0],
      role: assignedRole,
      company_id: data.company_id || 'comp-aquino',
      is_approved: data.is_approved !== undefined ? data.is_approved : isSuper ? true : true, // Auto-approve created users
      password: data.password || '123',
      is_blocked: false,
      allowed_modules: data.allowed_modules,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.saveUserToSupabase(newUser);

    this.addAuditLog('cadastro_produto', `Novo usuário cadastrado: ${newUser.name} (${newUser.email} / @${newUser.username})`);

    return { success: true, user: newUser };
  }

  public updateUserFull(userId: string, data: Partial<User>): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

    const existing = users[idx];

    // Check duplicate email
    if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const dup = users.find((u) => u.id !== userId && u.email.toLowerCase() === data.email!.trim().toLowerCase());
      if (dup) return { success: false, error: 'Já existe outro usuário com este e-mail.' };
    }

    // Check duplicate username
    if (data.username && data.username.trim().toLowerCase() !== (existing.username || '').toLowerCase()) {
      const dup = users.find((u) => u.id !== userId && u.username && u.username.toLowerCase() === data.username!.trim().toLowerCase());
      if (dup) return { success: false, error: 'Já existe outro usuário com este nome de usuário.' };
    }

    const updated: User = {
      ...existing,
      ...data,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      email: data.email !== undefined ? data.email.trim().toLowerCase() : existing.email,
      username: data.username !== undefined ? data.username.trim().toLowerCase() : existing.username,
      password: data.password !== undefined && data.password !== '' ? data.password : existing.password,
      allowed_modules: data.allowed_modules !== undefined ? data.allowed_modules : existing.allowed_modules,
    };

    users[idx] = updated;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.saveUserToSupabase(updated);

    const curr = this.getCurrentUser();
    if (curr && curr.id === userId) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, updated);
    }

    this.addAuditLog('alteracao_lote', `Dados do usuário ${updated.name} atualizados com sucesso.`);
    return { success: true, user: updated };
  }

  public updateUserAllowedModules(userId: string, allowedModules: NavTab[]): { success: boolean; error?: string } {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

    const user = users[idx];
    const updated: User = {
      ...user,
      allowed_modules: allowedModules,
    };

    users[idx] = updated;
    this.setItem(STORAGE_KEYS.USERS, users);
    this.saveUserToSupabase(updated);

    const curr = this.getCurrentUser();
    if (curr && curr.id === userId) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, updated);
    }

    this.addAuditLog(
      'alteracao_lote',
      `Módulos permitidos atualizados para ${user.name}: ${allowedModules.length} módulos habilitados.`
    );
    return { success: true };
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
    this.saveUserToSupabase(users[userIndex]);

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
    this.saveUserToSupabase(users[userIndex]);

    const comp = this.getCompanyById(companyId);
    this.addAuditLog('alteracao_lote', `Usuário ${users[userIndex].name} vinculado à empresa ${comp?.name || companyId}`);

    return { success: true };
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem('aquinos_remember_me');
    localStorage.removeItem('aquinos_saved_email');
    localStorage.removeItem('aquinos_saved_password');
    sessionStorage.removeItem('aquinos_session_active');
    try {
      const client = getSupabaseClient();
      if (client && client.auth) {
        client.auth.signOut();
      }
    } catch {
      // ignore
    }
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
    this.saveUserToSupabase(users[userIndex]);

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
    this.saveUserToSupabase(users[userIndex]);
    this.addAuditLog('alteracao_lote', `Função do usuário ${user.name} alterada para ${newRole.toUpperCase()}`);

    return { success: true };
  }

  public updateUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) return { success: false, error: 'Usuário não encontrado.' };

    users[userIndex] = { ...users[userIndex], password: newPassword };
    this.setItem(STORAGE_KEYS.USERS, users);
    this.saveUserToSupabase(users[userIndex]);
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
    this.deleteUserFromSupabase(userId);
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
    origin?: MovementOrigin;
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
      xml_import_id: xmlImportId,
      nfe_number: nfeNumber,
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
    origin?: MovementOrigin;
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

  public registerManualStockAdjustment(productId: string, diff: number, unit: string, notes?: string): Movement {
    const product = this.getProductById(productId);
    if (!product) throw new Error('Produto não encontrado.');

    const conversion = convertToMainUnit(product, diff, unit);
    const convertedDiff = conversion.mainQty;
    const prevStock = product.current_stock || 0;
    const newStock = Math.max(0, prevStock + convertedDiff);

    const products = this.getProducts();
    const prodIndex = products.findIndex((p) => p.id === productId);
    if (prodIndex !== -1) {
      products[prodIndex].current_stock = newStock;
      products[prodIndex].updated_at = new Date().toISOString();
      this.setItem(STORAGE_KEYS.PRODUCTS, products);
    }

    const user = this.getCurrentUser();
    const movement: Movement = {
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString(),
      user_id: user?.id || 'sys',
      user_name: user?.name || 'Sistema',
      user_role: user?.role || 'admin',
      product_id: product.id,
      product_name: product.name,
      type: 'ajuste',
      used_qty: diff,
      used_unit: unit,
      converted_qty: Math.abs(convertedDiff),
      main_unit: product.main_unit,
      prev_stock: prevStock,
      current_stock: newStock,
      origin: 'carga_vendedor',
      notes: notes || `Ajuste por diferença na conferência de carga`,
      created_at: new Date().toISOString(),
    };

    const movements = this.getItem<Movement[]>(STORAGE_KEYS.MOVEMENTS, []);
    movements.unshift(movement);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);

    this.addAuditLog(
      'ajuste_manual',
      `Ajuste de Carga do Vendedor em ${product.name}: ${diff > 0 ? '+' : ''}${diff} ${unit}. Novo estoque: ${newStock}`,
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
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
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
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
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
      (m) =>
        m.xml_import_id === importId ||
        (m.origin === 'xml' &&
          ((nfeNum && m.nfe_number === nfeNum) ||
            (m.notes && nfeNum && (m.notes.includes(`NFe #${nfeNum}`) || m.notes.includes(nfeNum))) ||
            (xmlImp.supplier_name &&
              m.supplier_name === xmlImp.supplier_name &&
              Math.abs(new Date(m.date).getTime() - new Date(xmlImp.import_date).getTime()) < 3600000)))
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

    // Fallback if no movements were linked directly, use saved items in xmlImp
    if (rolledBackCount === 0 && xmlImp.items && Array.isArray(xmlImp.items)) {
      xmlImp.items.forEach((item) => {
        const productId = item.matched_product_id || item.suggested_product_id;
        if (productId) {
          const prodIndex = products.findIndex((p) => p.id === productId);
          if (prodIndex !== -1) {
            const current = products[prodIndex].current_stock || 0;
            const factor = item.selected_unit_conversion || 1;
            const qtyToRollback = (item.qCom || 0) * factor;
            products[prodIndex].current_stock = Math.max(0, current - qtyToRollback);
            products[prodIndex].updated_at = new Date().toISOString();
            rolledBackCount++;
          }
        }
      });
    }

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

    this.notify();

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
      default_allow_fractional: false,
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

  // --- DAILY CONFERENCES (Carga do Vendedor / Conferência Diária) ---
  public getDailyConferences(): DailyConference[] {
    return this.getItem<DailyConference[]>(STORAGE_KEYS.DAILY_CONFERENCES, []);
  }

  public getDailyConferenceByDate(dateStr: string): DailyConference | undefined {
    const list = this.getDailyConferences();
    return list.find((c) => c.date === dateStr);
  }

  public saveDailyConference(conference: DailyConference): void {
    const list = this.getDailyConferences();
    const index = list.findIndex((c) => c.id === conference.id || c.date === conference.date);
    let updatedList: DailyConference[];

    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = {
        ...conference,
        updated_at: new Date().toISOString(),
      };
    } else {
      updatedList = [
        {
          ...conference,
          created_at: conference.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...list,
      ];
    }

    this.setItem(STORAGE_KEYS.DAILY_CONFERENCES, updatedList);
    this.addAuditLog(
      'inventario',
      `Conferência Diária (${conference.date}) ${conference.status === 'fechada' ? 'FECHADA' : 'SALVA'} por ${conference.operator_name}`
    );
  }

  public deleteDailyConference(id: string): void {
    const list = this.getDailyConferences();
    const target = list.find((c) => c.id === id);
    if (!target) return;

    const filtered = list.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEYS.DAILY_CONFERENCES, filtered);
    this.addAuditLog('inventario', `Conferência Diária (${target.date}) excluída.`);
  }

  // --- IMPERSONATION & MULTI-TENANCY ---
  public getImpersonatedCompanyId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
  }

  public setImpersonatedCompanyId(companyId: string | null): void {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.role !== 'superadmin') return;

    if (companyId) {
      localStorage.setItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID, companyId);
      const comp = this.getCompanyById(companyId);
      this.addAuditLog(
        'troca_perfil',
        `Super Admin ${currentUser?.name || 'Amaryel'} iniciou acesso impersonado à empresa ${comp?.name || companyId}`
      );
    } else {
      localStorage.removeItem(STORAGE_KEYS.IMPERSONATED_COMPANY_ID);
      this.addAuditLog('troca_perfil', `Super Admin ${currentUser?.name || 'Amaryel'} encerrou o modo de impersonação`);
    }
    this.notify();
  }

  // --- SUPPORT TICKETS ---
  public getSupportTickets(): SupportTicket[] {
    return this.getItem<SupportTicket[]>(STORAGE_KEYS.SUPPORT_TICKETS, []);
  }

  public saveSupportTicket(data: {
    subject: string;
    description: string;
    attachment_url?: string;
    screen: string;
    user_id: string;
    user_name: string;
    user_email: string;
    company_id: string;
    company_name: string;
    technical_info: SupportTicket['technical_info'];
  }): SupportTicket {
    const tickets = this.getSupportTickets();
    const newTicket: SupportTicket = {
      id: 'tkt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: data.user_id,
      user_name: data.user_name,
      user_email: data.user_email,
      company_id: data.company_id,
      company_name: data.company_name,
      subject: data.subject,
      description: data.description,
      attachment_url: data.attachment_url,
      screen: data.screen,
      technical_info: data.technical_info,
      status: 'Aberto',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tickets.unshift(newTicket);
    this.setItem(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    this.addAuditLog('configuracao', `Chamado de Suporte Aberto: #${newTicket.id.slice(-4)} por ${data.user_name}`);
    this.notify();
    return newTicket;
  }

  public updateSupportTicketStatus(id: string, status: SupportTicket['status'], admin_notes?: string): boolean {
    const tickets = this.getSupportTickets();
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    tickets[idx].status = status;
    if (admin_notes !== undefined) {
      tickets[idx].admin_notes = admin_notes;
    }
    tickets[idx].updated_at = new Date().toISOString();
    this.setItem(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    this.notify();
    return true;
  }

  // --- KNOWLEDGE BASE / TUTORIALS ---
  public getKnowledgeTutorials(): KnowledgeTutorial[] {
    return this.getItem<KnowledgeTutorial[]>(STORAGE_KEYS.KNOWLEDGE_TUTORIALS, DEFAULT_TUTORIALS);
  }

  public saveKnowledgeTutorial(data: Partial<KnowledgeTutorial> & { title: string; category: string; content_markdown: string }): KnowledgeTutorial {
    const tutorials = this.getKnowledgeTutorials();
    if (data.id) {
      const idx = tutorials.findIndex((t) => t.id === data.id);
      if (idx !== -1) {
        tutorials[idx] = { ...tutorials[idx], ...data } as KnowledgeTutorial;
        this.setItem(STORAGE_KEYS.KNOWLEDGE_TUTORIALS, tutorials);
        this.notify();
        return tutorials[idx];
      }
    }
    const newTutorial: KnowledgeTutorial = {
      id: 'tut-' + Date.now(),
      category: data.category,
      title: data.title,
      description: data.description || '',
      content_markdown: data.content_markdown,
      reading_time: data.reading_time || '3 min',
      video_url: data.video_url,
      is_featured: !!data.is_featured,
      is_published: data.is_published !== undefined ? data.is_published : true,
      views_count: 0,
      created_at: new Date().toISOString(),
    };
    tutorials.push(newTutorial);
    this.setItem(STORAGE_KEYS.KNOWLEDGE_TUTORIALS, tutorials);
    this.notify();
    return newTutorial;
  }

  public deleteKnowledgeTutorial(id: string): boolean {
    const tutorials = this.getKnowledgeTutorials();
    const filtered = tutorials.filter((t) => t.id !== id);
    this.setItem(STORAGE_KEYS.KNOWLEDGE_TUTORIALS, filtered);
    this.notify();
    return true;
  }

  public getReleaseNotes(): ReleaseNote[] {
    return DEFAULT_RELEASE_NOTES;
  }

  // --- CARGA DO VENDEDOR (ACERTO DE CARGA) ---
  public getSellerLoads(): SellerLoad[] {
    return this.getItem<SellerLoad[]>(STORAGE_KEYS.SELLER_LOADS, []);
  }

  public getSellerLoadById(id: string): SellerLoad | null {
    const loads = this.getSellerLoads();
    return loads.find((l) => l.id === id || l.code === id) || null;
  }

  public getActiveSellerLoads(): SellerLoad[] {
    return this.getSellerLoads().filter((l) => l.status === 'em_viagem');
  }

  public createSellerLoad(data: {
    vendor_name: string;
    driver_id?: string;
    driver_name?: string;
    vehicle?: string;
    departure_date: string;
    notes?: string;
    items: {
      product_id: string;
      product_name: string;
      unit: string;
      initial_qty: number;
      unit_price: number;
      cost_price: number;
    }[];
  }): SellerLoad {
    const loads = this.getSellerLoads();
    const nextSeq = loads.length + 1001;
    const code = `CRG-${nextSeq}`;
    const id = `crg-${Date.now()}`;

    const items: SellerLoadItem[] = data.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      unit: i.unit,
      unit_price: i.unit_price,
      cost_price: i.cost_price,
      initial_qty: i.initial_qty,
      sold_qty: 0,
    }));

    const activeCompany = this.getActiveCompany();

    const newLoad: SellerLoad = {
      id,
      code,
      company_id: activeCompany?.id,
      vendor_name: data.vendor_name.trim(),
      driver_id: data.driver_id,
      driver_name: data.driver_name?.trim(),
      vehicle: data.vehicle?.trim(),
      departure_date: data.departure_date || new Date().toISOString().split('T')[0],
      status: 'em_viagem',
      notes: data.notes?.trim(),
      items,
      sales: [],
      expected_financial: {
        total_sold: 0,
        dinheiro: 0,
        pix: 0,
        cartao: 0,
        fiado: 0,
      },
      created_at: new Date().toISOString(),
    };

    // Deduct initial quantities immediately from company's main stock
    items.forEach((item) => {
      this.registerExit({
        productId: item.product_id,
        usedQty: item.initial_qty,
        usedUnit: item.unit,
        origin: 'carga_vendedor',
        notes: `Abertura de Carga #${code} - Vendedor: ${newLoad.vendor_name}`,
      });
    });

    loads.unshift(newLoad);
    this.setItem(STORAGE_KEYS.SELLER_LOADS, loads);
    this.addAuditLog(
      'saida',
      `Nova Carga do Vendedor #${code} criada para ${newLoad.vendor_name} com ${items.length} produto(s).`
    );
    this.notify();
    return newLoad;
  }

  public recordSaleInSellerLoad(
    sellerLoadId: string,
    saleData: {
      sale_id: string;
      type: 'pdv' | 'fiado' | 'venda_rapida';
      date: string;
      customer_name?: string;
      total_amount: number;
      payment_method: PaymentMethod | string;
      items: {
        product_id: string;
        product_name: string;
        quantity: number;
        unit: string;
        unit_price: number;
        total_price: number;
      }[];
    }
  ): boolean {
    const loads = this.getSellerLoads();
    const idx = loads.findIndex((l) => l.id === sellerLoadId || l.code === sellerLoadId);
    if (idx === -1) return false;

    const load = loads[idx];
    if (load.status !== 'em_viagem') return false;

    // Update items sold_qty in the load
    saleData.items.forEach((sItem) => {
      const itemIdx = load.items.findIndex((i) => i.product_id === sItem.product_id);
      if (itemIdx !== -1) {
        load.items[itemIdx].sold_qty += sItem.quantity;
      }
    });

    // Add sale to sales list
    const salesList = load.sales || [];
    salesList.push(saleData);
    load.sales = salesList;

    // Recalculate expected financial totals
    const expected = load.expected_financial || {
      total_sold: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      fiado: 0,
    };

    expected.total_sold += saleData.total_amount;
    const pMethod = (saleData.payment_method || '').toLowerCase();
    if (pMethod.includes('dinheiro')) {
      expected.dinheiro += saleData.total_amount;
    } else if (pMethod.includes('pix')) {
      expected.pix += saleData.total_amount;
    } else if (pMethod.includes('cartao') || pMethod.includes('débito') || pMethod.includes('crédito')) {
      expected.cartao += saleData.total_amount;
    } else if (pMethod.includes('fiado')) {
      expected.fiado += saleData.total_amount;
    } else {
      expected.dinheiro += saleData.total_amount;
    }

    load.expected_financial = expected;
    load.updated_at = new Date().toISOString();

    loads[idx] = load;
    this.setItem(STORAGE_KEYS.SELLER_LOADS, loads);
    this.notify();
    return true;
  }

  public closeSellerLoad(
    id: string,
    conferenceData: {
      itemsCounted: Record<string, number>;
      actualFinancial: {
        dinheiro: number;
        pix: number;
        cartao: number;
        fiado: number;
      };
      notes?: string;
    }
  ): SellerLoad {
    const loads = this.getSellerLoads();
    const idx = loads.findIndex((l) => l.id === id || l.code === id);
    if (idx === -1) {
      throw new Error('Carga não encontrada.');
    }

    const load = loads[idx];
    if (load.status === 'fechada') {
      throw new Error('Esta carga já se encontra fechada.');
    }

    // Process each item: expected return, counted, diff, and return to main stock
    const updatedItems: SellerLoadItem[] = load.items.map((item) => {
      const expectedReturn = Math.max(0, item.initial_qty - item.sold_qty);
      const counted = conferenceData.itemsCounted[item.product_id] !== undefined
        ? conferenceData.itemsCounted[item.product_id]
        : expectedReturn;
      const diff = counted - expectedReturn;

      // 1. Returned products (counted_qty) go back into company's main stock
      if (counted > 0) {
        this.registerEntry({
          productId: item.product_id,
          usedQty: counted,
          usedUnit: item.unit,
          origin: 'carga_vendedor',
          notes: `Devolução de Carga #${load.code} - Vendedor: ${load.vendor_name}`,
        });
      }

      // 2. If there's a difference (sobra/falta), log stock adjustment
      if (diff !== 0) {
        this.registerManualStockAdjustment(
          item.product_id,
          diff,
          item.unit,
          `Diferença na Conferência da Carga #${load.code} (${diff > 0 ? 'Sobra' : 'Falta'} de ${Math.abs(diff)} ${item.unit})`
        );
      }

      return {
        ...item,
        expected_return_qty: expectedReturn,
        counted_qty: counted,
        diff_qty: diff,
      };
    });

    const expectedFin = load.expected_financial || {
      total_sold: 0,
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      fiado: 0,
    };

    const actualFin = conferenceData.actualFinancial;
    const expectedTotalNonFiado = expectedFin.dinheiro + expectedFin.pix + expectedFin.cartao;
    const actualTotalNonFiado = actualFin.dinheiro + actualFin.pix + actualFin.cartao;
    const finDiff = actualTotalNonFiado - expectedTotalNonFiado;

    load.items = updatedItems;
    load.actual_financial = actualFin;
    load.financial_diff = finDiff;
    load.status = 'fechada';
    load.closed_at = new Date().toISOString();
    if (conferenceData.notes) {
      load.notes = load.notes ? `${load.notes} | ${conferenceData.notes}` : conferenceData.notes;
    }

    loads[idx] = load;
    this.setItem(STORAGE_KEYS.SELLER_LOADS, loads);
    this.addAuditLog(
      'inventario',
      `Fechamento da Carga #${load.code} (${load.vendor_name}) realizado. Dif. Financeira: R$ ${finDiff.toFixed(2)}`
    );
    this.notify();
    return load;
  }

  public reopenSellerLoad(id: string): boolean {
    const user = this.getCurrentUser();
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Apenas Administradores podem reabrir cargas fechadas.');
    }

    const loads = this.getSellerLoads();
    const idx = loads.findIndex((l) => l.id === id || l.code === id);
    if (idx === -1) throw new Error('Carga não encontrada.');

    const load = loads[idx];
    if (load.status !== 'fechada') throw new Error('Esta carga não está fechada.');

    // Rollback returned products from main stock
    load.items.forEach((item) => {
      if (item.counted_qty && item.counted_qty > 0) {
        this.registerExit({
          productId: item.product_id,
          usedQty: item.counted_qty,
          usedUnit: item.unit,
          origin: 'carga_vendedor',
          notes: `Reabertura da Carga #${load.code} (Estoque devolvido temporariamente estornado)`,
        });
      }
    });

    load.status = 'em_viagem';
    load.closed_at = undefined;
    loads[idx] = load;
    this.setItem(STORAGE_KEYS.SELLER_LOADS, loads);
    this.addAuditLog('inventario', `Carga #${load.code} (${load.vendor_name}) REABERTA por ${user?.name || 'Admin'}`);
    this.notify();
    return true;
  }

  public deleteSellerLoad(id: string, forceDelete: boolean = true): boolean {
    const user = this.getCurrentUser();
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Apenas Administradores têm permissão para excluir rotas.');
    }

    const loads = this.getSellerLoads();
    const load = loads.find((l) => l.id === id || l.code === id);
    if (!load) {
      throw new Error('Rota não encontrada.');
    }

    // Return remaining unsold initial quantities back to main company stock if load was 'em_viagem'
    if (load.status === 'em_viagem') {
      load.items.forEach((item) => {
        const remainingToReturn = Math.max(0, item.initial_qty - (item.sold_qty || 0));
        if (remainingToReturn > 0) {
          this.registerEntry({
            productId: item.product_id,
            usedQty: remainingToReturn,
            usedUnit: item.unit,
            origin: 'carga_vendedor',
            notes: `Devolução por Exclusão da Rota #${load.code} - Vendedor: ${load.vendor_name}`,
          });
        }
      });
    }

    // Remove load record
    const filtered = loads.filter((l) => l.id !== load.id && l.code !== load.code);
    this.setItem(STORAGE_KEYS.SELLER_LOADS, filtered);
    this.addAuditLog('inventario', `Rota #${load.code} (${load.vendor_name}) excluída por ${user?.name || 'Admin'}`);
    this.notify();
    return true;
  }

  // --- DRIVERS / MOTORISTAS ---
  public getDrivers(): Driver[] {
    const defaultDrivers: Driver[] = [
      { id: 'drv-1', name: 'João Silva', phone: '(11) 98888-1111', license_number: '12345678900', vehicle: 'Fiorino Refrigerada (ABC-1234)', status: 'active' },
      { id: 'drv-2', name: 'Carlos Eduardo', phone: '(11) 97777-2222', license_number: '98765432100', vehicle: 'Caminhão Baú (XYZ-9876)', status: 'active' },
    ];
    return this.getItem<Driver[]>(STORAGE_KEYS.DRIVERS, defaultDrivers);
  }

  public saveDriver(driverData: Partial<Driver>): Driver {
    const drivers = this.getDrivers();
    if (driverData.id) {
      const idx = drivers.findIndex((d) => d.id === driverData.id);
      if (idx !== -1) {
        drivers[idx] = { ...drivers[idx], ...driverData };
        this.setItem(STORAGE_KEYS.DRIVERS, drivers);
        this.notify();
        return drivers[idx];
      }
    }

    const newDriver: Driver = {
      id: 'drv-' + Date.now(),
      name: driverData.name || 'Motorista sem nome',
      phone: driverData.phone,
      cpf: driverData.cpf,
      license_number: driverData.license_number,
      vehicle: driverData.vehicle,
      license_plate: driverData.license_plate,
      notes: driverData.notes,
      status: driverData.status || 'active',
      created_at: new Date().toISOString(),
    };

    drivers.push(newDriver);
    this.setItem(STORAGE_KEYS.DRIVERS, drivers);
    this.addAuditLog('configuracao', `Motorista ${newDriver.name} cadastrado`);
    this.notify();
    return newDriver;
  }

  public deleteDriver(id: string): boolean {
    const drivers = this.getDrivers();
    const drv = drivers.find((d) => d.id === id);
    if (!drv) return false;

    // Check if driver has linked seller loads/routes
    const loads = this.getSellerLoads();
    const linkedLoads = loads.filter(
      (l) => l.driver_id === id || (drv.name && l.driver_name && l.driver_name.toLowerCase() === drv.name.toLowerCase())
    );

    if (linkedLoads.length > 0) {
      throw new Error(
        `O motorista "${drv.name}" possui ${linkedLoads.length} rota(s) vinculada(s) e não pode ser excluído. Altere o status para Inativo em vez de excluir.`
      );
    }

    const filtered = drivers.filter((d) => d.id !== id);
    this.setItem(STORAGE_KEYS.DRIVERS, filtered);
    this.addAuditLog('configuracao', `Motorista ${drv.name} excluído`);
    this.notify();
    return true;
  }
}

export const storage = new StorageService();

