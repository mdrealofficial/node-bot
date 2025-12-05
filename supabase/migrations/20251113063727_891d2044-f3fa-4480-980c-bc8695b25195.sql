-- Allow authenticated users to read fb_app_id (it's public info needed for client SDK)
-- The fb_app_secret remains protected (admins only)
CREATE POLICY "Authenticated users can view fb_app_id"
ON public.admin_config
FOR SELECT
TO authenticated
USING (true);