import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, Check, X, FileDown, Flag, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Bucket {
  id: string;
  name: string;
  display_order: number;
  questionCount?: number;
  userCount?: number;
}

interface GameQuestion {
  id: string;
  bucket_id: string;
  question_text: string;
  is_active: boolean;
}

interface BucketRule {
  id: string;
  bucket_id: string;
  survey_question_id: string;
  answer_value: string;
}

interface SurveyQuestion {
  id: string;
  question_text: string;
  options: string[] | null;
  survey_id: string;
}

interface AccessCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface Unlock {
  user_id: string;
  unlocked_at: string;
  email?: string;
  first_name?: string;
}

interface RatingRow {
  question_text: string;
  bucket_name: string;
  avg_rating: number;
  total_ratings: number;
  question_id: string;
  is_active: boolean;
}

export default function AdminGame() {
  const [activeTab, setActiveTab] = useState('buckets');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Game</h1>
          <p className="text-muted-foreground mt-1">Manage flashcard questions, buckets, and access</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="buckets">Buckets</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>

          <TabsContent value="buckets"><BucketsSection /></TabsContent>
          <TabsContent value="rules"><RulesSection /></TabsContent>
          <TabsContent value="access"><AccessSection /></TabsContent>
          <TabsContent value="ratings"><RatingsSection /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ========== BUCKETS SECTION ==========
function BucketsSection() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBucketName, setNewBucketName] = useState('');

  // Questions per bucket
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => { fetchBuckets(); }, []);
  useEffect(() => { if (selectedBucket) fetchQuestions(selectedBucket); }, [selectedBucket]);

  const fetchBuckets = async () => {
    const { data: bucketsData } = await supabase
      .from('game_buckets')
      .select('*')
      .order('display_order');

    if (bucketsData) {
      // Get counts
      const enriched: Bucket[] = [];
      for (const b of bucketsData) {
        const { count: qCount } = await supabase
          .from('game_questions')
          .select('*', { count: 'exact', head: true })
          .eq('bucket_id', b.id);
        const { count: uCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('game_bucket_id', b.id);
        enriched.push({ ...b, questionCount: qCount || 0, userCount: uCount || 0 });
      }
      setBuckets(enriched);
      if (!selectedBucket && enriched.length > 0) {
        setSelectedBucket(enriched[0].id);
      }
    }
    setLoading(false);
  };

  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editBucketName, setEditBucketName] = useState('');

  const addBucket = async () => {
    if (!newBucketName.trim()) return;
    const { error } = await supabase
      .from('game_buckets')
      .insert({ name: newBucketName.trim(), display_order: buckets.length });
    if (error) { toast.error('Failed to create bucket'); return; }
    setNewBucketName('');
    toast.success('Bucket created');
    fetchBuckets();
  };

  const deleteBucket = async (id: string) => {
    if (!confirm('Delete this bucket and all its questions?')) return;
    await supabase.from('game_buckets').delete().eq('id', id);
    if (selectedBucket === id) setSelectedBucket(null);
    toast.success('Bucket deleted');
    fetchBuckets();
  };

  const fetchQuestions = async (bucketId: string) => {
    const { data } = await supabase
      .from('game_questions')
      .select('*')
      .eq('bucket_id', bucketId)
      .order('created_at', { ascending: true });
    setQuestions(data || []);
  };

  const addQuestion = async () => {
    if (!newQuestion.trim() || !selectedBucket) return;
    const { error } = await supabase
      .from('game_questions')
      .insert({ bucket_id: selectedBucket, question_text: newQuestion.trim() });
    if (error) { toast.error('Failed to add question'); return; }
    setNewQuestion('');
    fetchQuestions(selectedBucket);
    fetchBuckets();
  };

  const updateQuestion = async (id: string) => {
    if (!editText.trim()) return;
    await supabase.from('game_questions').update({ question_text: editText.trim() }).eq('id', id);
    setEditingId(null);
    if (selectedBucket) fetchQuestions(selectedBucket);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('game_questions').delete().eq('id', id);
    if (selectedBucket) fetchQuestions(selectedBucket);
    fetchBuckets();
    toast.success('Question deleted');
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 mt-4">
      {/* Create bucket */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Bucket 1 — Introverts"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBucket()}
            />
            <Button onClick={addBucket} disabled={!newBucketName.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bucket list */}
      <Card>
        <CardHeader>
          <CardTitle>Buckets ({buckets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No buckets yet</p>
          ) : (
            <div className="space-y-2">
              {buckets.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBucket(b.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer ${
                    selectedBucket === b.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {editingBucketId === b.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editBucketName}
                          onChange={(e) => setEditBucketName(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && editBucketName.trim()) {
                              await supabase.from('game_buckets').update({ name: editBucketName.trim() }).eq('id', b.id);
                              setEditingBucketId(null);
                              fetchBuckets();
                              toast.success('Bucket renamed');
                            }
                            if (e.key === 'Escape') setEditingBucketId(null);
                          }}
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                          if (!editBucketName.trim()) return;
                          await supabase.from('game_buckets').update({ name: editBucketName.trim() }).eq('id', b.id);
                          setEditingBucketId(null);
                          fetchBuckets();
                          toast.success('Bucket renamed');
                        }}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingBucketId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">{b.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.questionCount} questions • {b.userCount} users
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {editingBucketId !== b.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingBucketId(b.id); setEditBucketName(b.name); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteBucket(b.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions for selected bucket */}
      {selectedBucket && (
        <Card>
          <CardHeader>
            <CardTitle>Questions — {buckets.find(b => b.id === selectedBucket)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add question */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a new question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
              />
              <Button onClick={addQuestion} disabled={!newQuestion.trim()}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>

            {/* Question list */}
            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  {editingId === q.id ? (
                    <>
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && updateQuestion(q.id)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => updateQuestion(q.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-foreground">{q.question_text}</p>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(q.id); setEditText(q.question_text); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No questions in this bucket</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== RULES SECTION ==========
function RulesSection() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [rules, setRules] = useState<BucketRule[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // New rule form
  const [ruleBucket, setRuleBucket] = useState('');
  const [ruleQuestion, setRuleQuestion] = useState('');
  const [ruleAnswer, setRuleAnswer] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [{ data: b }, { data: r }, { data: sq }] = await Promise.all([
      supabase.from('game_buckets').select('*').order('display_order'),
      supabase.from('game_bucket_rules').select('*'),
      supabase.from('survey_questions').select('id, question_text, options, survey_id'),
    ]);
    setBuckets((b || []) as Bucket[]);
    setRules((r || []) as BucketRule[]);
    setSurveyQuestions((sq || []).map(q => ({ ...q, options: q.options as string[] | null })));
    setLoading(false);
  };

  const selectedQuestionOptions = surveyQuestions.find(q => q.id === ruleQuestion)?.options || [];

  const addRule = async () => {
    if (!ruleBucket || !ruleQuestion || !ruleAnswer) return;
    const { error } = await supabase.from('game_bucket_rules').insert({
      bucket_id: ruleBucket,
      survey_question_id: ruleQuestion,
      answer_value: ruleAnswer,
    });
    if (error) { toast.error('Failed to add rule'); return; }
    toast.success('Rule added');
    setRuleAnswer('');
    fetchAll();
  };

  const deleteRule = async (id: string) => {
    await supabase.from('game_bucket_rules').delete().eq('id', id);
    toast.success('Rule removed');
    fetchAll();
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Rule</CardTitle>
          <CardDescription>Map onboarding quiz answers to game buckets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quiz Question</Label>
              <Select value={ruleQuestion} onValueChange={(v) => { setRuleQuestion(v); setRuleAnswer(''); }}>
                <SelectTrigger><SelectValue placeholder="Select question" /></SelectTrigger>
                <SelectContent>
                  {surveyQuestions.filter(q => q.options && q.options.length > 0).map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.question_text}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Answer</Label>
              <Select value={ruleAnswer} onValueChange={setRuleAnswer} disabled={!ruleQuestion}>
                <SelectTrigger><SelectValue placeholder="Select answer" /></SelectTrigger>
                <SelectContent>
                  {selectedQuestionOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assign to Bucket</Label>
              <Select value={ruleBucket} onValueChange={setRuleBucket}>
                <SelectTrigger><SelectValue placeholder="Select bucket" /></SelectTrigger>
                <SelectContent>
                  {buckets.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addRule} disabled={!ruleBucket || !ruleQuestion || !ruleAnswer}>
            <Plus className="h-4 w-4 mr-2" /> Add Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No rules configured</p>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const q = surveyQuestions.find(sq => sq.id === rule.survey_question_id);
                const b = buckets.find(bk => bk.id === rule.bucket_id);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-foreground">
                      If <span className="font-semibold">"{q?.question_text || '?'}"</span> = <Badge variant="secondary">{rule.answer_value}</Badge> → <Badge>{b?.name || '?'}</Badge>
                    </p>
                    <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual reassignment */}
      <ManualBucketReassign buckets={buckets} />
    </div>
  );
}

function ManualBucketReassign({ buckets }: { buckets: Bucket[] }) {
  const [email, setEmail] = useState('');
  const [targetBucket, setTargetBucket] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReassign = async () => {
    if (!email.trim() || !targetBucket) return;
    setSaving(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (!profile) {
      toast.error('User not found');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ game_bucket_id: targetBucket })
      .eq('id', profile.id);

    if (error) { toast.error('Failed to reassign'); }
    else { toast.success('User reassigned'); setEmail(''); }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Reassignment</CardTitle>
        <CardDescription>Manually assign a user to a different bucket</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={targetBucket} onValueChange={setTargetBucket}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select bucket" /></SelectTrigger>
            <SelectContent>
              {buckets.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleReassign} disabled={saving || !email.trim() || !targetBucket}>
            <Users className="h-4 w-4 mr-2" /> Reassign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== ACCESS SECTION ==========
function AccessSection() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from('game_access_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('game_unlocks').select('*').order('unlocked_at', { ascending: false }),
    ]);
    setCodes(c || []);

    // Enrich unlocks with user info
    if (u && u.length > 0) {
      const userIds = u.map(unlock => unlock.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .in('id', userIds);

      const enriched = u.map(unlock => {
        const p = profiles?.find(pr => pr.id === unlock.user_id);
        return { ...unlock, email: p?.email || '—', first_name: p?.first_name || '' };
      });
      setUnlocks(enriched);
    } else {
      setUnlocks([]);
    }
    setLoading(false);
  };

  const addCode = async () => {
    if (!newCode.trim()) return;
    const { error } = await supabase.from('game_access_codes').insert({ code: newCode.trim() });
    if (error) {
      if (error.code === '23505') toast.error('Code already exists');
      else toast.error('Failed to add code');
      return;
    }
    toast.success('Code created');
    setNewCode('');
    fetchAll();
  };

  const toggleCode = async (id: string, currentActive: boolean) => {
    await supabase.from('game_access_codes').update({ is_active: !currentActive }).eq('id', id);
    fetchAll();
  };

  const deleteCode = async (id: string) => {
    await supabase.from('game_access_codes').delete().eq('id', id);
    toast.success('Code deleted');
    fetchAll();
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Access Codes</CardTitle>
          <CardDescription>Create and manage unlock codes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter new code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCode()}
            />
            <Button onClick={addCode} disabled={!newCode.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Create
            </Button>
          </div>

          <div className="space-y-2">
            {codes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <code className="font-mono font-medium text-foreground">{c.code}</code>
                  <Badge variant={c.is_active ? 'default' : 'outline'}>
                    {c.is_active ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleCode(c.id, c.is_active)}>
                    {c.is_active ? 'Revoke' : 'Reactivate'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCode(c.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {codes.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No codes created yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unlocked Users ({unlocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unlocks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No users have unlocked the game yet</p>
          ) : (
            <div className="space-y-2">
              {unlocks.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{u.first_name || u.email}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(u.unlocked_at), 'PP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== RATINGS SECTION ==========
function RatingsSection() {
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRatings(); }, []);

  const fetchRatings = async () => {
    // Get all questions with buckets
    const { data: questions } = await supabase
      .from('game_questions')
      .select('id, question_text, bucket_id, is_active');

    const { data: buckets } = await supabase
      .from('game_buckets')
      .select('id, name');

    const { data: allRatings } = await supabase
      .from('game_ratings')
      .select('question_id, rating');

    if (!questions) { setLoading(false); return; }

    const rows: RatingRow[] = questions.map(q => {
      const bucket = buckets?.find(b => b.id === q.bucket_id);
      const qRatings = (allRatings || []).filter(r => r.question_id === q.id);
      const avg = qRatings.length > 0
        ? qRatings.reduce((sum, r) => sum + r.rating, 0) / qRatings.length
        : 0;

      return {
        question_id: q.id,
        question_text: q.question_text,
        bucket_name: bucket?.name || '—',
        avg_rating: Math.round(avg * 10) / 10,
        total_ratings: qRatings.length,
        is_active: q.is_active,
      };
    });

    // Sort lowest rated first
    rows.sort((a, b) => a.avg_rating - b.avg_rating);
    setRatings(rows);
    setLoading(false);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('game_questions').delete().eq('id', id);
    toast.success('Question deleted');
    fetchRatings();
  };

  const toggleQuestion = async (id: string, currentActive: boolean) => {
    await supabase.from('game_questions').update({ is_active: !currentActive }).eq('id', id);
    toast.success(currentActive ? 'Question flagged/hidden' : 'Question reactivated');
    fetchRatings();
  };

  const downloadCSV = () => {
    const header = 'Question,Bucket,Avg Rating,Total Ratings,Active\n';
    const rows = ratings.map(r =>
      `"${r.question_text.replace(/"/g, '""')}","${r.bucket_name}",${r.avg_rating},${r.total_ratings},${r.is_active}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-ratings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ratings Report</CardTitle>
            <CardDescription>Sorted by lowest rated first</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <FileDown className="h-4 w-4 mr-2" /> Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No questions found</p>
          ) : (
            <div className="space-y-2">
              {ratings.map(r => (
                <div key={r.question_id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{r.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{r.bucket_name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ⭐ {r.avg_rating > 0 ? r.avg_rating : '—'} ({r.total_ratings} ratings)
                      </span>
                      {!r.is_active && <Badge variant="destructive" className="text-xs">Hidden</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleQuestion(r.question_id, r.is_active)} title={r.is_active ? 'Flag/Hide' : 'Reactivate'}>
                      <Flag className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuestion(r.question_id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
