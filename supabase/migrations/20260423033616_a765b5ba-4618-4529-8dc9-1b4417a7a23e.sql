-- =========================================
-- FEEDBACK SYSTEM
-- =========================================

-- 1. Configurable feedback questions (global default OR per-activity override)
CREATE TABLE IF NOT EXISTS public.feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('rating_5', 'short_text', 'long_text', 'multiple_choice')),
  options jsonb NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_activity ON public.feedback_questions(activity_id, display_order);

ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage feedback questions"
ON public.feedback_questions FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can view active questions"
ON public.feedback_questions FOR SELECT TO authenticated
USING (is_active = true);

CREATE TRIGGER feedback_questions_updated_at
BEFORE UPDATE ON public.feedback_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. One invite per booking (so we know who needs to give feedback, and when sent)
CREATE TABLE IF NOT EXISTS public.feedback_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  slot_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz NULL,
  responded_at timestamptz NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','responded','skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_invites_user ON public.feedback_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_invites_due ON public.feedback_invites(scheduled_at, status) WHERE status = 'pending';

ALTER TABLE public.feedback_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage feedback invites"
ON public.feedback_invites FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users view own invites"
ON public.feedback_invites FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER feedback_invites_updated_at
BEFORE UPDATE ON public.feedback_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. User responses (one row per question answered)
CREATE TABLE IF NOT EXISTS public.feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.feedback_invites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  question_id uuid NOT NULL,
  question_text_snapshot text NOT NULL,
  question_type_snapshot text NOT NULL,
  answer_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_user ON public.feedback_responses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_invite ON public.feedback_responses(invite_id);

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all responses"
ON public.feedback_responses FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Users insert own responses"
ON public.feedback_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own responses"
ON public.feedback_responses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 4. Seed a small default global question set (only if none exist)
INSERT INTO public.feedback_questions (activity_id, question_text, question_type, display_order, is_required)
SELECT NULL, q.question_text, q.question_type, q.display_order, q.is_required
FROM (VALUES
  ('How would you rate your overall experience?', 'rating_5', 1, true),
  ('What stood out to you about the people you met?', 'long_text', 2, false),
  ('Anything we could do better next time?', 'long_text', 3, false)
) AS q(question_text, question_type, display_order, is_required)
WHERE NOT EXISTS (SELECT 1 FROM public.feedback_questions);
