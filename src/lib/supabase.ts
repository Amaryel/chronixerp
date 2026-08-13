/**
 * Aquinos Frios - Supabase Integration Client & Database Schema Helper
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'aquinos_supabase_url';
const SUPABASE_KEY_KEY = 'aquinos_supabase_key';

const DEFAULT_SUPABASE_URL = 'https://wonoxbmdcryyepynxahb.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_kl1PIDSf2yx7Zs9sXAL8TQ_kBm00tIX';

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  // Strip trailing /rest/v1 or /rest/v1/
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function getStoredSupabaseConfig() {
  const metaEnv = (import.meta as any).env || {};
  let url = localStorage.getItem(SUPABASE_URL_KEY) || metaEnv.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let key = localStorage.getItem(SUPABASE_KEY_KEY) || metaEnv.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  url = sanitizeSupabaseUrl(url);

  return { url, key };
}

export function saveSupabaseConfig(url: string, key: string) {
  const cleanUrl = sanitizeSupabaseUrl(url);
  localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
  localStorage.setItem(SUPABASE_KEY_KEY, key);
  supabaseInstance = null; // Reset singleton instance when config changes
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  if (!url || !key) return null;

  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    if (!cleanUrl || !key) return false;
    const client = createClient(cleanUrl, key);
    // Test simple select on any table or health check
    const { error } = await client.from('categorias').select('count', { count: 'exact', head: true });
    // If error code is '42P01' (undefined table), it means Supabase connected successfully but tables are not created yet!
    if (error && (error.code === '42P01' || error.message?.includes('relation "public.categorias" does not exist'))) {
      return true; // Connection OK, tables need creation
    }
    return !error;
  } catch (err) {
    console.error('Supabase connection test failed:', err);
    return false;
  }
}

/**
 * Complete SQL Migration script for Supabase Database
 * Users can execute this in their Supabase SQL Editor
 */
export const SUPABASE_HEARTBEAT_SQL = `-- AQUINOS FRIOS - MANTER SUPABASE ATIVO (HEARTBEAT SERVER-SIDE)
-- Este script configura uma função agendada que executa automaticamente no PostgreSQL do Supabase,
-- garantindo que o banco permaneça ativo sem depender de navegação, PWA ou computadores ligados.

-- 1. Habilita a extensão pg_cron (se disponível no seu projeto Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Tabela técnica de monitoramento (isolada e invisível para telas comerciais)
CREATE TABLE IF NOT EXISTS system_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_execution TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active'
);

-- Habilita RLS para proteção de dados
ALTER TABLE system_heartbeat ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_heartbeat' AND policyname = 'heartbeat_select_policy'
  ) THEN
    CREATE POLICY heartbeat_select_policy ON system_heartbeat FOR SELECT USING (true);
  END IF;
END $$;

-- 3. Função do servidor que confirma atividade leve sem alterar dados operacionais
CREATE OR REPLACE FUNCTION keep_supabase_alive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza o registro de verificação no sistema (sem alterar estoque, vendas ou usuários)
  INSERT INTO system_heartbeat (id, last_execution, status)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, NOW(), 'active')
  ON CONFLICT (id) DO UPDATE
  SET last_execution = NOW(), status = 'active';
END;
$$;

-- 4. Agendamento automático via pg_cron (Rodando 1x por dia às 03:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento antigo se existir
    PERFORM cron.unschedule('keep-supabase-alive-job')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keep-supabase-alive-job');

    -- Agenda execução diária leve
    PERFORM cron.schedule(
      'keep-supabase-alive-job',
      '0 3 * * *',
      'SELECT keep_supabase_alive();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 5. Executa imediatamente a primeira vez para inicializar o registro
SELECT keep_supabase_alive();
`;

export const SUPABASE_SQL_SCHEMA = `-- AQUINOS FRIOS - DATABASE SCHEMA FOR SUPABASE

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'funcionario', -- 'superadmin' | 'admin' | 'funcionario'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  main_unit TEXT NOT NULL DEFAULT 'kg',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  barcode TEXT,
  category_id TEXT REFERENCES categorias(id) ON DELETE SET NULL,
  brand TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Conversões de Unidade
CREATE TABLE IF NOT EXISTS conversoes_unidade (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  factor NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lotes (Controle de Validade FIFO/PEPS)
CREATE TABLE IF NOT EXISTS lotes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  initial_qty NUMERIC NOT NULL,
  current_qty NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Movimentações
CREATE TABLE IF NOT EXISTS movimentacoes (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES produtos(id),
  product_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste'
  used_qty NUMERIC NOT NULL,
  used_unit TEXT NOT NULL,
  converted_qty NUMERIC NOT NULL,
  main_unit TEXT NOT NULL,
  prev_stock NUMERIC NOT NULL,
  current_stock NUMERIC NOT NULL,
  supplier_id TEXT REFERENCES fornecedores(id),
  supplier_name TEXT,
  unit_price NUMERIC,
  total_price NUMERIC,
  batch_number TEXT,
  expiration_date DATE,
  origin TEXT NOT NULL, -- 'manual', 'xml', 'inventario'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Importações XML
CREATE TABLE IF NOT EXISTS importacoes_xml (
  id TEXT PRIMARY KEY,
  xml_filename TEXT NOT NULL,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  nfe_number TEXT,
  supplier_cnpj TEXT,
  supplier_name TEXT,
  total_value NUMERIC,
  items_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Vínculos XML
CREATE TABLE IF NOT EXISTS vinculos_xml (
  id TEXT PRIMARY KEY,
  xml_cprod TEXT NOT NULL,
  xml_xprod TEXT NOT NULL,
  xml_cean TEXT,
  product_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  xml_unit TEXT NOT NULL,
  conversion_factor NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Inventários
CREATE TABLE IF NOT EXISTS inventarios (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  status TEXT DEFAULT 'concluido',
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Categories Seed
INSERT INTO categorias (id, name, description, icon) VALUES
('cat-queijos', 'Queijos', 'Queijos fatiados, peças e especiais', 'cheese'),
('cat-presuntos', 'Presuntos & Embutidos', 'Presuntos, mortadelas e fiambres', 'meat'),
('cat-frango', 'Frango & Aves', 'Cortes de frango e empanados', 'drumstick'),
('cat-linguicas', 'Linguiças & Salsichas', 'Linguiças calabresas, toscana e salsichas', 'sausage'),
('cat-laticinios', 'Laticínios', 'Requeijão, manteiga e creme de leite', 'milk'),
('cat-bebidas', 'Bebidas', 'Refrigerantes, sucos e energéticos', 'wine'),
('cat-congelados', 'Congelados', 'Hamburgueres, batatas e pratos prontos', 'snowflake'),
('cat-outros', 'Outros', 'Insumos e embalagens', 'box')
ON CONFLICT (name) DO NOTHING;

` + SUPABASE_HEARTBEAT_SQL;

export async function fetchSupabaseHeartbeatStatus(): Promise<{ last_execution: string; status: string } | null> {
  try {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from('system_heartbeat')
      .select('last_execution, status')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

