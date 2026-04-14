-- Support conversations
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  unit_id UUID REFERENCES units(id),
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting_reply', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by_user_id UUID REFERENCES auth.users(id),
  assigned_staff_id UUID REFERENCES support_staff(id),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Support messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'staff', 'system')),
  sender_user_id UUID REFERENCES auth.users(id),
  sender_staff_id UUID REFERENCES support_staff(id),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS support_conversations_restaurant_id_idx ON support_conversations(restaurant_id);
CREATE INDEX IF NOT EXISTS support_conversations_status_idx ON support_conversations(status);
CREATE INDEX IF NOT EXISTS support_conversations_last_message_at_idx ON support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_conversation_id_idx ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON support_messages(created_at DESC);

-- RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Client can read their own conversations
CREATE POLICY "Client reads own conversations" ON support_conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));

-- Client can create conversations for their restaurant
CREATE POLICY "Client inserts own conversations" ON support_conversations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));

-- Client can read messages from their conversations
CREATE POLICY "Client reads own messages" ON support_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM support_conversations sc
    JOIN restaurants r ON r.id = sc.restaurant_id
    WHERE sc.id = conversation_id AND r.owner_id = auth.uid()
  ));

-- Client can send messages to their conversations
CREATE POLICY "Client sends messages" ON support_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM support_conversations sc
    JOIN restaurants r ON r.id = sc.restaurant_id
    WHERE sc.id = conversation_id AND r.owner_id = auth.uid()
  ));

-- Service role (suporte/admin) has full access
CREATE POLICY "Service role full access conversations" ON support_conversations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages" ON support_messages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
