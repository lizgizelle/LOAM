
-- 1. Add artwork_url to activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS artwork_url text;

-- 2. Add group_id to activity_bookings FIRST (before policy references it)
ALTER TABLE public.activity_bookings ADD COLUMN IF NOT EXISTS group_id uuid;

-- 3. Create activity_groups table
CREATE TABLE IF NOT EXISTS public.activity_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.activity_slots(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Group A',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. FK from bookings.group_id to activity_groups.id (added after table exists)
ALTER TABLE public.activity_bookings
  ADD CONSTRAINT activity_bookings_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.activity_groups(id) ON DELETE SET NULL;

ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage groups" ON public.activity_groups
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users view their assigned groups" ON public.activity_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_bookings b
      WHERE b.group_id = activity_groups.id AND b.user_id = auth.uid()
    )
  );

-- 5. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-covers', 'activity-covers', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-mascots', 'activity-mascots', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read activity covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'activity-covers');
CREATE POLICY "Admins write activity covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-covers' AND is_admin(auth.uid()));
CREATE POLICY "Admins update activity covers" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'activity-covers' AND is_admin(auth.uid()));
CREATE POLICY "Admins delete activity covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'activity-covers' AND is_admin(auth.uid()));

CREATE POLICY "Public read activity mascots" ON storage.objects
  FOR SELECT USING (bucket_id = 'activity-mascots');
CREATE POLICY "Admins write activity mascots" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-mascots' AND is_admin(auth.uid()));
CREATE POLICY "Admins update activity mascots" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'activity-mascots' AND is_admin(auth.uid()));
CREATE POLICY "Admins delete activity mascots" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'activity-mascots' AND is_admin(auth.uid()));

-- 6. updated_at trigger
CREATE TRIGGER update_activity_groups_updated_at
  BEFORE UPDATE ON public.activity_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
