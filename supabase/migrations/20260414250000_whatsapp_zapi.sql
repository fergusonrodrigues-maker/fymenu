-- WhatsApp Z-API integration tables
-- Each restaurant (unit) connects its own number; FyMenu manages the infrastructure

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id) UNIQUE,
  zapi_instance_id TEXT NOT NULL,
  zapi_instance_token TEXT NOT NULL,
  zapi_client_token TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'banned')),
  auto_notifications BOOLEAN DEFAULT true,
  notify_order_received BOOLEAN DEFAULT true,
  notify_order_preparing BOOLEAN DEFAULT true,
  notify_order_ready BOOLEAN DEFAULT true,
  notify_order_delivering BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  customer_id UUID REFERENCES crm_customers(id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_name TEXT,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'bulk', 'auto_order_received', 'auto_order_preparing', 'auto_order_ready', 'auto_order_delivering', 'auto_order_delivered')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  zapi_message_id TEXT,
  order_intent_id UUID REFERENCES order_intents(id),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'marketing' CHECK (category IN ('marketing', 'order_status', 'utility')),
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages whatsapp_instances" ON whatsapp_instances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Owner manages whatsapp_messages" ON whatsapp_messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Owner manages whatsapp_templates" ON whatsapp_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM units u JOIN restaurants r ON r.id = u.restaurant_id
    WHERE u.id = unit_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Service role full whatsapp_instances" ON whatsapp_instances FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role full whatsapp_messages" ON whatsapp_messages FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role full whatsapp_templates" ON whatsapp_templates FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
