import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import landingHero from '@/assets/landing-hero.jpg';

const Landing = () => {
  const navigate = useNavigate();

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
          className="space-y-4 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          <Button 
            variant="loam" 
            size="lg" 
            className="w-full"
            onClick={() => navigate('/quiz')}
          >
            Get started
          </Button>
          <button 
            className="w-full text-center text-white/80 hover:text-white transition-colors py-2 text-sm font-medium"
            onClick={() => navigate('/login')}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
