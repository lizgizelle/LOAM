
-- Add ticket pricing fields to events
ALTER TABLE public.events 
ADD COLUMN ticket_price decimal(10,2) DEFAULT NULL,
ADD COLUMN currency text NOT NULL DEFAULT 'SGD';

-- Event registration questions (per-event)
CREATE TABLE public.event_registration_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text', -- text, select, checkbox, textarea
  options JSONB DEFAULT NULL, -- for select/radio types
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_registration_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event questions"
ON public.event_registration_questions
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can view questions for published events"
ON public.event_registration_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_registration_questions.event_id 
    AND events.status = 'published'
  )
);

-- Event registration answers
CREATE TABLE public.event_registration_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.event_registration_questions(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_registration_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own answers"
ON public.event_registration_answers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own answers"
ON public.event_registration_answers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all answers"
ON public.event_registration_answers
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all answers"
ON public.event_registration_answers
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_event_registration_questions_updated_at
BEFORE UPDATE ON public.event_registration_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
