import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        {/* Logo/Brand mark */}
        <div className="mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="text-2xl font-bold text-primary">L</span>
          </div>
        </div>

        {/* Headline */}
        <h1 
          className="text-4xl font-bold text-foreground leading-tight mb-4 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          Genuine people,
          <br />
          in real life
        </h1>

        {/* Subtext */}
        <p 
          className="text-lg text-muted-foreground max-w-xs mb-12 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          Curated experiences for Christians.
          <br />
          Mostly singles, all welcome.
        </p>
      </div>

      {/* Buttons */}
      <div 
        className="space-y-4 animate-fade-in-up"
        style={{ animationDelay: '0.3s' }}
      >
        <Button 
          variant="loam" 
          size="lg" 
          className="w-full"
          onClick={() => navigate('/survey')}
        >
          Get started
        </Button>
        <Button 
          variant="loam-outline" 
          size="lg" 
          className="w-full"
          onClick={() => navigate('/login')}
        >
          I already have an account
        </Button>
      </div>
    </div>
  );
};

export default Landing;
