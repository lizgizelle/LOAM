-- Create app settings table for global configuration
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: admins can read/write, public can read
CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Insert default quiz onboarding setting (enabled by default)
INSERT INTO public.app_settings (key, value) 
VALUES ('quiz_onboarding_enabled', 'true'::jsonb);

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();