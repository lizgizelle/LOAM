CREATE POLICY "Admins can delete unlocks"
ON public.game_unlocks
FOR DELETE
USING (is_admin(auth.uid()));