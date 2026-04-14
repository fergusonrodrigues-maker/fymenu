-- ─── payments table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id     UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  asaas_payment_id  TEXT        UNIQUE,
  asaas_customer_id TEXT,
  plan              TEXT        NOT NULL,
  cycle             TEXT        NOT NULL,
  amount            INTEGER     NOT NULL,
  payment_method    TEXT        NOT NULL,
  status            TEXT        DEFAULT 'PENDING',
  pix_qr_code       TEXT,
  pix_payload       TEXT,
  pix_expiration    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'users_can_read_own_payments'
  ) THEN
    CREATE POLICY users_can_read_own_payments ON payments
      FOR SELECT USING (
        restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

-- ─── asaas_customer_id on restaurants ────────────────────────────────────────
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
