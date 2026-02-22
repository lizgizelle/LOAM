import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { CreditCard } from 'lucide-react';

interface RegistrationQuestion {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  options: Json | null;
  display_order: number;
}

interface EventRegistrationFormProps {
  eventId: string;
  userId: string;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isPaid?: boolean;
  requiresApproval?: boolean;
  ticketPrice?: number;
  currency?: string;
}

const EventRegistrationForm = ({ eventId, userId, onSubmit, onCancel, isSubmitting, isPaid = false, requiresApproval = false, ticketPrice = 0, currency = 'MYR' }: EventRegistrationFormProps) => {
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(!requiresApproval);

  useEffect(() => {
    fetchQuestions();
  }, [eventId]);

  const fetchQuestions = async () => {
    try {
      const { data } = await supabase
        .from('event_registration_questions')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required
    for (const q of questions) {
      if (q.is_required && !answers[q.id]?.trim()) {
        return;
      }
    }

    if (requiresApproval && !agreedToTerms) return;

    onSubmit(answers);
  };

  const getSubmitText = () => {
    if (isSubmitting) return isPaid ? 'Redirecting to payment...' : 'Submitting...';
    if (isPaid && requiresApproval) return 'Request to Join';
    if (isPaid) return 'Proceed to Payment';
    return 'Submit Registration';
  };

  const getOptions = (options: Json | null): string[] => {
    if (Array.isArray(options)) return options.map(String);
    return [];
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Loading questions...</div>;
  }

  // No questions configured – just confirm
  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-center">Ready to register for this event?</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => onSubmit({})} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Confirm'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {q.question_text}
            {q.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {q.question_type === 'text' && (
            <Input
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              required={q.is_required}
              placeholder="Your answer"
            />
          )}

          {q.question_type === 'textarea' && (
            <Textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              required={q.is_required}
              placeholder="Your answer"
              rows={3}
            />
          )}

          {q.question_type === 'select' && (
            <Select
              value={answers[q.id] || ''}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {getOptions(q.options).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {q.question_type === 'checkbox' && (
            <div className="space-y-2">
              {getOptions(q.options).map((opt) => {
                const currentValues = answers[q.id] ? answers[q.id].split('|||') : [];
                const isChecked = currentValues.includes(opt);
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, opt]
                          : currentValues.filter(v => v !== opt);
                        setAnswers(prev => ({ ...prev, [q.id]: newValues.join('|||') }));
                      }}
                    />
                    <span className="text-sm text-foreground">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Approval disclaimer */}
      {requiresApproval && (
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This event has extremely limited spots and operates on an approval-only basis.
            {isPaid && ' Your card will be authorized at checkout, but your ticket is not confirmed until your registration is approved. Approvals are reviewed, and spots are secured as they are confirmed. If your registration is not approved, your payment will be automatically refunded to your original method.'}
            {' '}You'll receive confirmation via email once approved.
            {(isPaid || requiresApproval) && ' *'}
          </p>
        </div>
      )}

      {/* Inline payment section for paid events */}
      {isPaid && (
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-bold text-foreground">Payment</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Credit or Debit Card <span className="text-destructive">*</span>
            </Label>
            <div className="relative flex items-center h-14 rounded-xl border-2 border-border bg-popover px-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:border-primary">
              <CreditCard className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Card number"
                className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground outline-none"
                disabled
              />
              <span className="text-muted-foreground text-sm font-medium ml-3 shrink-0">MM / YY</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground"
          disabled={isSubmitting || (requiresApproval && !agreedToTerms)}
        >
          {getSubmitText()}
        </Button>

        <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>

        {/* Disclaimer text */}
        {isPaid && requiresApproval && (
          <p className="text-xs text-muted-foreground text-center">
            You will not be charged until your registration is approved.
          </p>
        )}
        {isPaid && !requiresApproval && (
          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to a secure payment page.
          </p>
        )}
      </div>
    </form>
  );
};

export default EventRegistrationForm;
