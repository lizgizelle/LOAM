import { useEffect, useRef, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ensureUserThreadAdmin, postAdminMessage } from '@/lib/chat';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Search, MessageCircle, Loader2 } from 'lucide-react';

interface ThreadRow {
  id: string;
  user_id: string;
  last_message_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  preview: string;
  unread: boolean;
}

interface Msg {
  id: string;
  thread_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_id: string | null;
  body: string;
  created_at: string;
  read_by_admin_at: string | null;
}

const AdminChat = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [search, setSearch] = useState('');
  const [activeThread, setActiveThread] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [composeUserId, setComposeUserId] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    const { data: ths } = await supabase
      .from('chat_threads')
      .select('id, user_id, last_message_at')
      .order('last_message_at', { ascending: false });

    const list = (ths || []) as { id: string; user_id: string; last_message_at: string }[];
    if (!list.length) {
      setThreads([]);
      setLoadingThreads(false);
      return;
    }

    const userIds = list.map((t) => t.user_id);
    const threadIds = list.map((t) => t.id);

    const [{ data: profiles }, { data: lastMsgs }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email').in('id', userIds),
      supabase
        .from('chat_messages')
        .select('thread_id, body, sender_type, read_by_admin_at, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false }),
    ]);

    const pmap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { pmap[p.id] = p; });
    const previewMap: Record<string, { body: string; unread: boolean }> = {};
    (lastMsgs || []).forEach((m: any) => {
      if (!previewMap[m.thread_id]) {
        previewMap[m.thread_id] = {
          body: m.body,
          unread: m.sender_type === 'user' && !m.read_by_admin_at,
        };
      } else if (m.sender_type === 'user' && !m.read_by_admin_at) {
        previewMap[m.thread_id].unread = true;
      }
    });

    setThreads(
      list.map((t) => {
        const p = pmap[t.user_id] || {};
        const pv = previewMap[t.id] || { body: '', unread: false };
        return {
          id: t.id,
          user_id: t.user_id,
          last_message_at: t.last_message_at,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          preview: pv.body,
          unread: pv.unread,
        };
      })
    );
    setLoadingThreads(false);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load all users for compose-new dropdown
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name', { ascending: true })
      .limit(500)
      .then(({ data }) => setAllUsers((data as any) || []));
  }, []);

  // Open thread
  const openThread = async (t: ThreadRow) => {
    setActiveThread(t);
    setLoadingMsgs(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_type, sender_id, body, created_at, read_by_admin_at')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Msg[]);
    setLoadingMsgs(false);

    // Mark user messages as read
    await supabase
      .from('chat_messages')
      .update({ read_by_admin_at: new Date().toISOString() })
      .eq('thread_id', t.id)
      .eq('sender_type', 'user')
      .is('read_by_admin_at', null);

    // Refresh thread list to clear unread badge
    setThreads((prev) => prev.map((th) => (th.id === t.id ? { ...th, unread: false } : th)));
  };

  // Realtime for active thread
  useEffect(() => {
    if (!activeThread) return;
    const channel = supabase
      .channel(`admin-chat-${activeThread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${activeThread.id}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Msg]
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThread?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!activeThread || !user?.id || !draft.trim() || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    const { error } = await postAdminMessage(activeThread.id, user.id, body);
    setSending(false);
    if (error) { setDraft(body); console.error(error); }
    else { loadThreads(); }
  };

  const startNewThread = async () => {
    if (!composeUserId) return;
    const tid = await ensureUserThreadAdmin(composeUserId);
    if (!tid) return;
    const profile = allUsers.find((u) => u.id === composeUserId);
    setComposeUserId('');
    await loadThreads();
    openThread({
      id: tid,
      user_id: composeUserId,
      last_message_at: new Date().toISOString(),
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      email: null,
      preview: '',
      unread: false,
    });
  };

  const fmtRel = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  const filteredThreads = threads.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = `${t.first_name || ''} ${t.last_name || ''} ${t.email || ''}`.toLowerCase();
    return name.includes(q);
  });

  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="text-muted-foreground text-sm">Direct messages with users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-12rem)]">
        {/* Threads list */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={composeUserId}
                onChange={(e) => setComposeUserId(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">+ New chat with...</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name || '—'} {u.last_name || ''}
                  </option>
                ))}
              </select>
              <button
                onClick={startNewThread}
                disabled={!composeUserId}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
              >
                Open
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No conversations yet.
              </div>
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openThread(t)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    activeThread?.id === t.id ? 'bg-muted/60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm truncate">
                      {t.first_name || '—'} {t.last_name || ''}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.unread && <span className="w-2 h-2 rounded-full bg-primary" />}
                      <span className="text-[10px] text-muted-foreground">{fmtRel(t.last_message_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{t.preview || 'No messages yet'}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active conversation */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Pick a conversation to start.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <p className="font-semibold">{activeThread.first_name || '—'} {activeThread.last_name || ''}</p>
                <p className="text-xs text-muted-foreground">{activeThread.email}</p>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No messages yet — say hi 👋</p>
                ) : (
                  messages.map((m) => {
                    if (m.sender_type === 'system') {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <div className="max-w-[80%] bg-secondary/60 rounded-xl px-3 py-2 text-xs text-foreground whitespace-pre-line">
                            {m.body}
                          </div>
                        </div>
                      );
                    }
                    const isAdmin = m.sender_type === 'admin';
                    return (
                      <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        }`}>
                          {m.body}
                          <p className={`text-[10px] mt-1 opacity-70 ${isAdmin ? 'text-right' : ''}`}>
                            {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-border flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Write to this user..."
                  rows={1}
                  className="resize-none min-h-[44px] max-h-32"
                />
                <button
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChat;
