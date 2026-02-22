import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/appStore';
import { Camera } from 'lucide-react';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { CountryCode, defaultCountry } from '@/lib/countryCodes';
import BirthdatePicker from '@/components/BirthdatePicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const WORK_INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Creative & Media',
  'Legal',
  'Real Estate',
  'Hospitality & F&B',
  'Government & Public Sector',
  'Consulting',
  'Retail & E-commerce',
  'Other',
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setOnboarded, setUserProfile, surveyAnswers } = useAppStore();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountry);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [workIndustry, setWorkIndustry] = useState('');
  const [birthdate, setBirthdate] = useState<{ day: number; month: number; year: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 8;

  const calculateAge = (day: number, month: number, year: number): number => {
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleBirthdateNext = async () => {
    if (!birthdate || !user) return;
    
    const age = calculateAge(birthdate.day, birthdate.month, birthdate.year);
    
    if (age < 21) {
      // User is under 21 - save birthdate and redirect to blocked screen
      setIsSubmitting(true);
      
      const dateString = `${birthdate.year}-${String(birthdate.month).padStart(2, '0')}-${String(birthdate.day).padStart(2, '0')}`;
      
      await supabase
        .from('profiles')
        .update({ 
          date_of_birth: dateString,
          gender: gender,
          is_shadow_blocked: true 
        })
        .eq('id', user.id);
      
      setIsSubmitting(false);
      navigate('/blocked', { state: { reason: 'age' } });
      return;
    }
    
    // User is 21+, continue onboarding
    setStep(step + 1);
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (!user) return;
      
      setIsSubmitting(true);
      
      const fullPhone = `${countryCode.code} ${phone}`;
      const dateString = birthdate 
        ? `${birthdate.year}-${String(birthdate.month).padStart(2, '0')}-${String(birthdate.day).padStart(2, '0')}`
        : '';
      
      // Auto-detect country from country code
      const detectedCity = countryCode.code === '+60' ? 'Malaysia' : 'Singapore';
      
      // Update profile in Supabase
      await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          phone_number: fullPhone,
          date_of_birth: dateString,
          gender: gender,
          work_industry: workIndustry,
        })
        .eq('id', user.id);
      
      setUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: fullPhone,
        photo: photo || undefined,
        gender: gender || undefined,
        relationshipStatus: 'single',
        hasChildren: false,
        workIndustry: workIndustry,
        countryOfBirth: '',
        dateOfBirth: dateString,
        city: detectedCity,
      });
      
      setOnboarded(true);
      setIsSubmitting(false);
      navigate('/home');
    }
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload
    setPhoto('/placeholder.svg');
  };

  const isBirthdateValid = birthdate !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-20 pb-10 safe-area-top safe-area-bottom">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-12">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {/* Step 1: Phone number */}
        {step === 1 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
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
                disabled={!phone.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: First name */}
        {step === 2 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
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
                disabled={!firstName.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Last name */}
        {step === 3 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
              What's your last name?
            </h1>
            <p className="text-muted-foreground mb-8">
              This helps us personalize your experience
            </p>

            <Input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mb-8"
            />

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
                disabled={!lastName.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Gender */}
        {step === 4 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
              Are you a man or a woman?
            </h1>
            <p className="text-muted-foreground mb-8">
              This helps us create a better experience for you. This cannot be changed later.
            </p>

            <div className="flex gap-4 mb-8">
              {([{ value: 'male', label: 'Man' }, { value: 'female', label: 'Woman' }] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGender(option.value)}
                  className={`flex-1 h-16 rounded-xl border-2 font-medium transition-all ${
                    gender === option.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
                disabled={!gender}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Work Industry */}
        {step === 5 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
              What industry do you work in?
            </h1>
            <p className="text-muted-foreground mb-8">
              This helps us connect you with like-minded people.
            </p>

            <Select value={workIndustry} onValueChange={setWorkIndustry}>
              <SelectTrigger className="h-14 rounded-xl border-2">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {WORK_INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleNext}
                disabled={!workIndustry}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Birthdate */}
        {step === 6 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
              What's your date of birth?
            </h1>
            <p className="text-muted-foreground mb-8">
              This helps us ensure Loam remains a safe, age-appropriate community.
            </p>

            <div className="flex-1 flex items-center justify-center">
              <BirthdatePicker
                value={birthdate}
                onChange={setBirthdate}
              />
            </div>

            <div className="mt-auto">
              <Button 
                variant="loam" 
                size="lg" 
                className="w-full"
                onClick={handleBirthdateNext}
                disabled={!isBirthdateValid || isSubmitting}
              >
                {isSubmitting ? 'Checking...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 7: Profile photo */}
        {step === 7 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
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

        {/* Step 8: Notifications */}
        {step === 8 && (
          <div className="animate-fade-in flex-1 flex flex-col">
            <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (notifications ? 'Enable notifications' : 'Continue without')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
