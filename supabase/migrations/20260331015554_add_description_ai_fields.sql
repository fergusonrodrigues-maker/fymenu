-- Add AI description fields to menu items table
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS description_ai TEXT,
  ADD COLUMN IF NOT EXISTS description_source TEXT CHECK (description_source IN ('MANUAL', 'AI_GENERATED', 'HYBRID')) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS description_ai_generated_at TIMESTAMPTZ;
