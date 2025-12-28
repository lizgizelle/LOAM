import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';

const Survey = () => {
  const navigate = useNavigate();
  const { setSurveyAnswers, surveyAnswers } = useAppStore();
  const [step, setStep] = useState(1);
  const [sliderValue, setSliderValue] = useState(2);

  const handlePersonalitySelect = (value: 'smart' | 'funny') => {
    setSurveyAnswers({ personality: value });
    setStep(2);
  };

  const handleSocialSelect = () => {
    setSurveyAnswers({ socialLevel: sliderValue });
    setStep(3);
  };

  const handleGenderSelect = (value: 'woman' | 'man') => {
    setSurveyAnswers({ gender: value });
    navigate('/auth-choice');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-12">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-12">
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
            <h1 className="text-2xl font-bold text-foreground mb-12">
              I enjoy going out with friends
            </h1>
            
            <div className="mt-8 mb-16">
              {/* Slider track */}
              <div className="relative h-2 bg-border rounded-full">
                <div 
                  className="absolute h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${((sliderValue - 1) / 2) * 100}%` }}
                />
                {/* Slider thumb */}
                <input
                  type="range"
                  min="1"
                  max="3"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full shadow-lg transition-all duration-200 pointer-events-none"
                  style={{ left: `calc(${((sliderValue - 1) / 2) * 100}% - 12px)` }}
                />
              </div>
              
              {/* Labels */}
              <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                <span>Never</span>
                <span>Almost always</span>
              </div>
            </div>

            <Button 
              variant="loam" 
              size="lg" 
              className="w-full mt-auto"
              onClick={handleSocialSelect}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground mb-12">
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
