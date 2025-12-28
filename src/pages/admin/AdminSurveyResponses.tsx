import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Survey {
  id: string;
  title: string;
  status: string;
}

interface UserWithResponses {
  id: string;
  email: string | null;
  first_name: string | null;
  response_count: number;
  last_response_at: string | null;
}

interface SurveyResponse {
  id: string;
  question_text_snapshot: string;
  question_type_snapshot: string;
  answer_value: string;
  created_at: string;
  survey_title_snapshot: string | null;
}

export default function AdminSurveyResponses() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('all');
  const [users, setUsers] = useState<UserWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState<string>('');
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (surveys.length > 0) {
      fetchUsersWithResponses();
    }
  }, [selectedSurveyId, surveys]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);

      // Set default to active survey if exists
      const activeSurvey = data?.find(s => s.status === 'active');
      if (activeSurvey) {
        setSelectedSurveyId(activeSurvey.id);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
    }
  };

  const fetchUsersWithResponses = async () => {
    setLoading(true);
    try {
      // Build query based on filter
      let query = supabase
        .from('survey_responses')
        .select('user_id, created_at, survey_id');

      if (selectedSurveyId !== 'all') {
        query = query.eq('survey_id', selectedSurveyId);
      }

      const { data: responseData, error: responseError } = await query;

      if (responseError) throw responseError;

      // Group by user
      const userMap = new Map<string, { count: number; lastAt: string }>();
      (responseData || []).forEach(r => {
        const existing = userMap.get(r.user_id);
        if (existing) {
          existing.count++;
          if (r.created_at > existing.lastAt) existing.lastAt = r.created_at;
        } else {
          userMap.set(r.user_id, { count: 1, lastAt: r.created_at });
        }
      });

      const userIds = Array.from(userMap.keys());

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get profile info
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .in('id', userIds);

      if (profileError) throw profileError;

      const usersWithResponses: UserWithResponses[] = (profiles || []).map(p => {
        const stats = userMap.get(p.id);
        return {
          id: p.id,
          email: p.email,
          first_name: p.first_name,
          response_count: stats?.count || 0,
          last_response_at: stats?.lastAt || null,
        };
      }).sort((a, b) => {
        if (!a.last_response_at) return 1;
        if (!b.last_response_at) return -1;
        return b.last_response_at.localeCompare(a.last_response_at);
      });

      setUsers(usersWithResponses);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserResponses = async (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setLoadingResponses(true);

    try {
      let query = supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (selectedSurveyId !== 'all') {
        query = query.eq('survey_id', selectedSurveyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResponses(data || []);

      // Get survey title
      if (selectedSurveyId !== 'all') {
        const survey = surveys.find(s => s.id === selectedSurveyId);
        setSelectedSurveyTitle(survey?.title || '');
      } else {
        setSelectedSurveyTitle('All Surveys');
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const goBack = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
    setResponses([]);
  };

  // User responses detail view
  if (selectedUserId) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">{selectedUserName}</h1>
              <p className="text-muted-foreground">{selectedSurveyTitle}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingResponses ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : responses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No responses found
                </div>
              ) : (
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="p-4 border rounded-lg">
                      {response.survey_title_snapshot && selectedSurveyId === 'all' && (
                        <Badge variant="outline" className="mb-2">
                          {response.survey_title_snapshot}
                        </Badge>
                      )}
                      <p className="font-medium text-foreground mb-2">
                        {response.question_text_snapshot}
                      </p>
                      <p className="text-primary font-semibold">
                        {response.question_type_snapshot === 'scale_1_10' 
                          ? `${response.answer_value} / 10`
                          : response.answer_value
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Answered {format(new Date(response.created_at), 'PPp')}
                      </p>
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

  // Users list view
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Survey Responses</h1>
            <p className="text-muted-foreground mt-1">View user survey answers</p>
          </div>
          <div className="w-64">
            <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select survey" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Surveys</SelectItem>
                {surveys.map((survey) => (
                  <SelectItem key={survey.id} value={survey.id}>
                    {survey.title}
                    {survey.status === 'active' && ' (Active)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No survey responses yet
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => fetchUserResponses(user.id, user.first_name || user.email || 'Unknown')}
                    className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.first_name || user.email || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.response_count} response{user.response_count !== 1 ? 's' : ''}
                        {user.last_response_at && (
                          <> · {format(new Date(user.last_response_at), 'PP')}</>
                        )}
                      </p>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
