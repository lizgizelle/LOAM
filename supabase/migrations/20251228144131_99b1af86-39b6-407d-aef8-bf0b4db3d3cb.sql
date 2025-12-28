-- Create admin_invites table for email-based admin invitations
CREATE TABLE public.admin_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'event_host',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Only super admins can view invites
CREATE POLICY "Super admins can view invites"
ON public.admin_invites
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Only super admins can create invites
CREATE POLICY "Super admins can create invites"
ON public.admin_invites
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Only super admins can delete invites
CREATE POLICY "Super admins can delete invites"
ON public.admin_invites
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Only super admins can update invites
CREATE POLICY "Super admins can update invites"
ON public.admin_invites
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));