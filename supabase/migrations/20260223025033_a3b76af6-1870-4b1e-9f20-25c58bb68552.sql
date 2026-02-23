
-- Add community agreement fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN accepted_community_agreement boolean NOT NULL DEFAULT false,
ADD COLUMN accepted_community_agreement_at timestamp with time zone DEFAULT NULL;
