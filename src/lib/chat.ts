import { supabase } from '@/integrations/supabase/client';

/** Returns existing thread for user, or creates one. */
export async function ensureUserThread(userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('chat_threads')
    .insert({ user_id: userId })
    .select('id')
    .single();
  if (error) {
    console.error('ensureUserThread', error);
    return null;
  }
  return created.id;
}

/** Admin-side: find or create a thread for any user. */
export async function ensureUserThreadAdmin(userId: string): Promise<string | null> {
  // Admin RLS lets us read/write any thread
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('chat_threads')
    .insert({ user_id: userId })
    .select('id')
    .single();
  if (error) {
    console.error('ensureUserThreadAdmin', error);
    return null;
  }
  return created.id;
}

export async function postSystemMessage(threadId: string, body: string) {
  return supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_type: 'system',
    body,
  });
}

export async function postAdminMessage(threadId: string, adminId: string, body: string) {
  return supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_type: 'admin',
    sender_id: adminId,
    body,
  });
}

export async function postUserMessage(threadId: string, userId: string, body: string) {
  return supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_type: 'user',
    sender_id: userId,
    body,
  });
}
