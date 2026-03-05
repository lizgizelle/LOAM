
DROP POLICY IF EXISTS "Admins can manage game schedule" ON public.game_schedule;
DROP POLICY IF EXISTS "Authenticated users can view active schedule" ON public.game_schedule;

CREATE POLICY "Admins can manage game schedule" ON public.game_schedule
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active schedule" ON public.game_schedule
  FOR SELECT TO authenticated
  USING (is_active = true);
