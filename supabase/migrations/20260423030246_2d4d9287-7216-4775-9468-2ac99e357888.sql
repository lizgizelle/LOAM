-- Add edit/delete tracking to chat messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Allow users to update their own messages (for edit/soft-delete)
DROP POLICY IF EXISTS "Users update own messages" ON public.chat_messages;
CREATE POLICY "Users update own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (sender_type = 'user' AND sender_id = auth.uid())
WITH CHECK (sender_type = 'user' AND sender_id = auth.uid());