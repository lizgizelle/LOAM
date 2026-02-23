
-- Create concern_reports table
CREATE TABLE public.concern_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_first_name TEXT NOT NULL,
  court_number INTEGER NOT NULL,
  court_leader_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concern_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own reports
CREATE POLICY "Users can create their own reports"
ON public.concern_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports (for status notifications)
CREATE POLICY "Users can view their own reports"
ON public.concern_reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.concern_reports FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.concern_reports FOR UPDATE
USING (is_admin(auth.uid()));

-- Create concern_report_notes table (audit trail)
CREATE TABLE public.concern_report_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.concern_reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  note_text TEXT,
  status_change TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.concern_report_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notes
CREATE POLICY "Admins can manage report notes"
ON public.concern_report_notes FOR ALL
USING (is_admin(auth.uid()));

-- Trigger for updated_at on concern_reports
CREATE TRIGGER update_concern_reports_updated_at
BEFORE UPDATE ON public.concern_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', false);

-- Users can upload their own report photos
CREATE POLICY "Users can upload report photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own photos
CREATE POLICY "Users can view own report photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all report photos
CREATE POLICY "Admins can view all report photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos' AND is_admin(auth.uid()));
