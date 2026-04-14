-- Create the menu-cache bucket for storing public menu JSON files
-- This bucket serves as CDN-backed static JSON for the public menu pages,
-- ensuring the menu remains accessible even during Next.js deploys.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-cache',
  'menu-cache',
  true,
  5242880, -- 5 MB
  ARRAY['application/json']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public (anon) reads
CREATE POLICY IF NOT EXISTS "menu_cache_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'menu-cache');

-- Allow service_role to write/delete
CREATE POLICY IF NOT EXISTS "menu_cache_service_write"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'menu-cache');

CREATE POLICY IF NOT EXISTS "menu_cache_service_update"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'menu-cache');

CREATE POLICY IF NOT EXISTS "menu_cache_service_delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'menu-cache');
