-- Migration aplicada manualmente em 12/05/2026 via MCP
-- Documenta o schema atual pra ambientes novos (clone fresh)

-- 1. partner_coupons: partner_id nullable + valid_for_plan + created_by_admin
ALTER TABLE partner_coupons ALTER COLUMN partner_id DROP NOT NULL;
ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS valid_for_plan text
  CHECK (valid_for_plan IN ('menu','menupro','business') OR valid_for_plan IS NULL);
ALTER TABLE partner_coupons ADD COLUMN IF NOT EXISTS created_by_admin boolean
  NOT NULL DEFAULT false;

-- 2. coupon_redemptions (auditoria de uso)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES partner_coupons(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid REFERENCES auth.users(id),
  UNIQUE(coupon_id, restaurant_id)
);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY coupon_redemptions_select_own ON coupon_redemptions
    FOR SELECT TO authenticated
    USING (restaurant_id IN (SELECT restaurant_id FROM restaurant_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. restaurants: cortesia permanente
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_complimentary boolean
  NOT NULL DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS complimentary_reason text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS complimentary_granted_at timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS complimentary_granted_by uuid
  REFERENCES auth.users(id);
