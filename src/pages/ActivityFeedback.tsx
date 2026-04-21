import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const ActivityFeedback = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activityName, setActivityName] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;

      // Already submitted?
      const { data: existing } = await supabase
        .from('activity_feedback')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existing) {
        setDone(true);
      }

      const { data: booking } = await supabase
        .from('activity_bookings')
        .select('slot_id, activity_slots(activity_id, activities(name))')
        .eq('id', bookingId)
        .maybeSingle();

      const name = (booking as any)?.activity_slots?.activities?.name || 'Activity';
      setActivityName(name);
      setLoading(false);
    };
    load();
  }, [bookingId]);

  const handleSubmit = async () => {
    if (!bookingId || !user?.id) return;
    if (rating === 0) {
      toast.error('Please pick a rating');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('activity_feedback').insert({
      booking_id: bookingId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-6 pt-14 pb-4 safe-area-top flex items-center justify-center relative">
          <button onClick={() => navigate('/my-events')} className="absolute left-4 p-2 rounded-full hover:bg-secondary/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">Thank you for sharing.</h2>
          <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
            Your feedback helps us shape better experiences for everyone in this community.
          </p>
          <button
            onClick={() => navigate('/my-events')}
            className="px-6 h-12 rounded-full bg-foreground text-background font-semibold text-sm"
          >
            Back to My Activities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-14 pb-4 safe-area-top flex items-center justify-center relative">
        <button onClick={() => navigate(-1)} className="absolute left-4 p-2 rounded-full hover:bg-secondary/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-foreground">Feedback</h2>
      </div>

      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">How was {activityName}?</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your honest feedback helps us host better activities and care for this community well.
        </p>
      </div>

      {/* Star rating */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-10 h-10 ${active ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            {['', 'Not great', 'Could be better', 'It was okay', 'Really enjoyed it', 'Loved it'][rating]}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="px-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Anything you'd like to share? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What stood out, what could be better, or anything on your mind..."
          rows={6}
          className="resize-none"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background safe-area-bottom">
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full h-14 rounded-full bg-foreground text-background font-semibold text-base disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send feedback'}
        </button>
      </div>
    </div>
  );
};

export default ActivityFeedback;
