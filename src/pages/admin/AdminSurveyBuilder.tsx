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

interface Survey {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export default function AdminSurveyBuilder() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSurveys((data || []).map(s => ({
        ...s,
        status: s.status as 'draft' | 'active' | 'archived'
      })));
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setStatus('draft');
    setEditingSurvey(null);
    setShowForm(false);
  };

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey);
    setTitle(survey.title);
    setStatus(survey.status);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Survey title is required');
      return;
    }

    try {
      // If setting to active, archive the current active survey first
      if (status === 'active') {
        const currentActive = surveys.find(s => s.status === 'active' && s.id !== editingSurvey?.id);
        if (currentActive) {
          await supabase
            .from('surveys')
            .update({ status: 'archived' })
            .eq('id', currentActive.id);
        }
      }

      if (editingSurvey) {
        const { error } = await supabase
          .from('surveys')
          .update({ title: title.trim(), status })
          .eq('id', editingSurvey.id);

        if (error) throw error;
        toast.success('Survey updated');
      } else {
        const { error } = await supabase
          .from('surveys')
          .insert({ title: title.trim(), status });

        if (error) throw error;
        toast.success('Survey created');
      }

      resetForm();
      fetchSurveys();
    } catch (error) {
      console.error('Error saving survey:', error);
      toast.error('Failed to save survey');
    }
  };

  const handleDuplicate = async (survey: Survey) => {
    try {
      // Create new survey
      const { data: newSurvey, error: surveyError } = await supabase
        .from('surveys')
        .insert({ title: `${survey.title} (Copy)`, status: 'draft' })
        .select()
        .single();

      if (surveyError) throw surveyError;

      // Copy questions
      const { data: questions, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', survey.id);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          survey_id: newSurvey.id,
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

      toast.success('Survey duplicated');
      fetchSurveys();
    } catch (error) {
      console.error('Error duplicating survey:', error);
      toast.error('Failed to duplicate survey');
    }
  };

  const handleArchive = async (survey: Survey) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: 'archived' })
        .eq('id', survey.id);

      if (error) throw error;
      toast.success('Survey archived');
      fetchSurveys();
    } catch (error) {
      console.error('Error archiving survey:', error);
      toast.error('Failed to archive survey');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey and all its questions?')) return;

    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Survey deleted');
      fetchSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast.error('Failed to delete survey');
    }
  };

  const getStatusBadge = (surveyStatus: string) => {
    switch (surveyStatus) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
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
            <h1 className="text-2xl font-semibold">Survey Builder</h1>
            <p className="text-muted-foreground mt-1">Manage survey sets and questions</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Survey
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingSurvey ? 'Edit Survey' : 'Create New Survey'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Survey Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="January Survey"
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
                <p className="text-xs text-muted-foreground">
                  Only one survey can be active at a time. Setting this to Active will archive the current active survey.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  {editingSurvey ? 'Update Survey' : 'Create Survey'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Surveys List */}
        <Card>
          <CardHeader>
            <CardTitle>Survey Sets ({surveys.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No surveys yet. Create your first survey above.
              </div>
            ) : (
              <div className="space-y-3">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button 
                          onClick={() => navigate(`/admin/survey-builder/${survey.id}`)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {survey.title}
                        </button>
                        {getStatusBadge(survey.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(survey.created_at), 'PP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/admin/survey-builder/${survey.id}`)}
                      >
                        Manage Questions
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(survey)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(survey)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {survey.status !== 'archived' && (
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(survey)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(survey.id)}>
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
