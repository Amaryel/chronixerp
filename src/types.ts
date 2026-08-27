/**
 * Aquinos Frios - Type Definitions
 */

export type UserRole = 'superadmin' | 'admin' | 'funcionario';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'customers'
  | 'drivers'
  | 'entries'
  | 'exits'
  | 'venda_rapida'
  | 'fiados'
  | 'bulk_stock'
  | 'carga_vendedor'
  | 'reports'
  | 'history'
  | 'settings'
  | 'bulk_prices'
  | 'help_center';

export interface Company {
  id: string;
  name: string;
  document: string; // CNPJ ou CPF
  phone?: string;
  address?: string;
  email?: string;
  owner_name?: string;
  plan?: string;
  notes?: string;
  logo_url?: string; // Custom company logo (base64 or image URL)
  theme_color?: string; // Hex color code for company branding (e.g. #0284c7)
  pwa_title?: string; // Custom title for PWA
  status: 'active' | 'blocked' | 'pending' | 'canceled';
  supabase_url?: string;
  supabase_key?: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  company_id?: string;
  is_approved?: boolean;
  password?: string;
  is_blocked?: boolean;
  avatar?: string;
  allowed_modules?: NavTab[]; // Granular module-level access permissions
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
}

export type StandardUnit = 'UN' | 'KG' | 'CX' | string;

export interface UnitConversion {
  id: string;
  product_id: string;
  from_unit: string; // e.g. 'CX'
  to_unit: string;   // e.g. 'KG', 'UN'
  factor: number;    // e.g. 20 (meaning 1 CX = 20 KG)
  created_at?: string;
}

export interface ConversionPreset {
  id: string;
  name: string;      // e.g. "Caixa 20kg", "Caixa 24un"
  from_unit: string; // e.g. "CX"
  to_unit: string;   // e.g. "KG", "UN"
  factor: number;    // e.g. 20
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  main_unit: 'UN' | 'KG' | 'CX' | string; // Restricted to UN, KG, CX
  min_stock: number; // In main_unit
  current_stock: number; // In main_unit
  unit_price?: number; // Preço de venda padrão
  cost_price?: number; // Preço de custo
  sale_price?: number; // Preço de venda
  markup?: number; // Markup em %
  box_conversion_unit?: 'KG' | 'UN' | string; // 1 Caixa equivale a X KG ou UN
  box_conversion_value?: number; // Valor do fator (ex: 20 ou 24)
  allow_fractional?: boolean; // Permitir venda fracionada (0,5 CX / 10 KG)
  price_per_kg?: number;
  price_per_box?: number;
  barcode?: string;
  category_id?: string;
  brand?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  conversions?: UnitConversion[];
}

export interface Customer {
  id: string;
  name: string;
  document?: string; // CPF ou CNPJ
  cpf_cnpj?: string; // CPF ou CNPJ alias
  phone?: string;
  credit_limit?: number;
  total_debt?: number;
  notes?: string;
  created_at: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'fiado';

export interface FiadoSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  discount_type?: 'percent' | 'value';
  discount_value?: number;
  surcharge_type?: 'percent' | 'value';
  surcharge_value?: number;
}

export interface FiadoInstallment {
  id: string;
  sale_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: 'aberta' | 'paga';
  paid_at?: string;
  notes?: string;
}

export interface FiadoSale {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string; // ISO string
  items: FiadoSaleItem[];
  subtotal_amount?: number;
  discount_amount?: number;
  surcharge_amount?: number;
  interest_rate?: number;
  interest_amount?: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payments?: PaymentDetail[];
  status: 'aberto' | 'pago' | 'cancelado';
  paid_at?: string;
  notes?: string;
  installments_count?: number;
  first_due_date?: string;
  installments?: FiadoInstallment[];
  created_at: string;
}

export interface FiadoPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  received_amount: number;
  previous_balance: number;
  remaining_balance: number;
  payment_method: string; // Dinheiro, PIX, Cartão de Débito, Cartão de Crédito, Transferência, Outro
  operator_id: string;
  operator_name: string;
  date: string; // ISO string
  notes?: string;
}

