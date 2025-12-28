import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'scale_1_10';
  options: string[] | null;
  scale_label_low: string | null;
  scale_label_high: string | null;
  display_order: number;
}

const Survey = () => {
  const navigate = useNavigate();
  const { setSurveyAnswers } = useAppStore();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scaleValue, setScaleValue] = useState<number | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setQuestions((data || []).map(q => ({
        ...q,
        question_type: q.question_type as 'multiple_choice' | 'scale_1_10',
        options: q.options as string[] | null
      })));
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveResponse = async (questionId: string, questionText: string, questionType: string, answer: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('survey_responses').insert({
        user_id: user.id,
        question_id: questionId,
        question_text_snapshot: questionText,
        question_type_snapshot: questionType,
        answer_value: answer,
      });
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleMultipleChoiceSelect = async (value: string) => {
    const currentQuestion = questions[step];
    if (!currentQuestion) return;

    setAnswers({ ...answers, [currentQuestion.id]: value });
    
    // Save to local store for legacy support
    if (currentQuestion.question_text.toLowerCase().includes('smart') || 
        currentQuestion.question_text.toLowerCase().includes('funny')) {
      setSurveyAnswers({ personality: value.toLowerCase().includes('smart') ? 'smart' : 'funny' });
    }
    if (currentQuestion.question_text.toLowerCase().includes('woman') || 
        currentQuestion.question_text.toLowerCase().includes('man')) {
      setSurveyAnswers({ gender: value.toLowerCase().includes('woman') ? 'woman' : 'man' });
    }

    // Save to database if user is logged in
    await saveResponse(currentQuestion.id, currentQuestion.question_text, currentQuestion.question_type, value);

    // Move to next step or complete
    if (step < questions.length - 1) {
      setStep(step + 1);
      setScaleValue(null);
    } else {
      navigate('/auth-choice');
    }
  };

  const handleScaleSelect = async () => {
    if (scaleValue === null) return;
    
    const currentQuestion = questions[step];
    if (!currentQuestion) return;

    setAnswers({ ...answers, [currentQuestion.id]: String(scaleValue) });
    setSurveyAnswers({ socialLevel: scaleValue });

    // Save to database if user is logged in
    await saveResponse(currentQuestion.id, currentQuestion.question_text, currentQuestion.question_type, String(scaleValue));

    // Move to next step or complete
    if (step < questions.length - 1) {
      setStep(step + 1);
      setScaleValue(null);
    } else {
      navigate('/auth-choice');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-muted-foreground mb-4">No survey questions available</p>
        <Button variant="loam" onClick={() => navigate('/auth-choice')}>
          Continue
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[step];

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-14 pb-10 safe-area-top safe-area-bottom">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-8">
        {questions.map((_, i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-fade-in" key={step}>
          <h1 className="text-2xl font-bold text-foreground mb-10">
            {currentQuestion.question_text}
          </h1>

          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-4">
              {currentQuestion.options.map((option) => (
                <Button 
                  key={option}
                  variant="loam-secondary" 
                  size="lg" 
                  className="w-full justify-center"
                  onClick={() => handleMultipleChoiceSelect(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'scale_1_10' && (
            <>
              {/* Number grid */}
              <div className="mb-8">
                {/* Grid rows */}
                <div className="space-y-3">
                  {/* Row 1: 1-5 with label above 1 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-muted-foreground w-12 text-center">
                        {currentQuestion.scale_label_low || ''}
                      </span>
                      <span className="w-12" />
                      <span className="w-12" />
                      <span className="w-12" />
                      <span className="w-12" />
                    </div>
                    <div className="flex justify-between">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setScaleValue(num)}
                          className={cn(
                            "w-12 h-12 rounded-xl font-medium text-lg transition-all duration-200",
                            scaleValue === num
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Row 2: 6-10 with label below 10 */}
                  <div>
                    <div className="flex justify-between">
                      {[6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setScaleValue(num)}
                          className={cn(
                            "w-12 h-12 rounded-xl font-medium text-lg transition-all duration-200",
                            scaleValue === num
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="w-12" />
                      <span className="w-12" />
                      <span className="w-12" />
                      <span className="w-12" />
                      <span className="text-xs text-muted-foreground w-12 text-center">
                        {currentQuestion.scale_label_high || ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleScaleSelect}
                disabled={scaleValue === null}
              >
                Continue
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Survey;
