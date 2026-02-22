import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, GripVertical, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id?: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  options: string[];
  display_order: number;
}

export default function AdminEventQuestions() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [{ data: event }, { data: qs }] = await Promise.all([
        supabase.from('events').select('name').eq('id', eventId!).maybeSingle(),
        supabase.from('event_registration_questions').select('*').eq('event_id', eventId!).order('display_order'),
      ]);

      setEventName(event?.name || '');
      setQuestions(
        (qs || []).map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          display_order: q.display_order,
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        question_text: '',
        question_type: 'text',
        is_required: false,
        options: [],
        display_order: prev.length,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  const addOption = (index: number) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, options: [...q.options, ''] } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q
      )
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q
      )
    );
  };

  const handleSave = async () => {
    if (questions.some(q => !q.question_text.trim())) {
      toast.error('All questions must have text');
      return;
    }

    setSaving(true);
    try {
      // Delete existing questions for this event
      await supabase.from('event_registration_questions').delete().eq('event_id', eventId!);

      // Insert new ones
      if (questions.length > 0) {
        const rows = questions.map((q, i) => ({
          event_id: eventId!,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          options: q.options.length > 0 ? q.options : null,
          display_order: i,
        }));

        const { error } = await supabase.from('event_registration_questions').insert(rows);
        if (error) throw error;
      }

      toast.success('Questions saved');
      navigate(`/admin/events/${eventId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/events/${eventId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Registration Questions</h1>
            <p className="text-muted-foreground mt-1">{eventName}</p>
          </div>
        </div>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No registration questions yet. Users will register without additional questions.</p>
              <Button onClick={addQuestion} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Question {index + 1}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Input
                      value={q.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      placeholder="e.g., What are you hoping to get from this event?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={q.question_type}
                        onValueChange={(v) => updateQuestion(index, 'question_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkboxes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={q.is_required}
                          onCheckedChange={(v) => updateQuestion(index, 'is_required', v)}
                        />
                        <Label className="text-sm font-normal">Required</Label>
                      </div>
                    </div>
                  </div>

                  {(q.question_type === 'select' || q.question_type === 'checkbox') && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(index, oIdx, e.target.value)}
                            placeholder={`Option ${oIdx + 1}`}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeOption(index, oIdx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addOption(index)} className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={addQuestion} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => navigate(`/admin/events/${eventId}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Questions'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
