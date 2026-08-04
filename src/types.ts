/**
 * Aquinos Frios - Type Definitions
 */

export type UserRole = 'superadmin' | 'admin' | 'funcionario';

export interface Company {
  id: string;
  name: string;
  document: string; // CNPJ ou CPF
  phone?: string;
  address?: string;
  email?: string;
  status: 'active' | 'blocked' | 'pending';
  supabase_url?: string;
  supabase_key?: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company_id?: string;
  is_approved?: boolean;
  password?: string;
  is_blocked?: boolean;
  avatar?: string;
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
  status: 'aberto' | 'pago';
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
export type MovementOrigin = 'manual' | 'xml' | 'inventario';

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
  allow_negative_stock: boolean; // default: false ("Não permitir")
  auto_clear_form: boolean;      // default: true ("Limpar tela automaticamente")
  fiado_interest_rate: number;   // default: 5 (5%)
}

