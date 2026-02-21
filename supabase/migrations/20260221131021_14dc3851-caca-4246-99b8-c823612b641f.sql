
-- Game buckets
CREATE TABLE public.game_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage game buckets" ON public.game_buckets FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view game buckets" ON public.game_buckets FOR SELECT USING (auth.uid() IS NOT NULL);

-- Game questions
CREATE TABLE public.game_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id UUID NOT NULL REFERENCES public.game_buckets(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage game questions" ON public.game_questions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view active game questions" ON public.game_questions FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Game bucket rules (maps quiz answers to buckets)
CREATE TABLE public.game_bucket_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id UUID NOT NULL REFERENCES public.game_buckets(id) ON DELETE CASCADE,
  survey_question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_bucket_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bucket rules" ON public.game_bucket_rules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view bucket rules" ON public.game_bucket_rules FOR SELECT USING (auth.uid() IS NOT NULL);

-- Game ratings
CREATE TABLE public.game_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.game_questions(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

ALTER TABLE public.game_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own ratings" ON public.game_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own ratings" ON public.game_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings" ON public.game_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all ratings" ON public.game_ratings FOR SELECT USING (is_admin(auth.uid()));

-- Game access codes
CREATE TABLE public.game_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage access codes" ON public.game_access_codes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view active codes" ON public.game_access_codes FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Game unlocks (track which users unlocked the game)
CREATE TABLE public.game_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlock" ON public.game_unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own unlock" ON public.game_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all unlocks" ON public.game_unlocks FOR SELECT USING (is_admin(auth.uid()));

-- Add game_bucket_id to profiles
ALTER TABLE public.profiles ADD COLUMN game_bucket_id UUID REFERENCES public.game_buckets(id);

-- Triggers for updated_at
CREATE TRIGGER update_game_buckets_updated_at BEFORE UPDATE ON public.game_buckets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_game_questions_updated_at BEFORE UPDATE ON public.game_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for rating range (1-5)
CREATE OR REPLACE FUNCTION public.validate_game_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_game_rating_trigger
BEFORE INSERT OR UPDATE ON public.game_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_game_rating();
