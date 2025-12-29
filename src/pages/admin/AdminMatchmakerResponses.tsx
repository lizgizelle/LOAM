import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MatchmakerSetWithResponseCount {
  id: string;
  title: string;
  status: string;
  created_at: string;
  response_count: number;
}

export default function AdminMatchmakerResponses() {
  const [sets, setSets] = useState<MatchmakerSetWithResponseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchSetsWithCounts();
  }, []);

  const fetchSetsWithCounts = async () => {
    try {
      const { data: setsData, error: setsError } = await supabase
        .from('matchmaker_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (setsError) throw setsError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('matchmaker_sessions')
        .select('set_id, user_id, status')
        .eq('status', 'completed');

      if (sessionsError) throw sessionsError;

      const setUserCounts = new Map<string, Set<string>>();
      (sessions || []).forEach(s => {
        if (s.set_id) {
          if (!setUserCounts.has(s.set_id)) {
            setUserCounts.set(s.set_id, new Set());
          }
          setUserCounts.get(s.set_id)!.add(s.user_id);
        }
      });

      const setsWithCounts: MatchmakerSetWithResponseCount[] = (setsData || []).map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        created_at: s.created_at,
        response_count: setUserCounts.get(s.id)?.size || 0,
      }));

      setSets(setsWithCounts);
    } catch (error) {
      console.error('Error fetching sets:', error);
      toast.error('Failed to load matchmaker sets');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async (set: MatchmakerSetWithResponseCount) => {
    setDownloading(set.id);
    
    try {
      // Get completed sessions for this set
      const { data: sessions, error: sessionsError } = await supabase
        .from('matchmaker_sessions')
        .select('id, user_id, completed_at')
        .eq('set_id', set.id)
        .eq('status', 'completed');

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        toast.error('No responses to export');
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // Get all answers for these sessions
      const { data: answers, error: answersError } = await supabase
        .from('matchmaker_answers')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at');

      if (answersError) throw answersError;

      if (!answers || answers.length === 0) {
        toast.error('No answers found');
        return;
      }

      // Get user profiles
      const userIds = [...new Set(answers.map(a => a.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const sessionMap = new Map(sessions.map(s => [s.id, s]));

      // Group answers by session
      const sessionAnswers = new Map<string, typeof answers>();
      answers.forEach(a => {
        if (!sessionAnswers.has(a.session_id)) {
          sessionAnswers.set(a.session_id, []);
        }
        sessionAnswers.get(a.session_id)!.push(a);
      });

      // Get unique questions in order
      const questionOrder: string[] = [];
      const questionTexts = new Map<string, string>();
      answers.forEach(a => {
        if (!questionTexts.has(a.question_id)) {
          questionOrder.push(a.question_id);
          questionTexts.set(a.question_id, a.question_text_snapshot);
        }
      });

      // Build CSV
      const headers = ['User Email', 'User Name', 'Completion Date', ...questionOrder.map(qId => questionTexts.get(qId) || 'Question')];
      
      const rows: string[][] = [];
      sessionAnswers.forEach((sessionAns, sessionId) => {
        const session = sessionMap.get(sessionId);
        const userId = sessionAns[0]?.user_id;
        const profile = profileMap.get(userId);
        const completedAt = session?.completed_at 
          ? format(new Date(session.completed_at), 'yyyy-MM-dd HH:mm:ss')
          : '';
        
        const answerMap = new Map(sessionAns.map(a => [a.question_id, a.answer_value]));
        
        const row = [
          profile?.email || userId,
          profile?.first_name || '',
          completedAt,
          ...questionOrder.map(qId => answerMap.get(qId) || ''),
        ];
        rows.push(row);
      });

      // Convert to CSV string
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `matchmaker-responses-${set.title.replace(/\//g, '-')}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-600 border-0">
            Active
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
        <div>
          <h1 className="text-2xl font-semibold">Matchmaker Responses</h1>
          <p className="text-muted-foreground mt-1">Download matchmaker responses as CSV</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Matchmaker Sets ({sets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No matchmaker sets yet
              </div>
            ) : (
              <div className="space-y-3">
                {sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {set.title}
                        </span>
                        {getStatusBadge(set.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {set.response_count} response{set.response_count !== 1 ? 's' : ''}
                        {' · '}Created {format(new Date(set.created_at), 'PP')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(set)}
                      disabled={downloading === set.id || set.response_count === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading === set.id ? 'Downloading...' : 'Download CSV'}
                    </Button>
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
