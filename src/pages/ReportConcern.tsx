import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Check, Heart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';


const CATEGORIES = [
  "Weird energy — something felt off",
  "They kept following me or wouldn't give me space",
  "They made jokes that felt inappropriate or hurtful",
  "They were too persistent romantically and didn't respect my boundaries",
  "Their behaviour didn't feel aligned with this community",
  "I felt unsafe",
  "Something else — I'll describe it myself",
];

const ReportConcern = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 fields
  const [reportedFirstName, setReportedFirstName] = useState('');
  const [courtNumber, setCourtNumber] = useState('');
  const [courtLeaderName, setCourtLeaderName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventOptions, setEventOptions] = useState<{ id: string; label: string }[]>([]);

  // Step 2
  const [selectedCategory, setSelectedCategory] = useState('');

  // Step 3
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch published events for dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, start_date')
        .eq('status', 'published')
        .order('start_date', { ascending: true });

      if (data && data.length > 0) {
        setEventOptions(data.map((ev) => ({
          id: ev.id,
          label: ev.name,
        })));
      }
    };
    fetchEvents();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(path, photoFile);

        if (!uploadError) {
          photoUrl = path;
        }
      }

      const { error } = await supabase.from('concern_reports').insert({
        reporter_id: user.id,
        reported_first_name: reportedFirstName.trim(),
        court_number: parseInt(courtNumber),
        court_leader_name: courtLeaderName.trim(),
        event_name: eventName.trim(),
        event_date: new Date().toISOString().split('T')[0],
        category: selectedCategory,
        description: description.trim() || null,
        photo_url: photoUrl,
      });

      if (error) throw error;
      setStep(4);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setReportedFirstName('');
    setCourtNumber('');
    setCourtLeaderName('');
    setDescription('');
    setSelectedCategory('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const canProceedStep1 = reportedFirstName.trim() && courtNumber && courtLeaderName.trim() && eventName.trim();
  const canProceedStep2 = selectedCategory !== '';

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 safe-area-top">
        <div className="flex items-center gap-3">
          {step > 1 && step < 4 && (
            <button onClick={() => setStep(step - 1)} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {step === 4 ? '' : 'Report a Concern'}
          </h1>
        </div>
        {step < 4 && (
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 px-6">
        {/* Step 1 — Who is this about? */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Who is this about?</h2>
              <p className="text-sm text-muted-foreground">Help us identify the right person. Everything you share stays confidential.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">First name of the person</label>
                <Input
                  value={reportedFirstName}
                  onChange={(e) => setReportedFirstName(e.target.value)}
                  placeholder="Their first name"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Court number</label>
                <Select value={courtNumber} onValueChange={setCourtNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select court" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Court {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Court leader's name</label>
                <Input
                  value={courtLeaderName}
                  onChange={(e) => setCourtLeaderName(e.target.value)}
                  placeholder="Leader's name"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Event name</label>
                <Select value={eventName} onValueChange={setEventName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventOptions.map((ev) => (
                      <SelectItem key={ev.id} value={ev.label}>
                        {ev.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2 — What happened? */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">What happened?</h2>
              <p className="text-sm text-muted-foreground">Select the option that best describes the situation. You can add more detail in the next step.</p>
            </div>

            <div className="space-y-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all text-sm leading-snug ${
                    selectedCategory === cat
                      ? 'border-primary bg-primary/5 text-foreground font-medium'
                      : 'border-border bg-card text-foreground hover:border-primary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <Button
              className="w-full mt-4"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 3 — Tell us more */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Tell us more</h2>
              <p className="text-sm text-muted-foreground">You don't need to have all the details. Just share what felt off and we'll take it from here.</p>
            </div>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? (optional)"
              rows={5}
              maxLength={2000}
              className="resize-none"
            />

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Photo or screenshot (optional)</label>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Upload preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors text-muted-foreground text-sm">
                  <Camera className="w-5 h-5" />
                  <span>Tap to add a photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </label>
              )}
            </div>

            <Button
              className="w-full mt-4"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Report'}
            </Button>
          </div>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[60vh] animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Thank you for trusting us with this
            </h2>
            <p className="text-muted-foreground max-w-xs leading-relaxed mb-8">
              A real person on our team will review this within 24 hours. Your identity will not be shared with the person you've reported. You're helping us keep this community safe.
            </p>
            <Button variant="outline" onClick={resetForm}>
              Done
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportConcern;
