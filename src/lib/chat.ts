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

/** Edit an existing message (user or admin). */
export async function editMessage(messageId: string, body: string) {
  return supabase
    .from('chat_messages')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', messageId);
}

/** Soft-delete a message. */
export async function deleteMessage(messageId: string) {
  return supabase
    .from('chat_messages')
    .update({ is_deleted: true, body: '' })
    .eq('id', messageId);
}

/**
 * Admin broadcast: send the same message to every user in the given group.
 * Ensures each recipient has a chat thread, then posts an admin message into each.
 * Returns the number of recipients messaged.
 */
export async function broadcastToGroup(
  groupId: string,
  adminId: string,
  body: string
): Promise<{ count: number; error: string | null }> {
  // Get bookings → user ids
  const { data: bookings, error: bErr } = await supabase
    .from('activity_bookings')
    .select('user_id')
    .eq('group_id', groupId);
  if (bErr) return { count: 0, error: bErr.message };
  const userIds = Array.from(new Set((bookings || []).map((b: any) => b.user_id)));
  if (!userIds.length) return { count: 0, error: 'No members in this group.' };

  // Find existing threads
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id, user_id')
    .in('user_id', userIds);
  const threadMap: Record<string, string> = {};
  (existing || []).forEach((t: any) => { threadMap[t.user_id] = t.id; });

  // Create threads for any missing
  const missing = userIds.filter((uid) => !threadMap[uid]);
  if (missing.length) {
    const { data: created } = await supabase
      .from('chat_threads')
      .insert(missing.map((user_id) => ({ user_id })))
      .select('id, user_id');
    (created || []).forEach((t: any) => { threadMap[t.user_id] = t.id; });
  }

  // Insert one admin message per thread
  const rows = userIds
    .map((uid) => threadMap[uid])
    .filter(Boolean)
    .map((thread_id) => ({
      thread_id,
      sender_type: 'admin',
      sender_id: adminId,
      body,
    }));
  if (!rows.length) return { count: 0, error: 'No threads to deliver to.' };

  const { error: insErr } = await supabase.from('chat_messages').insert(rows);
  if (insErr) return { count: 0, error: insErr.message };
  return { count: rows.length, error: null };
}