export interface Batch {
  id: string;
  product_id: string;
  product_name?: string;
  batch_number: string;
  expiration_date: string; // YYYY-MM-DD
  initial_qty: number; // in main_unit
  current_qty: number; // in main_unit
  created_at: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste';
export type MovementOrigin = 'manual' | 'xml' | 'inventario' | 'venda_rapida' | 'pre_venda' | 'fiado' | 'pdv' | 'carga_vendedor';

export interface PaymentDetail {
  method: 'dinheiro' | 'pix' | 'cartao' | 'fiado' | string;
  amount: number;
}

export interface Movement {
  id: string;
  date: string; // ISO string
  user_id: string;
  user_name: string;
  user_role: UserRole;
  product_id: string;
  product_name: string;
  type: MovementType;
  used_qty: number;
  used_unit: string;
  converted_qty: number; // in main_unit
  main_unit: string;
  prev_stock: number; // in main_unit
  current_stock: number; // in main_unit
  supplier_id?: string;
  supplier_name?: string;
  unit_price?: number;
  total_price?: number;
  batch_number?: string;
  expiration_date?: string;
  origin: MovementOrigin;
  payment_method?: string;
  payments?: PaymentDetail[];
  notes?: string;
  xml_import_id?: string;
  nfe_number?: string;
  created_at: string;
}

export interface XmlImportItem {
  cProd: string;
  xProd: string;
  cEAN?: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  nLote?: string;
  dVal?: string;
  matched_product_id?: string;
  suggested_product_id?: string;
  selected_unit_conversion?: number; // Factor to convert XML unit to product main_unit
}

export interface XmlImport {
  id: string;
  xml_filename: string;
  import_date: string;
  user_id: string;
  user_name: string;
  nfe_number?: string;
  supplier_cnpj?: string;
  supplier_name?: string;
  total_value?: number;
  items_count: number;
  items?: XmlImportItem[];
  created_at: string;
}

export interface XmlLink {
  id: string;
  xml_cprod: string;
  xml_xprod: string;
  xml_cean?: string;
  product_id: string;
  xml_unit: string;
  conversion_factor: number;
  created_at: string;
}

export interface InventoryItem {
  product_id: string;
  product_name: string;
  main_unit: string;
  system_qty: number; // main unit
  counted_qty?: number;
  counted_unit?: string;
  converted_counted_qty?: number; // main unit
  diff_qty?: number; // converted_counted_qty - system_qty
  notes?: string;
}

export interface Inventory {
  id: string;
  date: string;
  user_id: string;
  user_name: string;
  status: 'em_andamento' | 'concluido';
  notes?: string;
  items: InventoryItem[];
  created_at: string;
}

export type PreSaleStatus = 'pendente' | 'finalizada' | 'cancelada';

export interface PreSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface PreSale {
  id: string;
  code: string; // e.g., "PV-1001"
  customer_id?: string;
  customer_name?: string;
  date: string; // ISO string
  valid_until?: string; // YYYY-MM-DD
  items: PreSaleItem[];
  total_amount: number;
  notes?: string;
  status: PreSaleStatus;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  date: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: 
    | 'login' 
    | 'cadastro_produto' 
    | 'edicao_produto' 
    | 'exclusao_produto' 
    | 'entrada' 
    | 'saida' 
    | 'importacao_xml' 
    | 'exclusao_xml' 
    | 'inventario' 
    | 'troca_perfil' 
    | 'ajuste_manual'
    | 'exclusao_movimentacao'
    | 'alteracao_lote'
    | 'exclusao_lote'
    | 'pre_venda'
    | 'cancelamento_pre_venda'
    | 'alteracao_preco'
    | 'configuracao';
  details: string;
  target_id?: string;
  created_at: string;
}

export interface SystemSettings {
  allow_negative_stock: boolean;  // default: false ("Não permitir")
  auto_clear_form: boolean;       // default: true ("Limpar tela automaticamente")
  fiado_interest_rate: number;    // default: 5 (5%)
  default_allow_fractional?: boolean; // default: false ("Não permitir venda fracionada como regra global")
}

export interface DailyConferenceStockItem {
  product_id: string;
  product_name: string;
  unit: string;
  initial_stock: number;
  entries_today: number;
  exits_today: number;
  expected_stock: number; // initial_stock + entries_today - exits_today
  physical_stock: number;  // input by manager
  diff_stock: number;      // physical_stock - expected_stock
  cost_price: number;
  estimated_diff_value: number; // diff_stock * cost_price
}

export interface DailyConferenceFinancial {
  total_sold: number;
  expected_dinheiro: number;
  expected_pix: number;
  expected_cartao: number;
  expected_fiado: number;
  
  actual_dinheiro: number;
  actual_pix: number;
  actual_cartao: number;
  
  diff_dinheiro: number;
  diff_pix: number;
  diff_cartao: number;
  total_financial_diff: number;
}

export interface DailyConference {
  id: string;
  date: string; // YYYY-MM-DD
  closed_at?: string;
  operator_id: string;
  operator_name: string;
  status: 'em_aberto' | 'fechada';
  
  // Daily Summary metrics
  total_entries_count: number;
  total_exits_count: number;
  total_sold_amount: number;
  total_received_amount: number;
  sales_count: number;
  clients_served_count: number;
  products_sold_count: number;
  
