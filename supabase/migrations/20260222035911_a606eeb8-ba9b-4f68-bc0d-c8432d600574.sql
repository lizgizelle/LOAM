-- Add a foreign key from event_participants.user_id to profiles.id so we can join them
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);