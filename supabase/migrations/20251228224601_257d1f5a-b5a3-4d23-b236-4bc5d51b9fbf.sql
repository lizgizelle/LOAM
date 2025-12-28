-- Create event_reports table for logging user reports
CREATE TABLE public.event_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports for events
CREATE POLICY "Users can create event reports"
ON public.event_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.event_reports
FOR SELECT
USING (is_admin(auth.uid()));

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.event_reports
FOR SELECT
USING (auth.uid() = user_id);