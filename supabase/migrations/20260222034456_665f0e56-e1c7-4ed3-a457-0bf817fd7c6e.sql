
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage event questions" ON public.event_registration_questions;
DROP POLICY IF EXISTS "Anyone can view questions for published events" ON public.event_registration_questions;

-- Recreate as PERMISSIVE
CREATE POLICY "Admins can manage event questions"
  ON public.event_registration_questions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view questions for published events"
  ON public.event_registration_questions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_registration_questions.event_id
      AND events.status = 'published'
  ));
