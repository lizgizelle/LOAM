import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, Camera, Lock } from 'lucide-react';
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

const EditProfile = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useAppStore();
  
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [relationshipStatus, setRelationshipStatus] = useState(userProfile?.relationshipStatus || 'single');
  const [hasChildren, setHasChildren] = useState(userProfile?.hasChildren || false);
  const [workIndustry, setWorkIndustry] = useState(userProfile?.workIndustry || '');
  const [countryOfBirth, setCountryOfBirth] = useState(userProfile?.countryOfBirth || '');

  const handleSave = () => {
    setUserProfile({
      firstName,
      phone,
      relationshipStatus,
      hasChildren,
      workIndustry,
      countryOfBirth,
    });
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 pt-14 pb-4 safe-area-top">
        <button 
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-foreground">
          Edit profile
        </h1>
      </div>

      {/* Profile photo */}
      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
            {firstName?.[0] || 'L'}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editable fields */}
      <div className="px-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">First name</label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone number</label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Relationship status</label>
          <div className="flex gap-3">
            {(['single', 'attached'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setRelationshipStatus(status)}
                className={`flex-1 h-14 rounded-xl border-2 font-medium capitalize transition-all ${
                  relationshipStatus === status
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground hover:border-primary/50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Children</label>
          <div className="flex gap-3">
            {[{ value: false, label: 'No' }, { value: true, label: 'Yes' }].map((option) => (
              <button
                key={String(option.value)}
                onClick={() => setHasChildren(option.value)}
                className={`flex-1 h-14 rounded-xl border-2 font-medium transition-all ${
                  hasChildren === option.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground hover:border-primary/50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Work industry</label>
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
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Country of birth</label>
          <Input
            value={countryOfBirth}
            onChange={(e) => setCountryOfBirth(e.target.value)}
            placeholder="e.g. Singapore"
          />
        </div>

        {/* Locked fields */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Lock className="w-4 h-4" />
            <span>These fields cannot be changed</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Date of birth</label>
              <div className="h-14 rounded-xl border-2 border-border bg-secondary/50 px-4 flex items-center text-muted-foreground">
                {userProfile?.dateOfBirth || 'Not set'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Gender</label>
              <div className="h-14 rounded-xl border-2 border-border bg-secondary/50 px-4 flex items-center text-muted-foreground capitalize">
                {userProfile?.gender || 'Not set'}
              </div>
            </div>
          </div>
        </div>

        <Button 
          variant="loam" 
          size="lg" 
          className="w-full mt-8"
          onClick={handleSave}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
};

export default EditProfile;
