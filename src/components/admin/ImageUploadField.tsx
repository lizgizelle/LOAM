import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bucket: 'activity-covers' | 'activity-mascots';
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  hint?: string;
  /** Aspect ratio class for the preview box, e.g. 'aspect-video', 'aspect-square' */
  aspect?: string;
}

const ImageUploadField = ({ bucket, value, onChange, label, hint, aspect = 'aspect-video' }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success('Image uploaded');
    setUploading(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {value ? (
        <div className={`relative ${aspect} rounded-xl overflow-hidden border border-border bg-muted/30 group`}>
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`${aspect} rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drop an image or click to browse</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="w-3 h-3" /> PNG / JPG up to 5 MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
};

export default ImageUploadField;
