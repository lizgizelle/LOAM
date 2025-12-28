import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Pencil, X, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Quiz {
  id: string;
  title: string;
  status: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'scale_1_10';
  options: string[] | null;
  scale_label_low: string | null;
  scale_label_high: string | null;
  display_order: number;
  is_active: boolean;
}

export default function AdminQuizQuestions() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  
  // Form state
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'scale_1_10'>('multiple_choice');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [scaleLabelLow, setScaleLabelLow] = useState('');
  const [scaleLabelHigh, setScaleLabelHigh] = useState('');

  useEffect(() => {
    if (quizId) {
      fetchQuizAndQuestions();
    }
  }, [quizId]);

  const fetchQuizAndQuestions = async () => {
    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', quizId)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      
      setQuestions((questionsData || []).map(q => ({
        ...q,
        question_type: q.question_type as 'multiple_choice' | 'scale_1_10',
        options: q.options as string[] | null
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setQuestionType('multiple_choice');
    setOptions(['', '']);
    setScaleLabelLow('');
    setScaleLabelHigh('');
    setEditingQuestion(null);
    setShowForm(false);
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setOptions(question.options || ['', '']);
    setScaleLabelLow(question.scale_label_low || '');
    setScaleLabelHigh(question.scale_label_high || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionType === 'multiple_choice') {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error('At least 2 options are required');
        return;
      }
    }

    try {
      const questionData = {
        survey_id: quizId,
        question_text: questionText.trim(),
        question_type: questionType,
        options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : null,
        scale_label_low: questionType === 'scale_1_10' ? scaleLabelLow.trim() || null : null,
        scale_label_high: questionType === 'scale_1_10' ? scaleLabelHigh.trim() || null : null,
        display_order: editingQuestion ? editingQuestion.display_order : questions.length + 1,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from('survey_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast.success('Question updated');
      } else {
        const { error } = await supabase
          .from('survey_questions')
          .insert(questionData);

        if (error) throw error;
        toast.success('Question added');
      }

      resetForm();
      fetchQuizAndQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error('Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Question deleted');
      fetchQuizAndQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  if (!quiz) {
    return (
      <AdminLayout>
        <div className="text-center py-8 text-muted-foreground">Quiz not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/quiz-builder')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{quiz.title}</h1>
              <Badge 
                className={
                  quiz.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : quiz.status === 'draft'
                    ? ''
                    : 'text-muted-foreground'
                }
                variant={quiz.status === 'draft' ? 'secondary' : quiz.status === 'archived' ? 'outline' : 'default'}
              >
                {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Manage questions for this quiz</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="questionText">Question Text</Label>
                <Input
                  id="questionText"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter your question..."
                />
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={(v) => setQuestionType(v as 'multiple_choice' | 'scale_1_10')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="scale_1_10">Scale 1–10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {questionType === 'multiple_choice' && (
                <div className="space-y-3">
                  <Label>Options (minimum 2)</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

              {questionType === 'scale_1_10' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scaleLow">Label for 1 (above)</Label>
                    <Input
                      id="scaleLow"
                      value={scaleLabelLow}
                      onChange={(e) => setScaleLabelLow(e.target.value)}
                      placeholder="e.g., Rarely"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scaleHigh">Label for 10 (below)</Label>
                    <Input
                      id="scaleHigh"
                      value={scaleLabelHigh}
                      onChange={(e) => setScaleLabelHigh(e.target.value)}
                      placeholder="e.g., Very often"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  {editingQuestion ? 'Update Question' : 'Save Question'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No questions yet. Add your first question above.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-center gap-3 p-4 border rounded-lg bg-card"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{question.question_text}</p>
                      <p className="text-sm text-muted-foreground">
                        {question.question_type === 'multiple_choice' 
                          ? `Multiple choice · ${(question.options || []).length} options`
                          : `Scale 1–10 · ${question.scale_label_low || 'No label'} → ${question.scale_label_high || 'No label'}`
                        }
                      </p>
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