  // Stock Conference items
  stock_items: DailyConferenceStockItem[];
  total_stock_loss_value: number;
  total_stock_gain_value: number;
  
  // Financial Conference
  financial: DailyConferenceFinancial;
  
  notes?: string;
  
  // Prepared fields for future expansion:
  vendor_id?: string;
  vendor_name?: string;
  vehicle_info?: string;
  
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  company_id: string;
  company_name: string;
  subject: string;
  description: string;
  attachment_url?: string;
  screen: string;
  technical_info: {
    screen: string;
    date: string;
    browser: string;
    os: string;
    device: string;
    app_version: string;
  };
  status: 'Aberto' | 'Em Atendimento' | 'Resolvido' | 'Fechado';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeTutorial {
  id: string;
  category: string;
  title: string;
  description: string;
  content_markdown: string;
  reading_time: string;
  video_url?: string;
  is_featured?: boolean;
  is_published: boolean;
  views_count: number;
  created_at: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  date: string;
  title: string;
  features: string[];
  improvements: string[];
  fixes: string[];
}

export type SellerLoadStatus = 'em_viagem' | 'fechada' | 'cancelada';

export interface SellerLoadItem {
  product_id: string;
  product_name: string;
  unit: string;
  unit_price: number;
  cost_price: number;
  initial_qty: number;         // Quantidade enviada
  sold_qty: number;            // Quantidade vendida
  counted_qty?: number;        // Quantidade contada na devolução
  expected_return_qty?: number; // initial_qty - sold_qty
  diff_qty?: number;           // counted_qty - expected_return_qty
}

export interface SellerLoadSale {
  sale_id: string;
  type: 'pdv' | 'fiado' | 'venda_rapida';
  date: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number;
  payment_method: PaymentMethod | string;
  payments?: PaymentDetail[];
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }[];
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  cpf?: string;
  license_number?: string; // CNH
  vehicle?: string;        // Veículo principal
  license_plate?: string;  // Placa do veículo
  notes?: string;          // Observações
  status?: 'active' | 'inactive';
  created_at?: string;
}

export interface SellerLoad {
  id: string;
  code: string; // ex: "CRG-1001"
  company_id?: string;
  vendor_id?: string;
  vendor_name: string;
  driver_id?: string;
  driver_name?: string;
  vehicle?: string;
  departure_date: string;
  closed_at?: string;
  status: SellerLoadStatus;
  notes?: string;

  items: SellerLoadItem[];
  sales?: SellerLoadSale[];

  // Conferência Financeira
  expected_financial?: {
    total_sold: number;
    dinheiro: number;
    pix: number;
    cartao: number;
    fiado: number;
  };
  actual_financial?: {
    dinheiro: number;
    pix: number;
    cartao: number;
    fiado: number;
  };
  financial_diff?: number;

