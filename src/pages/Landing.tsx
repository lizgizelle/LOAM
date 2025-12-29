import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import landingHero from '@/assets/landing-hero.jpg';

const Landing = () => {
  const navigate = useNavigate();
  const [quizEnabled, setQuizEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkQuizSetting = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'quiz_onboarding_enabled')
          .maybeSingle();
        
        if (data) {
          setQuizEnabled(data.value === true);
        }
      } catch (error) {
        console.error('Error fetching quiz setting:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkQuizSetting();
  }, []);

  const handleGetStarted = () => {
    if (quizEnabled) {
      navigate('/quiz');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fullscreen background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landingHero})` }}
      />
      
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="relative min-h-screen flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
        {/* Spacer to push content down */}
        <div className="flex-1" />
        
        {/* Text overlay */}
        <div className="mb-8">
          <h1 
            className="text-4xl font-bold text-white leading-tight mb-4 animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            Genuine people,
            <br />
            in real life
          </h1>

          <p 
            className="text-lg text-white/90 max-w-xs mb-12 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Curated experiences for Christians.
            <br />
            Mostly singles, all welcome.
          </p>
        </div>

        {/* Buttons */}
        <div 
          className="space-y-3 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          <Button 
            variant="loam" 
            size="lg" 
            className="w-full"
            onClick={handleGetStarted}
            disabled={loading}
          >
            Get started
          </Button>
          <Button 
            variant="outline"
            size="lg" 
            className="w-full bg-background/90 border-foreground/80 text-foreground hover:bg-background"
            onClick={() => navigate('/login')}
          >
            I already have an account
          </Button>
        </div>

        {/* Legal footer */}
        <p 
          className="text-xs text-white/60 text-center mt-6 leading-relaxed animate-fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          By signing up, you agree to the{' '}
          <a 
            href="https://www.theloamcollective.com/draft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-white/80"
          >
            Terms of Service
          </a>
          ,{' '}
          <a 
            href="https://www.theloamcollective.com/draft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-white/80"
          >
            Privacy Policy
          </a>
          {' '}and{' '}
          <a 
            href="https://www.theloamcollective.com/draft" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-white/80"
          >
            Community Guidelines
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Landing;
