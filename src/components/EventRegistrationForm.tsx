import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
}

const EventRegistrationForm = ({ eventId, userId, onSubmit, onCancel, isSubmitting }: EventRegistrationFormProps) => {
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

    onSubmit(answers);
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

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Registration'}
        </Button>
      </div>
    </form>
  );
};

export default EventRegistrationForm;
