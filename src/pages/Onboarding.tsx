import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/appStore';
import { Camera } from 'lucide-react';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { CountryCode, defaultCountry } from '@/lib/countryCodes';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setOnboarded, setUserProfile, surveyAnswers } = useAppStore();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountry);
  const [firstName, setFirstName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      const fullPhone = `${countryCode.code} ${phone}`;
      setUserProfile({
        firstName,
        phone: fullPhone,
        photo: photo || undefined,
        gender: surveyAnswers.gender || 'woman',
        relationshipStatus: 'single',
        hasChildren: false,
        workIndustry: '',
        countryOfBirth: '',
        dateOfBirth: '',
      });
      setOnboarded(true);
      navigate('/home');
    }
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload
    setPhoto('/placeholder.svg');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-12">
        {[1, 2, 3, 4].map((i) => (
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
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              What's your phone number?
            </h1>
            <p className="text-muted-foreground mb-8">
              We'll use this to keep you updated
            </p>

            <div className="flex gap-3 mb-8">
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
                disabled={!phone}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              What's your first name?
            </h1>
            <p className="text-muted-foreground mb-8">
              This is how you'll appear to others
            </p>

            <Input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mb-8"
            />

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
                disabled={!firstName}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Add a profile photo
            </h1>
            <p className="text-muted-foreground mb-8">
              Upload your best photo
            </p>

            <div className="flex flex-col items-center my-8">
              <button 
                onClick={handlePhotoUpload}
                className="w-32 h-32 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors overflow-hidden"
              >
                {photo ? (
                  <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
              <button 
                onClick={handlePhotoUpload}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Upload photo
              </button>
            </div>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
              >
                {photo ? 'Next' : 'Skip for now'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Enable notifications
            </h1>
            <p className="text-muted-foreground mb-8">
              Get reminders for events and updates
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl bg-popover border border-border">
              <div>
                <p className="font-medium text-foreground">Push notifications</p>
                <p className="text-sm text-muted-foreground">Stay updated on events</p>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
              >
                {notifications ? 'Enable notifications' : 'Continue without'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
