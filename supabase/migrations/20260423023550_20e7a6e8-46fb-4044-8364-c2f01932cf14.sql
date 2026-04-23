-- 1. Add groups confirmation to activity_slots
ALTER TABLE public.activity_slots
  ADD COLUMN IF NOT EXISTS groups_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS groups_confirmed_by uuid;

-- 2. Chat threads — one per (user, admin-managed). For now: one thread per user.
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their thread"
  ON public.chat_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their thread"
  ON public.chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all threads"
  ON public.chat_threads FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user','admin','system')),
  sender_id uuid,
  body text NOT NULL,
  read_by_user_at timestamptz,
  read_by_admin_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE POLICY "Users send in own thread"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users mark read"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE POLICY "Admins manage all messages"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Function to bump thread last_message_at
CREATE OR REPLACE FUNCTION public.bump_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_thread
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_last_message();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;