  created_at: string;
  updated_at?: string;
}

export interface SystemModuleInfo {
  id: NavTab;
  label: string;
  shortLabel: string;
  category: 'Geral' | 'Vendas & Operações' | 'Cadastros' | 'Estoque' | 'Financeiro' | 'Gestão & Configurações';
  icon: string;
  description: string;
}

export const SYSTEM_MODULES: SystemModuleInfo[] = [
  // Geral
  {
    id: 'dashboard',
    label: 'Início / Dashboard Geral',
    shortLabel: 'Início',
    category: 'Geral',
    icon: 'LayoutDashboard',
    description: 'Painel com visão geral, resumo do dia, atalhos rápidos e alertas.',
  },
  // Vendas & Operações
  {
    id: 'carga_vendedor',
    label: 'Rota de Vendas (Carga do Vendedor)',
    shortLabel: 'Rota de Vendas',
    category: 'Vendas & Operações',
    icon: 'Truck',
    description: 'Montagem de carga de caminhão/van, vendas em rota e prestação de contas.',
  },
  {
    id: 'venda_rapida',
    label: 'Frente de Caixa (PDV)',
    shortLabel: 'PDV',
    category: 'Vendas & Operações',
    icon: 'ShoppingCart',
    description: 'Ponto de venda rápido, vendas balcão e emissão de comprovantes.',
  },
  {
    id: 'exits',
    label: 'Pré-Venda / Saída de Pedidos',
    shortLabel: 'Pré-Venda',
    category: 'Vendas & Operações',
    icon: 'ArrowUpRight',
    description: 'Criação e consulta de pedidos de pré-venda e saídas.',
  },
  // Financeiro
  {
    id: 'fiados',
    label: 'Contas a Receber (Fiados & Crediário)',
    shortLabel: 'Contas a Receber',
    category: 'Financeiro',
    icon: 'BookOpenCheck',
    description: 'Gestão de vendas a prazo, parcelamentos, cobranças e baixas.',
  },
  // Cadastros
  {
    id: 'customers',
    label: 'Clientes & Parceiros',
    shortLabel: 'Clientes',
    category: 'Cadastros',
    icon: 'Users',
    description: 'Cadastro, busca, limites de crédito e contatos de clientes.',
  },
  {
    id: 'drivers',
    label: 'Motoristas & Entregadores',
    shortLabel: 'Motoristas',
    category: 'Cadastros',
    icon: 'Truck',
    description: 'Cadastro de condutores, veículos e placas de entrega.',
  },
  {
    id: 'products',
    label: 'Produtos & Catálogo',
    shortLabel: 'Produtos',
    category: 'Cadastros',
    icon: 'Package',
    description: 'Catálogo de itens, unidades de medida, preços e custos.',
  },
  {
    id: 'bulk_prices',
    label: 'Alteração de Preços em Massa',
    shortLabel: 'Tabela de Preços',
    category: 'Cadastros',
    icon: 'Percent',
    description: 'Reajuste ágil em lote de preços de venda e margens de lucro.',
  },
  // Estoque
  {
    id: 'entries',
    label: 'Entradas de Estoque / XML NF-e',
    shortLabel: 'Entradas de Estoque',
    category: 'Estoque',
    icon: 'ArrowDownLeft',
    description: 'Lançamento de compras manuais e importação automática de XML de NF-e.',
  },
  {
    id: 'bulk_stock',
    label: 'Ajuste de Estoque em Lote (Balanço)',
    shortLabel: 'Ajuste de Estoque',
    category: 'Estoque',
    icon: 'Boxes',
    description: 'Contagem física, inventário e acerto de divergências de estoque.',
  },
  // Gestão & Configurações
  {
    id: 'reports',
    label: 'Relatórios Gerenciais',
    shortLabel: 'Relatórios',
    category: 'Gestão & Configurações',
    icon: 'FileSpreadsheet',
    description: 'Relatórios de lucratividade, histórico financeiro e curva ABC.',
  },
  {
    id: 'history',
    label: 'Histórico & Auditoria',
    shortLabel: 'Auditoria',
    category: 'Gestão & Configurações',
    icon: 'Clock',
    description: 'Registro cronológico de todas as operações e acessos no sistema.',
  },
  {
    id: 'settings',
    label: 'Configurações do Sistema',
    shortLabel: 'Configurações',
    category: 'Gestão & Configurações',
    icon: 'Settings',
    description: 'Parâmetros operacionais, estoque negativo e regras do ERP.',
  },
  {
    id: 'help_center',
    label: 'Centro de Ajuda & Tutoriais',
    shortLabel: 'Ajuda',
    category: 'Gestão & Configurações',
    icon: 'HelpCircle',
    description: 'Manuais passo a passo e documentação de uso do sistema.',
  },
];

export const ALL_NAV_TAB_IDS: NavTab[] = SYSTEM_MODULES.map((m) => m.id);

/**
 * Returns the list of NavTabs accessible by a user.
 * - Superadmins always have access to ALL modules.
 * - If user has `allowed_modules` specified and non-empty, returns only those modules.
 * - If not specified, default to ALL modules.
 */
export function getUserAllowedModules(user: User | null): NavTab[] {
  if (!user) return ALL_NAV_TAB_IDS;
  if (user.role === 'superadmin' || user.email?.toLowerCase() === 'amaryelcc@gmail.com') {
    return ALL_NAV_TAB_IDS;
  }
  if (Array.isArray(user.allowed_modules) && user.allowed_modules.length > 0) {
    return user.allowed_modules;
  }
  // Default for users without explicit restrictions: full access
  return ALL_NAV_TAB_IDS;
}

/**
 * Checks whether a user has permission to view a specific module.
 */
export function isUserAuthorizedForModule(user: User | null, tab: NavTab): boolean {
  if (!user) return true;
  if (user.role === 'superadmin' || user.email?.toLowerCase() === 'amaryelcc@gmail.com') {
    return true;
  }
  const allowed = getUserAllowedModules(user);
  return allowed.includes(tab);
}

/**
 * Determines the primary default landing tab for a logged-in user.
 * E.g. if the user only has 'carga_vendedor', opens directly in 'carga_vendedor'.
 */
export function getDefaultTabForUser(user: User | null): NavTab {
  if (!user) return 'dashboard';
  const allowed = getUserAllowedModules(user);
  if (allowed.includes('dashboard')) {
    return 'dashboard';
  }
  if (allowed.length > 0) {
    return allowed[0];
  }
  return 'dashboard';
}



