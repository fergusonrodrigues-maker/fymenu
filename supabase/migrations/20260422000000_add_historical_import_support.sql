-- Migration: add_historical_import_support
-- Feature: retroactive historical data import (Business plan, up to 3 years back)
-- Idempotent: all operations use IF NOT EXISTS / DO $$ guards

-- ─── 1. TABELA import_batches ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_batches (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id           uuid        NOT NULL REFERENCES units(id),
  restaurant_id     uuid        NOT NULL REFERENCES restaurants(id),
  target_table      text        NOT NULL CHECK (target_table IN (
                                  'order_intents','business_expenses','payments',
                                  'inventory_movements','crm_customers')),
  source_method     text        NOT NULL CHECK (source_method IN (
                                  'csv','ai_pdf','ai_image','manual')),
  source_filename   text,
  records_count     int         DEFAULT 0,
  date_range_start  date,
  date_range_end    date,
  status            text        DEFAULT 'completed' CHECK (status IN (
                                  'processing','completed','reverted','failed')),
  notes             text,
  created_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  reverted_at       timestamptz
);

-- ─── 2. order_intents ─────────────────────────────────────────────────────────

ALTER TABLE order_intents
  ADD COLUMN IF NOT EXISTS occurred_at      timestamptz,
  ADD COLUMN IF NOT EXISTS source_method    text DEFAULT 'native'
                                              CHECK (source_method IN ('native','import')),
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- ─── 3. business_expenses ─────────────────────────────────────────────────────

ALTER TABLE business_expenses
  ADD COLUMN IF NOT EXISTS source_method    text DEFAULT 'native'
                                              CHECK (source_method IN ('native','import')),
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- ─── 4. payments ──────────────────────────────────────────────────────────────

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS occurred_at      timestamptz,
  ADD COLUMN IF NOT EXISTS source_method    text DEFAULT 'native'
                                              CHECK (source_method IN ('native','import')),
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- ─── 5. inventory_movements ───────────────────────────────────────────────────

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS occurred_at      timestamptz,
  ADD COLUMN IF NOT EXISTS source_method    text DEFAULT 'native'
                                              CHECK (source_method IN ('native','import')),
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- ─── 6. crm_customers ─────────────────────────────────────────────────────────

ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS first_order_at   timestamptz,
  ADD COLUMN IF NOT EXISTS source_method    text DEFAULT 'native'
                                              CHECK (source_method IN ('native','import')),
  ADD COLUMN IF NOT EXISTS import_batch_id  uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags             text[] DEFAULT '{}';

-- ─── 7. ÍNDICES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_import_batches_unit
  ON import_batches(unit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_intents_batch
  ON order_intents(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_expenses_batch
  ON business_expenses(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_batch
  ON payments(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch
  ON inventory_movements(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customers_batch
  ON crm_customers(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_intents_occurred
  ON order_intents(occurred_at) WHERE occurred_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_occurred
  ON payments(occurred_at) WHERE occurred_at IS NOT NULL;

-- ─── 9. RLS — import_batches ──────────────────────────────────────────────────
-- Demais tabelas já têm RLS; apenas import_batches precisa de policy.

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'import_batches' AND policyname = 'import_batches_authenticated'
  ) THEN
    CREATE POLICY import_batches_authenticated ON import_batches
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
