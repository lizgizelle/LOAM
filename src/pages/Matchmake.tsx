import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const Matchmake = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              Matchmake
            </h1>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Talk to our AI matchmaker
            </p>
          </div>
          
          <Button
            variant="loam"
            size="lg"
            className="w-full max-w-xs"
            onClick={() => navigate('/matchmake/whatsapp')}
          >
            Continue
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Matchmake;
