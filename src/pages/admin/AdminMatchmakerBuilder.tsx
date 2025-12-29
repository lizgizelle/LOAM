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

interface MatchmakerSet {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export default function AdminMatchmakerBuilder() {
  const navigate = useNavigate();
  const [sets, setSets] = useState<MatchmakerSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSet, setEditingSet] = useState<MatchmakerSet | null>(null);
  
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      const { data, error } = await supabase
        .from('matchmaker_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSets((data || []).map(s => ({
        ...s,
        status: s.status as 'draft' | 'active' | 'archived'
      })));
    } catch (error) {
      console.error('Error fetching matchmaker sets:', error);
      toast.error('Failed to load matchmaker sets');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTitle = () => format(new Date(), 'dd/MM/yyyy');

  const resetForm = () => {
    setTitle('');
    setStatus('draft');
    setEditingSet(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setTitle(getDefaultTitle());
    setStatus('draft');
    setEditingSet(null);
    setShowForm(true);
  };

  const handleEdit = (set: MatchmakerSet) => {
    setEditingSet(set);
    setTitle(set.title);
    setStatus(set.status);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      if (status === 'active') {
        const { error: archiveError } = await supabase
          .from('matchmaker_sets')
          .update({ status: 'archived' })
          .neq('id', editingSet?.id || '')
          .eq('status', 'active');
        
        if (archiveError) throw archiveError;
      }

      if (editingSet) {
        const { error } = await supabase
          .from('matchmaker_sets')
          .update({ title: title.trim(), status })
          .eq('id', editingSet.id);

        if (error) throw error;
        toast.success('Matchmaker set updated');
      } else {
        const { error } = await supabase
          .from('matchmaker_sets')
          .insert({ title: title.trim(), status });

        if (error) throw error;
        toast.success('Matchmaker set created');
      }

      resetForm();
      fetchSets();
    } catch (error) {
      console.error('Error saving matchmaker set:', error);
      toast.error('Failed to save matchmaker set');
    }
  };

  const handleDuplicate = async (set: MatchmakerSet) => {
    try {
      const { data: newSet, error: setError } = await supabase
        .from('matchmaker_sets')
        .insert({ title: `${set.title} (Copy)`, status: 'draft' })
        .select()
        .single();

      if (setError) throw setError;

      const { data: questions, error: questionsError } = await supabase
        .from('matchmaker_questions')
        .select('*')
        .eq('set_id', set.id);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          set_id: newSet.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          scale_label_low: q.scale_label_low,
          scale_label_high: q.scale_label_high,
          display_order: q.display_order,
          is_active: q.is_active,
        }));

        await supabase.from('matchmaker_questions').insert(newQuestions);
      }

      toast.success('Matchmaker set duplicated');
      fetchSets();
    } catch (error) {
      console.error('Error duplicating set:', error);
      toast.error('Failed to duplicate set');
    }
  };

  const handleArchive = async (set: MatchmakerSet) => {
    try {
      const { error } = await supabase
        .from('matchmaker_sets')
        .update({ status: 'archived' })
        .eq('id', set.id);

      if (error) throw error;
      toast.success('Matchmaker set archived');
      fetchSets();
    } catch (error) {
      console.error('Error archiving set:', error);
      toast.error('Failed to archive set');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('This will remove the matchmaker set and its questions. Past responses remain stored for export. Continue?')) return;

    try {
      await supabase
        .from('matchmaker_questions')
        .delete()
        .eq('set_id', id);

      const { error } = await supabase
        .from('matchmaker_sets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Matchmaker set deleted');
      fetchSets();
    } catch (error) {
      console.error('Error deleting set:', error);
      toast.error('Failed to delete set');
    }
  };

  const getStatusBadge = (setStatus: string) => {
    switch (setStatus) {
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
            <h1 className="text-2xl font-semibold">Matchmaker Builder</h1>
            <p className="text-muted-foreground mt-1">Manage matchmaker question sets</p>
          </div>
          {!showForm && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Set
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingSet ? 'Edit Matchmaker Set' : 'Create New Matchmaker Set'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
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
                    Only one matchmaker set can be active at a time.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave}>
                  {editingSet ? 'Update Set' : 'Create Set'}
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
            <CardTitle>Matchmaker Sets ({sets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No matchmaker sets yet. Create your first set above.
              </div>
            ) : (
              <div className="space-y-3">
                {sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button 
                          onClick={() => navigate(`/admin/matchmaker-builder/${set.id}`)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {set.title}
                        </button>
                        {getStatusBadge(set.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(set.created_at), 'PP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/admin/matchmaker-builder/${set.id}`)}
                      >
                        Manage Questions
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(set)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(set)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {set.status !== 'archived' && (
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(set)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(set.id)}>
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
