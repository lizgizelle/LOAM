-- Create matchmaker_sets table (similar to surveys)
CREATE TABLE public.matchmaker_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matchmaker_questions table
CREATE TABLE public.matchmaker_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.matchmaker_sets(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'multiple_choice', 'scale', 'free_text'
  options JSONB, -- for multiple choice options
  scale_label_low TEXT, -- for scale type
  scale_label_high TEXT, -- for scale type
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matchmaker_sessions table
CREATE TABLE public.matchmaker_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES public.matchmaker_sets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matchmaker_answers table
CREATE TABLE public.matchmaker_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.matchmaker_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.matchmaker_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  question_text_snapshot TEXT NOT NULL,
  question_type_snapshot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- Enable RLS
ALTER TABLE public.matchmaker_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaker_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaker_answers ENABLE ROW LEVEL SECURITY;

-- Matchmaker sets policies
CREATE POLICY "Admins can manage matchmaker sets" ON public.matchmaker_sets
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active matchmaker sets" ON public.matchmaker_sets
  FOR SELECT USING (status = 'active');

-- Matchmaker questions policies
CREATE POLICY "Admins can manage matchmaker questions" ON public.matchmaker_questions
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active matchmaker questions" ON public.matchmaker_questions
  FOR SELECT USING (is_active = true);

-- Matchmaker sessions policies
CREATE POLICY "Users can create their own sessions" ON public.matchmaker_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON public.matchmaker_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.matchmaker_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.matchmaker_sessions
  FOR SELECT USING (is_admin(auth.uid()));

-- Matchmaker answers policies
CREATE POLICY "Users can create their own answers" ON public.matchmaker_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own answers" ON public.matchmaker_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON public.matchmaker_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all answers" ON public.matchmaker_answers
  FOR SELECT USING (is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_matchmaker_sets_updated_at
  BEFORE UPDATE ON public.matchmaker_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matchmaker_questions_updated_at
  BEFORE UPDATE ON public.matchmaker_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matchmaker_sessions_updated_at
  BEFORE UPDATE ON public.matchmaker_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();