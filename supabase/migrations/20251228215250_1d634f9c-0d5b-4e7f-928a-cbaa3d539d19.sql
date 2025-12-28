-- Create survey_questions table to store dynamic survey questions
CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'scale_1_10')),
  options JSONB, -- For multiple choice: array of option strings
  scale_label_low TEXT, -- For scale: label above 1
  scale_label_high TEXT, -- For scale: label below 10
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_responses table to store user answers
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  question_text_snapshot TEXT NOT NULL, -- Store question text at time of response
  question_type_snapshot TEXT NOT NULL,
  answer_value TEXT NOT NULL, -- The selected option or number
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Survey questions policies - admins can manage, anyone can read active questions
CREATE POLICY "Anyone can view active survey questions"
ON public.survey_questions
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all survey questions"
ON public.survey_questions
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create survey questions"
ON public.survey_questions
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update survey questions"
ON public.survey_questions
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete survey questions"
ON public.survey_questions
FOR DELETE
USING (is_admin(auth.uid()));

-- Survey responses policies
CREATE POLICY "Users can create their own responses"
ON public.survey_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses"
ON public.survey_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all responses"
ON public.survey_responses
FOR SELECT
USING (is_admin(auth.uid()));

-- Create trigger for updated_at on survey_questions
CREATE TRIGGER update_survey_questions_updated_at
BEFORE UPDATE ON public.survey_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default survey questions to match current hardcoded flow
INSERT INTO public.survey_questions (question_text, question_type, options, scale_label_low, scale_label_high, display_order) VALUES
('Do you consider yourself more of a', 'multiple_choice', '["Smart person", "Funny person"]', NULL, NULL, 1),
('I enjoy going out with friends', 'scale_1_10', NULL, 'Rarely', 'Very often', 2),
('Are you a woman or a man?', 'multiple_choice', '["Woman", "Man"]', NULL, NULL, 3);