
CREATE TABLE public.game_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  label text
);

ALTER TABLE public.game_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage game schedule" ON public.game_schedule
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active schedule" ON public.game_schedule
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
