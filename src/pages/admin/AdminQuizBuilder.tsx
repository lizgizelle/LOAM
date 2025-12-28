import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Copy, Archive, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Quiz {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export default function AdminQuizBuilder() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setQuizzes((data || []).map(s => ({
        ...s,
        status: s.status as 'draft' | 'active' | 'archived'
      })));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTitle = () => {
    return format(new Date(), 'dd/MM/yyyy');
  };

  const resetForm = () => {
    setTitle('');
    setStatus('draft');
    setEditingQuiz(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setTitle(getDefaultTitle());
    setStatus('draft');
    setEditingQuiz(null);
    setShowForm(true);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setStatus(quiz.status);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Quiz title is required');
      return;
    }

    try {
      // If setting to active, archive ALL other quizzes first (enforce single active rule)
      if (status === 'active') {
        const { error: archiveError } = await supabase
          .from('surveys')
          .update({ status: 'archived' })
          .neq('id', editingQuiz?.id || '')
          .eq('status', 'active');
        
        if (archiveError) throw archiveError;
      }

      if (editingQuiz) {
        const { error } = await supabase
          .from('surveys')
          .update({ title: title.trim(), status })
          .eq('id', editingQuiz.id);

        if (error) throw error;
        toast.success('Quiz updated');
      } else {
        const { error } = await supabase
          .from('surveys')
          .insert({ title: title.trim(), status });

        if (error) throw error;
        toast.success('Quiz created');
      }

      resetForm();
      fetchQuizzes();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    }
  };

  const handleDuplicate = async (quiz: Quiz) => {
    try {
      // Create new quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from('surveys')
        .insert({ title: `${quiz.title} (Copy)`, status: 'draft' })
        .select()
        .single();

      if (quizError) throw quizError;

      // Copy questions
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', quiz.id);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          survey_id: newQuiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          scale_label_low: q.scale_label_low,
          scale_label_high: q.scale_label_high,
          display_order: q.display_order,
          is_active: q.is_active,
        }));

        await supabase.from('survey_questions').insert(newQuestions);
      }

      toast.success('Quiz duplicated');
      fetchQuizzes();
    } catch (error) {
      console.error('Error duplicating quiz:', error);
      toast.error('Failed to duplicate quiz');
    }
  };

  const handleArchive = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: 'archived' })
        .eq('id', quiz.id);

      if (error) throw error;
      toast.success('Quiz archived');
      fetchQuizzes();
    } catch (error) {
      console.error('Error archiving quiz:', error);
      toast.error('Failed to archive quiz');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz and all its questions?')) return;

    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Quiz deleted');
      fetchQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const getStatusBadge = (quizStatus: string, isActiveQuiz: boolean) => {
    switch (quizStatus) {
      case 'active':
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-600 border-0">
            ● Active
          </Badge>
        );
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Quiz Builder</h1>
            <p className="text-muted-foreground mt-1">Manage quiz sets and questions</p>
          </div>
          {!showForm && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Quiz
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="January Quiz"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active' | 'archived')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active (users will see this)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {status === 'active' && (
                  <p className="text-xs text-amber-600">
                    Only one quiz can be active at a time. Activating this quiz will deactivate all others.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quizzes List */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Sets ({quizzes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quizzes yet. Create your first quiz above.
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button 
                          onClick={() => navigate(`/admin/quiz-builder/${quiz.id}`)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {quiz.title}
                        </button>
                        {getStatusBadge(quiz.status, quiz.status === 'active')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(quiz.created_at), 'PP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/admin/quiz-builder/${quiz.id}`)}
                      >
                        Manage Questions
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(quiz)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(quiz)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {quiz.status !== 'archived' && (
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(quiz)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(quiz.id)}>
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
