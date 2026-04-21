-- Add activity reference and time columns to concern_reports
ALTER TABLE public.concern_reports
  ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_time time;

CREATE INDEX IF NOT EXISTS idx_concern_reports_activity_id ON public.concern_reports(activity_id);