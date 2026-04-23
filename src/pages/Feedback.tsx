import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Star, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: 'rating_5' | 'short_text' | 'long_text' | 'multiple_choice';
  options: string[] | null;
  is_required: boolean;
}

const Feedback = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId || !user?.id) return;
    let cancelled = false;
    (async () => {
      // Load booking + slot + activity
      const { data: booking } = await supabase
        .from('activity_bookings')
        .select('id, user_id, slot_id, activity_slots:slot_id(activity_id, activities:activity_id(name))')
        .eq('id', bookingId)
        .maybeSingle();

      if (!booking || booking.user_id !== user.id) {
        toast.error('Booking not found');
        navigate('/chat');
        return;
      }
      const slot: any = (booking as any).activity_slots;
      const aId = slot?.activity_id || null;
      setActivityId(aId);
      setActivityName(slot?.activities?.name || 'this activity');

      // Find or create invite
      const { data: existing } = await supabase
        .from('feedback_invites')
        .select('id, status')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (existing?.status === 'responded') {
        setDone(true);
        setLoading(false);
        return;
      }
      setInviteId(existing?.id || null);

      // Load questions: per-activity overrides, else global
      const { data: actQs } = await supabase
        .from('feedback_questions')
        .select('id, question_text, question_type, options, is_required, display_order, is_active')
        .eq('activity_id', aId)
        .eq('is_active', true)
        .order('display_order');
      let qs = (actQs as any[]) || [];
      if (!qs.length) {
        const { data: globalQs } = await supabase
          .from('feedback_questions')
          .select('id, question_text, question_type, options, is_required, display_order, is_active')
          .is('activity_id', null)
          .eq('is_active', true)
          .order('display_order');
        qs = (globalQs as any[]) || [];
      }
      if (cancelled) return;
      setQuestions(qs.map((q) => ({ ...q, options: (q.options as any) || null })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [bookingId, user?.id, navigate]);

  const setAnswer = (qid: string, val: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: val }));

  const submit = async () => {
    if (!user?.id || !bookingId || !activityId) return;

    // Validate required
    for (const q of questions) {
      if (q.is_required && !(answers[q.id] || '').trim()) {
        toast.error(`Please answer: ${q.question_text}`);
        return;
      }
    }

    setSubmitting(true);

    // Ensure invite exists
    let useInviteId = inviteId;
    if (!useInviteId) {
      const { data: created, error } = await supabase
        .from('feedback_invites')
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          slot_id: '', // set below
          activity_id: activityId,
          scheduled_at: new Date().toISOString(),
          status: 'sent',
        })
        .select('id, slot_id')
        .single();
      // We need slot_id — refetch booking quickly
      if (error) {
        // Fallback: refetch slot id and retry
        const { data: b } = await supabase.from('activity_bookings').select('slot_id').eq('id', bookingId).maybeSingle();
        const { data: created2 } = await supabase
          .from('feedback_invites')
          .insert({
            booking_id: bookingId,
            user_id: user.id,
            slot_id: b?.slot_id || activityId,
            activity_id: activityId,
            scheduled_at: new Date().toISOString(),
            status: 'sent',
          })
          .select('id')
          .single();
        useInviteId = created2?.id || null;
      } else {
        useInviteId = created.id;
      }
    }
    if (!useInviteId) {
      toast.error('Could not start feedback');
      setSubmitting(false);
      return;
    }

    const rows = questions
      .filter((q) => (answers[q.id] || '').trim())
      .map((q) => ({
        invite_id: useInviteId!,
        user_id: user.id,
        booking_id: bookingId!,
        activity_id: activityId,
        question_id: q.id,
        question_text_snapshot: q.question_text,
        question_type_snapshot: q.question_type,
        answer_value: answers[q.id].trim(),
      }));

    if (rows.length) {
      const { error } = await supabase.from('feedback_responses').insert(rows);
      if (error) { toast.error('Failed to submit'); setSubmitting(false); return; }
    }

    await supabase
      .from('feedback_invites')
      .update({ status: 'responded', responded_at: new Date().toISOString() })
      .eq('id', useInviteId);

    setSubmitting(false);
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background px-6 pt-14 pb-24 safe-area-top">
        <div className="max-w-md mx-auto text-center mt-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Thank you</h1>
          <p className="text-muted-foreground mb-8">Your feedback helps us host better activities.</p>
          <Button onClick={() => navigate('/chat')} className="w-full">Back to chat</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-14 pb-4 safe-area-top">
        <button onClick={() => navigate(-1)} className="mb-3 text-muted-foreground flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">How was {activityName}?</h1>
        <p className="text-sm text-muted-foreground mt-1">A few quick questions — takes a minute.</p>
      </div>

      <div className="px-6 space-y-6">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No feedback questions configured.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="space-y-2">
              <p className="font-medium text-foreground">
                {q.question_text}
                {q.is_required && <span className="text-destructive ml-1">*</span>}
              </p>
              {q.question_type === 'rating_5' && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const sel = parseInt(answers[q.id] || '0', 10) >= n;
                    return (
                      <button
                        key={n}
                        onClick={() => setAnswer(q.id, String(n))}
                        className="p-1"
                        aria-label={`${n} stars`}
                      >
                        <Star className={`w-8 h-8 ${sel ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
              {q.question_type === 'short_text' && (
                <Input value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
              )}
              {q.question_type === 'long_text' && (
                <Textarea value={answers[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} rows={4} />
              )}
              {q.question_type === 'multiple_choice' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(q.id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        answers[q.id] === opt
                          ? 'bg-primary/10 border-primary text-foreground'
                          : 'bg-card border-border hover:bg-secondary/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {questions.length > 0 && (
          <Button onClick={submit} disabled={submitting} className="w-full h-12">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit feedback'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Feedback;
