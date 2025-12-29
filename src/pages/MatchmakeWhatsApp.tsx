import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import CountryCodeSelect from '@/components/CountryCodeSelect';
import { defaultCountry, CountryCode } from '@/lib/countryCodes';

const MatchmakeWhatsApp = () => {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState<CountryCode>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');

  const isValid = phoneNumber.trim().length > 0;

  const handleStartWhatsApp = () => {
    if (!isValid) return;
    // For now, just open WhatsApp web
    window.open('https://www.whatsapp.com', '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button
          onClick={() => navigate('/matchmake')}
          className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-serif font-semibold">Your WhatsApp number</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp number</Label>
            <div className="flex gap-2">
              <CountryCodeSelect
                value={countryCode}
                onChange={setCountryCode}
              />
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-8 safe-area-bottom">
        <Button
          variant="loam"
          size="lg"
          className="w-full"
          onClick={handleStartWhatsApp}
          disabled={!isValid}
        >
          Start on WhatsApp
        </Button>
      </div>
    </div>
  );
};

export default MatchmakeWhatsApp;
