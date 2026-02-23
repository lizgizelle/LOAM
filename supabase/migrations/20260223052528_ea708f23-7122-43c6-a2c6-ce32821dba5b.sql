
-- Add report_topic column (person or event)
ALTER TABLE public.concern_reports ADD COLUMN report_topic text NOT NULL DEFAULT 'person';

-- Add event_aspect column for event-type reports
ALTER TABLE public.concern_reports ADD COLUMN event_aspect text;

-- Make person-specific fields nullable for event-type reports
ALTER TABLE public.concern_reports ALTER COLUMN reported_first_name DROP NOT NULL;
ALTER TABLE public.concern_reports ALTER COLUMN court_number DROP NOT NULL;
ALTER TABLE public.concern_reports ALTER COLUMN court_leader_name DROP NOT NULL;
