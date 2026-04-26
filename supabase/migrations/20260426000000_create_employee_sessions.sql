-- Portal do Colaborador: employee session tokens
-- Sessions live for 12 hours and expire when the browser tab is closed (sessionStorage)
-- The server also revokes tokens on explicit logout and rejects expired/revoked ones.

CREATE TABLE IF NOT EXISTS employee_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid        NOT NULL REFERENCES employees(id)  ON DELETE CASCADE,
  unit_id     uuid        NOT NULL REFERENCES units(id)      ON DELETE CASCADE,
  token       text        UNIQUE NOT NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '12 hours',
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_sessions_token_idx      ON employee_sessions (token);
CREATE        INDEX IF NOT EXISTS employee_sessions_employee_id_idx ON employee_sessions (employee_id);

-- Enable RLS; server actions use service-role key and bypass these policies.
ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Deny all direct public access — only the server (service role) may read/write.
CREATE POLICY "employee_sessions_deny_public"
  ON employee_sessions
  FOR ALL
  TO public
  USING (false);
