
-- Drop restrictive policies
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

-- Recreate as permissive
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view app settings" ON public.app_settings
  FOR SELECT
  USING (true);
