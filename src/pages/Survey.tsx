import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

const Survey = () => {
  const navigate = useNavigate();
  const { setSurveyAnswers, surveyAnswers } = useAppStore();
  const [step, setStep] = useState(1);
  const [socialLevel, setSocialLevel] = useState<number | null>(null);

  const handlePersonalitySelect = (value: 'smart' | 'funny') => {
    setSurveyAnswers({ personality: value });
    setStep(2);
  };

  const handleSocialSelect = () => {
    if (socialLevel !== null) {
      setSurveyAnswers({ socialLevel });
      setStep(3);
    }
  };

  const handleGenderSelect = (value: 'woman' | 'man') => {
    setSurveyAnswers({ gender: value });
    navigate('/auth-choice');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-14 pb-10 safe-area-top safe-area-bottom">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-10">
              Do you consider yourself more of a
            </h1>
            <div className="space-y-4">
              <Button 
                variant="loam-secondary" 
                size="lg" 
                className="w-full justify-center"
                onClick={() => handlePersonalitySelect('smart')}
              >
                Smart person
              </Button>
              <Button 
                variant="loam-secondary" 
                size="lg" 
                className="w-full justify-center"
                onClick={() => handlePersonalitySelect('funny')}
              >
                Funny person
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-10">
              I enjoy going out with friends
            </h1>
            
            {/* Number grid */}
            <div className="mb-8">
              {/* Helper labels */}
              <div className="flex justify-between mb-3">
                <span className="text-xs text-muted-foreground">Rarely</span>
                <span className="text-xs text-muted-foreground">Very often</span>
              </div>
              
              {/* Grid rows */}
              <div className="space-y-3">
                {/* Row 1: 1-5 */}
                <div className="flex justify-between">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSocialLevel(num)}
                      className={cn(
                        "w-12 h-12 rounded-xl font-medium text-lg transition-all duration-200",
                        socialLevel === num
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                
                {/* Row 2: 6-10 */}
                <div className="flex justify-between">
                  {[6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSocialLevel(num)}
                      className={cn(
                        "w-12 h-12 rounded-xl font-medium text-lg transition-all duration-200",
                        socialLevel === num
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              variant="loam" 
              size="lg" 
              className="w-full"
              onClick={handleSocialSelect}
              disabled={socialLevel === null}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-10">
              Are you a woman or a man?
            </h1>
            <div className="space-y-4">
              <Button 
                variant="loam-secondary" 
                size="lg" 
                className="w-full justify-center"
                onClick={() => handleGenderSelect('woman')}
              >
                Woman
              </Button>
              <Button 
                variant="loam-secondary" 
                size="lg" 
                className="w-full justify-center"
                onClick={() => handleGenderSelect('man')}
              >
                Man
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Survey;