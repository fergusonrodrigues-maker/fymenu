-- ─────────────────────────────────────────────────────────────────────────────
-- CRM: coleta automática de clientes a partir de pedidos confirmados
--
-- Objetivo: popular/atualizar crm_customers automaticamente sempre que um
-- order_intent é confirmado (status = 'confirmed') e contém customer_name
-- ou customer_phone.
--
-- Deduplicação: phone + unit_id. Se o mesmo telefone fizer outro pedido na
-- mesma unidade, incrementa total_orders/total_spent e atualiza last_order_at.
-- Se não há telefone, usa o nome como chave secundária.
-- Se não há nem nome nem telefone, ignora (não cria registro anônimo).
--
-- SECURITY DEFINER: bypassa RLS para que o trigger funcione mesmo com a anon
-- key ou com chamadas de service_role sem policies permissivas no crm_customers.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_upsert_crm_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Só processa pedidos com dados do cliente ──────────────────────────────
  IF NEW.customer_name IS NULL AND NEW.customer_phone IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── Só processa status = 'confirmed' ─────────────────────────────────────
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- ── Para UPDATE, só processa quando o status MUDA para 'confirmed' ────────
  -- Evita dupla contagem se o pedido já confirmado for atualizado depois
  -- (ex: método de pagamento preenchido, nota adicionada, etc.)
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- ── 1) Tenta match por telefone (chave forte de deduplicação) ─────────────
  IF NEW.customer_phone IS NOT NULL AND trim(NEW.customer_phone) <> '' THEN
    UPDATE crm_customers SET
      name       = COALESCE(NULLIF(trim(NEW.customer_name), ''), name),
      total_orders = total_orders + 1,
      total_spent  = total_spent  + COALESCE(NEW.total::numeric, 0),
      last_order_at = now(),
      updated_at    = now()
    WHERE unit_id = NEW.unit_id
      AND phone   = trim(NEW.customer_phone);

    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ── 2) Se não achou por phone, tenta match por nome (fallback fraco) ──────
  --    Só usado quando customer_phone é NULL — evita criar duplicatas por nome
  IF NEW.customer_phone IS NULL AND NEW.customer_name IS NOT NULL AND trim(NEW.customer_name) <> '' THEN
    UPDATE crm_customers SET
      total_orders  = total_orders + 1,
      total_spent   = total_spent  + COALESCE(NEW.total::numeric, 0),
      last_order_at = now(),
      updated_at    = now()
    WHERE unit_id = NEW.unit_id
      AND phone    IS NULL
      AND name     = trim(NEW.customer_name);

    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  -- ── 3) Nenhum match → insere novo cliente ─────────────────────────────────
  INSERT INTO crm_customers (
    unit_id,
    name,
    phone,
    source,
    total_orders,
    total_spent,
    last_order_at
  )
  VALUES (
    NEW.unit_id,
    NULLIF(trim(COALESCE(NEW.customer_name, '')), ''),
    NULLIF(trim(COALESCE(NEW.customer_phone, '')), ''),
    COALESCE(NULLIF(trim(NEW.source), ''), 'menu'),
    1,
    COALESCE(NEW.total::numeric, 0),
    now()
  );

  RETURN NEW;

EXCEPTION
  -- Nunca deixa o trigger quebrar a confirmação do pedido
  WHEN OTHERS THEN
    RAISE WARNING 'fn_upsert_crm_customer: erro ignorado — %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ─── Cria o trigger (idempotente via DROP IF EXISTS) ──────────────────────────
DROP TRIGGER IF EXISTS trg_upsert_crm_customer ON order_intents;

CREATE TRIGGER trg_upsert_crm_customer
  AFTER INSERT OR UPDATE OF status
  ON order_intents
  FOR EACH ROW
  EXECUTE FUNCTION fn_upsert_crm_customer();

-- ─── Comentário explicativo ───────────────────────────────────────────────────
COMMENT ON FUNCTION fn_upsert_crm_customer() IS
  'Popula crm_customers automaticamente quando order_intents.status muda para confirmed. '
  'Deduplicação: phone+unit_id (forte) ou name+unit_id quando sem telefone (fraco). '
  'SECURITY DEFINER para bypassar RLS.';
