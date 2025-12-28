-- Add hide_location_until_approved column to events table
ALTER TABLE public.events 
ADD COLUMN hide_location_until_approved boolean NOT NULL DEFAULT true;