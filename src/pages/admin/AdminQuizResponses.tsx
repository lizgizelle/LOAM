import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuizWithResponseCount {
  id: string;
  title: string;
  status: string;
  created_at: string;
  response_count: number;
}

export default function AdminQuizResponses() {
  const [quizzes, setQuizzes] = useState<QuizWithResponseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzesWithCounts();
  }, []);

  const fetchQuizzesWithCounts = async () => {
    try {
      // Get all quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      // Get response counts per quiz
      const { data: responseCounts, error: countsError } = await supabase
        .from('survey_responses')
        .select('survey_id, user_id');

      if (countsError) throw countsError;

      // Count unique users per quiz
      const quizUserCounts = new Map<string, Set<string>>();
      (responseCounts || []).forEach(r => {
        if (r.survey_id) {
          if (!quizUserCounts.has(r.survey_id)) {
            quizUserCounts.set(r.survey_id, new Set());
          }
          quizUserCounts.get(r.survey_id)!.add(r.user_id);
        }
      });

      const quizzesWithCounts: QuizWithResponseCount[] = (quizzesData || []).map(q => ({
        id: q.id,
        title: q.title,
        status: q.status,
        created_at: q.created_at,
        response_count: quizUserCounts.get(q.id)?.size || 0,
      }));

      setQuizzes(quizzesWithCounts);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async (quiz: QuizWithResponseCount) => {
    setDownloading(quiz.id);
    
    try {
      // Fetch all responses for this quiz
      const { data: responses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', quiz.id)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;

      if (!responses || responses.length === 0) {
        toast.error('No responses to export');
        return;
      }

      // Get user profiles
      const userIds = [...new Set(responses.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group responses by user
      const userResponses = new Map<string, typeof responses>();
      responses.forEach(r => {
        if (!userResponses.has(r.user_id)) {
          userResponses.set(r.user_id, []);
        }
        userResponses.get(r.user_id)!.push(r);
      });

      // Get unique questions in order
      const questionOrder: string[] = [];
      const questionTexts = new Map<string, string>();
      responses.forEach(r => {
        if (!questionTexts.has(r.question_id)) {
          questionOrder.push(r.question_id);
          questionTexts.set(r.question_id, r.question_text_snapshot);
        }
      });

      // Build CSV
      const headers = ['User Email', 'User Name', 'Submission Date', ...questionOrder.map(qId => questionTexts.get(qId) || 'Question')];
      
      const rows: string[][] = [];
      userResponses.forEach((userResps, userId) => {
        const profile = profileMap.get(userId);
        const submissionDate = userResps[0]?.created_at 
          ? format(new Date(userResps[0].created_at), 'yyyy-MM-dd HH:mm:ss')
          : '';
        
        const answerMap = new Map(userResps.map(r => [r.question_id, r.answer_value]));
        
        const row = [
          profile?.email || userId,
          profile?.first_name || '',
          submissionDate,
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
      const fileName = `quiz-responses-${quiz.title.replace(/\//g, '-')}.csv`;
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
          <h1 className="text-2xl font-semibold">Quiz Responses</h1>
          <p className="text-muted-foreground mt-1">Download quiz responses as CSV</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quizzes ({quizzes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quizzes yet
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">
                          {quiz.title}
                        </span>
                        {getStatusBadge(quiz.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.response_count} response{quiz.response_count !== 1 ? 's' : ''}
                        {' · '}Created {format(new Date(quiz.created_at), 'PP')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => downloadCSV(quiz)}
                      disabled={downloading === quiz.id || quiz.response_count === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading === quiz.id ? 'Downloading...' : 'Download CSV'}
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
