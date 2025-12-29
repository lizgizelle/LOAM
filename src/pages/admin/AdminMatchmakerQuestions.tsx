import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'scale' | 'free_text';
  options: string[] | null;
  scale_label_low: string | null;
  scale_label_high: string | null;
  display_order: number;
  is_active: boolean;
}

interface MatchmakerSet {
  id: string;
  title: string;
  status: string;
}

export default function AdminMatchmakerQuestions() {
  const { setId } = useParams();
  const navigate = useNavigate();
  
  const [matchmakerSet, setMatchmakerSet] = useState<MatchmakerSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'scale' | 'free_text'>('multiple_choice');
  const [options, setOptions] = useState<string[]>(['']);
  const [scaleLabelLow, setScaleLabelLow] = useState('');
  const [scaleLabelHigh, setScaleLabelHigh] = useState('');

  useEffect(() => {
    if (setId) {
      fetchData();
    }
  }, [setId]);

  const fetchData = async () => {
    try {
      const { data: setData, error: setError } = await supabase
        .from('matchmaker_sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (setError) throw setError;
      setMatchmakerSet(setData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('matchmaker_questions')
        .select('*')
        .eq('set_id', setId)
        .order('display_order');

      if (questionsError) throw questionsError;

      const parsedQuestions: Question[] = (questionsData || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as 'multiple_choice' | 'scale' | 'free_text',
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
        scale_label_low: q.scale_label_low,
        scale_label_high: q.scale_label_high,
        display_order: q.display_order,
        is_active: q.is_active,
      }));

      setQuestions(parsedQuestions);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setQuestionType('multiple_choice');
    setOptions(['']);
    setScaleLabelLow('');
    setScaleLabelHigh('');
    setEditingQuestion(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setOptions(question.options || ['']);
    setScaleLabelLow(question.scale_label_low || '');
    setScaleLabelHigh(question.scale_label_high || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionType === 'multiple_choice' && options.filter(o => o.trim()).length < 2) {
      toast.error('At least 2 options are required');
      return;
    }

    try {
      const questionData: any = {
        set_id: setId,
        question_text: questionText.trim(),
        question_type: questionType,
        options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : null,
        scale_label_low: questionType === 'scale' ? scaleLabelLow.trim() || null : null,
        scale_label_high: questionType === 'scale' ? scaleLabelHigh.trim() || null : null,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('matchmaker_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Question updated');
      } else {
        questionData.display_order = questions.length + 1;
        const { error } = await supabase
          .from('matchmaker_questions')
          .insert(questionData);

        if (error) throw error;
        toast.success('Question added');
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      const { error } = await supabase
        .from('matchmaker_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Question deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleReorder = async (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const updatedQuestions = [...questions];
    [updatedQuestions[index], updatedQuestions[newIndex]] = [updatedQuestions[newIndex], updatedQuestions[index]];

    try {
      for (let i = 0; i < updatedQuestions.length; i++) {
        await supabase
          .from('matchmaker_questions')
          .update({ display_order: i + 1 })
          .eq('id', updatedQuestions[i].id);
      }
      fetchData();
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to reorder');
    }
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return <Badge variant="secondary">Multiple Choice</Badge>;
      case 'scale':
        return <Badge variant="outline">Scale 1-10</Badge>;
      case 'free_text':
        return <Badge variant="outline">Free Text</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/matchmaker-builder')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{matchmakerSet?.title || 'Questions'}</h1>
            <p className="text-muted-foreground mt-1">Manage questions for this matchmaker set</p>
          </div>
          {!showForm && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter your question"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={(v) => setQuestionType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="scale">Scale 1-10</SelectItem>
                    <SelectItem value="free_text">Free Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {questionType === 'multiple_choice' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {options.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}

              {questionType === 'scale' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Label for 1 (above "1")</Label>
                    <Input
                      value={scaleLabelLow}
                      onChange={(e) => setScaleLabelLow(e.target.value)}
                      placeholder="e.g., Not at all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label for 10 (below "10")</Label>
                    <Input
                      value={scaleLabelHigh}
                      onChange={(e) => setScaleLabelHigh(e.target.value)}
                      placeholder="e.g., Very much"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions yet. Add your first question above.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => handleReorder(question.id, 'up')}
                        className="h-7 w-7"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === questions.length - 1}
                        onClick={() => handleReorder(question.id, 'down')}
                        className="h-7 w-7"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                        {getTypeBadge(question.question_type)}
                      </div>
                      <p className="font-medium text-foreground">{question.question_text}</p>
                      {question.question_type === 'multiple_choice' && question.options && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(question.options as string[]).map((opt, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      {question.question_type === 'scale' && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {question.scale_label_low || '1'} → {question.scale_label_high || '10'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(question)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
