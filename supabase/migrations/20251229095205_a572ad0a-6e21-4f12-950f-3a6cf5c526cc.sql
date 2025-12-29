-- Create matches table for storing admin-assigned matches
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'removed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (user_1_id != user_2_id)
);

-- Add index for faster lookups
CREATE INDEX idx_matches_user_1 ON public.matches(user_1_id);
CREATE INDEX idx_matches_user_2 ON public.matches(user_2_id);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches they are part of
CREATE POLICY "Users can view their own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- Admins can manage all matches
CREATE POLICY "Admins can manage matches" ON public.matches
  FOR ALL USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();