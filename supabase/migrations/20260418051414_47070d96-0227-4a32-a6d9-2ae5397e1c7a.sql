-- =====================================================
-- ACTIVITIES FEATURE
-- =====================================================

-- Activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  icon_emoji TEXT DEFAULT '✨',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active activities"
  ON public.activities FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity areas (which areas each activity is offered in)
CREATE TABLE public.activity_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, area_name)
);

ALTER TABLE public.activity_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active areas"
  ON public.activity_areas FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage activity areas"
  ON public.activity_areas FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Recurring schedule rules per activity
CREATE TABLE public.activity_schedule_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  capacity INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_schedule_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active rules"
  ON public.activity_schedule_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage schedule rules"
  ON public.activity_schedule_rules FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_activity_schedule_rules_updated_at
  BEFORE UPDATE ON public.activity_schedule_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Concrete dated slots
CREATE TABLE public.activity_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  capacity INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'open', -- open, full, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, area_name, start_time)
);

CREATE INDEX idx_activity_slots_lookup ON public.activity_slots(activity_id, area_name, start_time);

ALTER TABLE public.activity_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view open upcoming slots"
  ON public.activity_slots FOR SELECT
  TO authenticated
  USING (status = 'open' AND start_time > now());

CREATE POLICY "Admins can view all slots"
  ON public.activity_slots FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage slots"
  ON public.activity_slots FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_activity_slots_updated_at
  BEFORE UPDATE ON public.activity_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User bookings
CREATE TABLE public.activity_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.activity_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id)
);

CREATE INDEX idx_activity_bookings_user ON public.activity_bookings(user_id);
CREATE INDEX idx_activity_bookings_slot ON public.activity_bookings(slot_id);

ALTER TABLE public.activity_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON public.activity_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.activity_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.activity_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON public.activity_bookings FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all bookings"
  ON public.activity_bookings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_activity_bookings_updated_at
  BEFORE UPDATE ON public.activity_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SUBSCRIPTIONS (mock — no real billing)
-- =====================================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL, -- '1_month', '3_months', '6_months'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: check if user has an active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
  )
$$;

-- =====================================================
-- SEED DATA: 5 starter activities + areas + schedule rules
-- =====================================================
DO $$
DECLARE
  act_climbing UUID;
  act_minigolf UUID;
  act_bowling UUID;
  act_sourdough UUID;
  act_run UUID;
  act_id UUID;
  area TEXT;
  areas TEXT[] := ARRAY['Central', 'Dempsey / Holland Village / Buona Vista', 'Katong / Marine Parade'];
BEGIN
  INSERT INTO public.activities (name, description, icon_emoji, display_order) VALUES
    ('Climbing', 'Scale the walls together — a friendly bouldering session for all levels. Shoes provided. Just bring water and a willingness to fall (safely).', '🧗', 1)
    RETURNING id INTO act_climbing;

  INSERT INTO public.activities (name, description, icon_emoji, display_order) VALUES
    ('Mini Golf', 'Glow-in-the-dark mini golf. 18 holes of friendly chaos. Drinks afterwards optional but encouraged.', '⛳', 2)
    RETURNING id INTO act_minigolf;

  INSERT INTO public.activities (name, description, icon_emoji, display_order) VALUES
    ('Bowling', 'Two games of bowling at a local alley. Shoes included. No experience needed — gutter balls welcome.', '🎳', 3)
    RETURNING id INTO act_bowling;

  INSERT INTO public.activities (name, description, icon_emoji, display_order) VALUES
    ('Sourdough Painting', 'A creative evening: paint your own sourdough loaf with edible designs, then take it home. All materials provided.', '🎨', 4)
    RETURNING id INTO act_sourdough;

  INSERT INTO public.activities (name, description, icon_emoji, display_order) VALUES
    ('Run Club', 'A 5km social run at an easy pace. Bring running shoes. We finish with coffee.', '🏃', 5)
    RETURNING id INTO act_run;

  -- Insert areas + schedule rules for each activity
  FOR act_id IN SELECT unnest(ARRAY[act_climbing, act_minigolf, act_bowling, act_sourdough, act_run]) LOOP
    -- Areas
    FOREACH area IN ARRAY areas LOOP
      INSERT INTO public.activity_areas (activity_id, area_name) VALUES (act_id, area);
    END LOOP;

    -- Schedule rules: Wed 7:30pm, Thu 7:30pm, Sat 3pm
    INSERT INTO public.activity_schedule_rules (activity_id, day_of_week, start_time, duration_minutes, capacity) VALUES
      (act_id, 3, '19:30', 90, 6),  -- Wednesday
      (act_id, 4, '19:30', 90, 6),  -- Thursday
      (act_id, 6, '15:00', 120, 6); -- Saturday
  END LOOP;
END $$;