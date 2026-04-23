import { useEffect, useRef, useState } from 'react';
import BottomNav from '@/components/BottomNav';
import { MessageCircle, Send, Pencil, Trash2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ensureUserThread, postUserMessage, editMessage, deleteMessage } from '@/lib/chat';
import { Textarea } from '@/components/ui/textarea';

interface Msg {
  id: string;
  thread_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Init thread + load messages
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!user?.id) return;
      const tid = await ensureUserThread(user.id);
      if (!tid || cancelled) return;
      setThreadId(tid);
      const { data } = await supabase
        .from('chat_messages')
        .select('id, thread_id, sender_type, sender_id, body, created_at, edited_at, is_deleted')
        .eq('thread_id', tid)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        setMessages((data || []) as Msg[]);
        setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Realtime subscribe (INSERT + UPDATE)
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id)
              ? prev
              : [...prev, payload.new as Msg]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as Msg) : m))
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!threadId || !user?.id || !draft.trim() || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    const { error } = await postUserMessage(threadId, user.id, body);
    setSending(false);
    if (error) {
      setDraft(body);
      console.error(error);
    }
  };

  const startEdit = (m: Msg) => {
    setEditingId(m.id);
    setEditDraft(m.body);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft.trim()) return;
    const { error } = await editMessage(editingId, editDraft.trim());
    if (error) console.error(error);
    setEditingId(null);
    setEditDraft('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    const { error } = await deleteMessage(id);
    if (error) console.error(error);
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Group messages by date for separators
  const grouped: { date: string; items: Msg[] }[] = [];
  messages.forEach((m) => {
    const d = fmtDay(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.items.push(m);
    else grouped.push({ date: d, items: [m] });
  });

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 safe-area-top border-b border-border/50">
        <h1 className="text-2xl font-bold text-foreground">Chat</h1>
        <p className="text-xs text-muted-foreground mt-1">Loam team — group updates, venue, role info.</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground animate-pulse">Loading...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-1">No messages yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              You'll get a note here once your group is confirmed for an upcoming activity.
            </p>
          </div>
        ) : (
          grouped.map((g, gi) => (
            <div key={gi} className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">{g.date}</p>
              {g.items.map((m) => {
                if (m.sender_type === 'system') {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] bg-secondary/60 rounded-2xl px-4 py-2.5 text-sm text-foreground whitespace-pre-line">
                        {m.body}
                      </div>
                    </div>
                  );
                }
                const isUser = m.sender_type === 'user';
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className={`flex group ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[78%]">
                      {!isUser && (
                        <p className="text-[11px] text-muted-foreground mb-0.5 px-2">Loam team</p>
                      )}
                      {isEditing ? (
                        <div className="flex items-end gap-1.5">
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={2}
                            className="resize-none rounded-2xl text-sm min-w-[200px]"
                            autoFocus
                          />
                          <button
                            onClick={saveEdit}
                            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                            aria-label="Save edit"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditDraft(''); }}
                            className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center"
                            aria-label="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                            m.is_deleted
                              ? 'bg-muted/60 text-muted-foreground italic'
                              : isUser
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-popover border border-border rounded-bl-md text-foreground'
                          }`}
                        >
                          {m.is_deleted ? 'Message deleted' : m.body}
                        </div>
                      )}
                      <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end pr-2' : 'pl-2'}`}>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtTime(m.created_at)}{m.edited_at && !m.is_deleted ? ' · edited' : ''}
                        </p>
                        {isUser && !m.is_deleted && !isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              aria-label="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-background border-t border-border/50 px-3 py-2.5 safe-area-bottom">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message..."
            rows={1}
            className="resize-none min-h-[44px] max-h-32 rounded-2xl"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Chat;
