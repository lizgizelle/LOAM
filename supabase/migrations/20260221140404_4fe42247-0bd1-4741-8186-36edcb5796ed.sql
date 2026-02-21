
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage bucket rules" ON public.game_bucket_rules;
DROP POLICY IF EXISTS "Authenticated users can view bucket rules" ON public.game_bucket_rules;

-- Recreate as permissive policies
CREATE POLICY "Admins can manage bucket rules"
ON public.game_bucket_rules
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view bucket rules"
ON public.game_bucket_rules
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
