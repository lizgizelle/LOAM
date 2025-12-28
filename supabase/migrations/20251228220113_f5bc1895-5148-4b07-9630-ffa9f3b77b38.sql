-- Create surveys table for survey sets
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Surveys policies
CREATE POLICY "Anyone can view active surveys"
ON public.surveys
FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can view all surveys"
ON public.surveys
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create surveys"
ON public.surveys
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update surveys"
ON public.surveys
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete surveys"
ON public.surveys
FOR DELETE
USING (is_admin(auth.uid()));

-- Add survey_id to survey_questions
ALTER TABLE public.survey_questions 
ADD COLUMN survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE;

-- Add survey tracking to survey_responses
ALTER TABLE public.survey_responses 
ADD COLUMN survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL,
ADD COLUMN survey_title_snapshot TEXT;

-- Create trigger for updated_at on surveys
CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a default survey and migrate existing questions
INSERT INTO public.surveys (id, title, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Survey', 'active');

-- Link existing questions to the default survey
UPDATE public.survey_questions 
SET survey_id = '00000000-0000-0000-0000-000000000001'
WHERE survey_id IS NULL;

-- Make survey_id NOT NULL now that existing data is migrated
ALTER TABLE public.survey_questions 
ALTER COLUMN survey_id SET NOT NULL;