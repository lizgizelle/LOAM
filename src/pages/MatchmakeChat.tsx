import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'scale' | 'free_text';
  options: string[] | null;
  scale_label_low: string | null;
  scale_label_high: string | null;
  display_order: number;
}

interface Answer {
  questionId: string;
  value: string;
}

const MatchmakeChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [freeTextInput, setFreeTextInput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    initializeChat();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQuestionIndex, answers]);

  const initializeChat = async () => {
    if (!user) return;

    try {
      // Get active matchmaker set
      const { data: activeSet, error: setError } = await supabase
        .from('matchmaker_sets')
        .select('id')
        .eq('status', 'active')
        .maybeSingle();

      if (setError) throw setError;

      if (!activeSet) {
        toast.error('No active matchmaker set found');
        navigate('/matchmake');
        return;
      }

      setSetId(activeSet.id);

      // Get questions for this set
      const { data: questionsData, error: questionsError } = await supabase
        .from('matchmaker_questions')
        .select('*')
        .eq('set_id', activeSet.id)
        .eq('is_active', true)
        .order('display_order');

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        toast.error('No questions found');
        navigate('/matchmake');
        return;
      }

      const parsedQuestions: Question[] = questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as 'multiple_choice' | 'scale' | 'free_text',
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
        scale_label_low: q.scale_label_low,
        scale_label_high: q.scale_label_high,
        display_order: q.display_order,
      }));

      setQuestions(parsedQuestions);

      // Check for existing session
      const { data: existingSession, error: sessionError } = await supabase
        .from('matchmaker_sessions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('set_id', activeSet.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      if (existingSession?.status === 'completed' || existingSession?.status === 'submitted') {
        setIsCompleted(true);
        setLoading(false);
        return;
      }

      if (existingSession) {
        setSessionId(existingSession.id);
        
        // Load existing answers
        const { data: existingAnswers, error: answersError } = await supabase
          .from('matchmaker_answers')
          .select('question_id, answer_value')
          .eq('session_id', existingSession.id);

        if (answersError) throw answersError;

        if (existingAnswers && existingAnswers.length > 0) {
          const loadedAnswers = existingAnswers.map(a => ({
            questionId: a.question_id,
            value: a.answer_value,
          }));
          setAnswers(loadedAnswers);
          setCurrentQuestionIndex(loadedAnswers.length);
        }
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('matchmaker_sessions')
          .insert({
            user_id: user.id,
            set_id: activeSet.id,
            status: 'in_progress',
          })
          .select()
          .single();

        if (createError) throw createError;
        setSessionId(newSession.id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load matchmaker');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (questionId: string, value: string) => {
    if (!sessionId || !user) return;

    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    try {
      const { error } = await supabase
        .from('matchmaker_answers')
        .upsert({
          session_id: sessionId,
          question_id: questionId,
          user_id: user.id,
          answer_value: value,
          question_text_snapshot: question.question_text,
          question_type_snapshot: question.question_type,
        }, {
          onConflict: 'session_id,question_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer');
    }
  };

  const handleAnswer = async (value: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newAnswer = { questionId: currentQuestion.id, value };
    setAnswers([...answers, newAnswer]);
    await saveAnswer(currentQuestion.id, value);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setFreeTextInput('');
    } else {
      // Complete the session - mark as submitted (waiting for admin match)
      if (sessionId) {
        await supabase
          .from('matchmaker_sessions')
          .update({ status: 'submitted', completed_at: new Date().toISOString() })
          .eq('id', sessionId);
      }
      setIsCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setAnswers(answers.slice(0, -1));
    } else {
      navigate('/matchmake');
    }
  };

  const handleFreeTextSubmit = () => {
    if (freeTextInput.trim()) {
      handleAnswer(freeTextInput.trim());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Card className="max-w-sm w-full border-border/50 shadow-lg">
            <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  Thanks for your input
                </h2>
                <p className="text-muted-foreground font-serif leading-relaxed">
                  Give us 48 hours to review, and we'll pass you a match.
                </p>
              </div>
              
              <Button
                variant="loam"
                size="lg"
                className="w-full"
                onClick={() => navigate('/home')}
              >
                Done
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={handleBack} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-sm text-muted-foreground">
          {currentQuestionIndex + 1} of {questions.length}
        </span>
        <div className="w-9" />
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Previous Q&A pairs */}
        {answers.map((answer, index) => {
          const question = questions[index];
          return (
            <div key={answer.questionId} className="space-y-3">
              {/* Bot question */}
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                  <p className="text-foreground font-serif">{question.question_text}</p>
                </div>
              </div>
              {/* User answer */}
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4 max-w-[85%]">
                  <p className="font-serif">{answer.value}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Current question */}
        {currentQuestion && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
              <p className="text-foreground font-serif">{currentQuestion.question_text}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Answer input area */}
      {currentQuestion && (
        <div className="p-4 border-t border-border space-y-3">
          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="flex flex-wrap gap-2">
              {(currentQuestion.options as string[]).map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-serif text-sm"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'scale' && (
            <div className="space-y-2">
              {/* Labels */}
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{currentQuestion.scale_label_low || '1'}</span>
                <span>{currentQuestion.scale_label_high || '10'}</span>
              </div>
              {/* Scale buttons - two rows */}
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleAnswer(num.toString())}
                      className="aspect-square rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-serif font-medium"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleAnswer(num.toString())}
                      className="aspect-square rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-serif font-medium"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentQuestion.question_type === 'free_text' && (
            <div className="flex gap-2">
              <Input
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 font-serif"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFreeTextSubmit();
                  }
                }}
              />
              <Button
                variant="loam"
                size="icon"
                onClick={handleFreeTextSubmit}
                disabled={!freeTextInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchmakeChat;
