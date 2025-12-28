-- Add participant visibility column to events table
ALTER TABLE public.events 
ADD COLUMN show_participants boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.events.show_participants IS 'Controls whether approved participants are visible to other participants';