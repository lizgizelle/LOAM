import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Star, Type, AlignLeft, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type QType = 'rating_5' | 'short_text' | 'long_text' | 'multiple_choice';

interface Question {
  id: string;
  activity_id: string | null;
  question_text: string;
  question_type: QType;
  options: string[] | null;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

interface Activity { id: string; name: string; }

interface ResponseRow {
  id: string;
  user_id: string;
  activity_id: string;
  question_text_snapshot: string;
  question_type_snapshot: string;
  answer_value: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  activity_name?: string | null;
}

const TYPE_LABELS: Record<QType, string> = {
  rating_5: '★ 1–5 rating',
  short_text: 'Short text',
  long_text: 'Long text',
  multiple_choice: 'Multiple choice',
};
const TYPE_ICONS: Record<QType, any> = {
  rating_5: Star, short_text: Type, long_text: AlignLeft, multiple_choice: ListChecks,
};

export default function AdminFeedback() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<string>('global'); // 'global' or activity_id
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [view, setView] = useState<'questions' | 'responses'>('questions');

  // New question form
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<QType>('rating_5');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  useEffect(() => {
    supabase.from('activities').select('id, name').eq('is_active', true).order('display_order')
      .then(({ data }) => setActivities((data as any) || []));
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const filter = activeTab === 'global' ? null : activeTab;
    let query = supabase.from('feedback_questions').select('*').order('display_order', { ascending: true });
    if (filter === null) query = query.is('activity_id', null);
    else query = query.eq('activity_id', filter);
    const { data } = await query;
    setQuestions(((data as any) || []).map((q: any) => ({
      ...q,
      options: q.options as string[] | null,
    })));
    setLoading(false);
  }, [activeTab]);

  const loadResponses = useCallback(async () => {
    setLoadingResponses(true);
    const { data } = await supabase
      .from('feedback_responses')
      .select('id, user_id, activity_id, question_text_snapshot, question_type_snapshot, answer_value, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = (data as any[]) || [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const actIds = Array.from(new Set(rows.map((r) => r.activity_id)));
    const [{ data: profiles }, { data: acts }] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      actIds.length
        ? supabase.from('activities').select('id, name').in('id', actIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pmap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { pmap[p.id] = p; });
    const amap: Record<string, string> = {};
    (acts || []).forEach((a: any) => { amap[a.id] = a.name; });

    setResponses(rows.map((r) => ({
      ...r,
      first_name: pmap[r.user_id]?.first_name,
      last_name: pmap[r.user_id]?.last_name,
      activity_name: amap[r.activity_id],
    })));
    setLoadingResponses(false);
  }, []);

  useEffect(() => { if (view === 'questions') loadQuestions(); }, [loadQuestions, view]);
  useEffect(() => { if (view === 'responses') loadResponses(); }, [loadResponses, view]);

  const addQuestion = async () => {
    if (!newText.trim()) { toast.error('Question text is required'); return; }
    const opts = newType === 'multiple_choice'
      ? newOptions.split('\n').map((s) => s.trim()).filter(Boolean)
      : null;
    if (newType === 'multiple_choice' && (!opts || opts.length < 2)) {
      toast.error('Add at least 2 options (one per line)');
      return;
    }
    const { error } = await supabase.from('feedback_questions').insert({
      activity_id: activeTab === 'global' ? null : activeTab,
      question_text: newText.trim(),
      question_type: newType,
      options: opts as any,
      display_order: questions.length,
      is_required: newRequired,
    });
    if (error) { toast.error('Failed to add'); return; }
    toast.success('Question added');
    setNewText(''); setNewOptions(''); setNewRequired(false);
    loadQuestions();
  };

  const removeQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('feedback_questions').delete().eq('id', id);
    if (error) { toast.error('Failed'); return; }
    loadQuestions();
  };

  const toggleActive = async (q: Question) => {
    await supabase.from('feedback_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    loadQuestions();
  };

  const move = async (q: Question, dir: -1 | 1) => {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swap = questions[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('feedback_questions').update({ display_order: swap.display_order }).eq('id', q.id),
      supabase.from('feedback_questions').update({ display_order: q.display_order }).eq('id', swap.id),
    ]);
    loadQuestions();
  };

  const tabActivityName = activeTab === 'global'
    ? 'Global default'
    : activities.find((a) => a.id === activeTab)?.name || 'Activity';

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Feedback</h1>
          <p className="text-muted-foreground text-sm">
            Configure post-activity questions and review user responses. Invites are sent on WhatsApp 3 hours after each activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'questions' ? 'default' : 'outline'} size="sm" onClick={() => setView('questions')}>Questions</Button>
          <Button variant={view === 'responses' ? 'default' : 'outline'} size="sm" onClick={() => setView('responses')}>Responses</Button>
        </div>
      </div>

      {view === 'questions' ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="global">Global default</TabsTrigger>
              {activities.map((a) => (
                <TabsTrigger key={a.id} value={a.id}>{a.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Add a question to: {tabActivityName}</CardTitle>
              <CardDescription>
                {activeTab === 'global'
                  ? 'These appear for any activity that does not have its own questions.'
                  : 'These override the global default for this activity.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Question</Label>
                  <Input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="e.g. How welcomed did you feel?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as QType)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {newType === 'multiple_choice' && (
                <div className="space-y-1.5">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder={'Yes\nMaybe\nNo'}
                    rows={3}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="required" checked={newRequired} onCheckedChange={setNewRequired} />
                  <Label htmlFor="required" className="cursor-pointer">Required</Label>
                </div>
                <Button onClick={addQuestion} className="gap-2"><Plus className="w-4 h-4" />Add question</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-10">
                No questions yet for {tabActivityName.toLowerCase()}.
              </p>
            ) : (
              questions.map((q, i) => {
                const Icon = TYPE_ICONS[q.question_type];
                return (
                  <div key={q.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{q.question_text}</p>
                        {q.is_required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                        {!q.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[q.question_type]}</p>
                      {q.question_type === 'multiple_choice' && q.options && (
                        <p className="text-xs text-muted-foreground mt-1">Options: {q.options.join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(q, -1)}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={i === questions.length - 1} onClick={() => move(q, 1)}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <div className="px-1">
                        <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All responses</CardTitle>
            <CardDescription>{responses.length} answers logged</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingResponses ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : responses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">No responses yet.</p>
            ) : (
              <div className="space-y-3">
                {responses.map((r) => (
                  <div key={r.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium">
                        {r.first_name || 'User'} {r.last_name || ''} <span className="text-muted-foreground font-normal">· {r.activity_name || '—'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'd MMM, h:mma')}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Q: {r.question_text_snapshot}</p>
                    <p className="text-sm font-medium mt-0.5">
                      A: {r.question_type_snapshot === 'rating_5' ? `${r.answer_value}/5 ★` : r.answer_value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
