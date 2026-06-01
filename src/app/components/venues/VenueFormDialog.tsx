import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { resolveVenueImageSrc } from '../../lib/venueImage';
import type { VenueListItem } from '../../types/venue';

const MAX_IMAGE_MB = 2;

export type VenueFormValues = {
  Name: string;
  Location: string;
  Capacity: string;
  Type: string;
  Description: string;
  imageUrl: string | null;
};

type VenueFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: VenueListItem | null;
  onSubmit: (values: VenueFormValues) => Promise<void>;
};

export function VenueFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: VenueFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && initial) {
      setName(initial.Name ?? '');
      setLocation(initial.Location ?? '');
      setCapacity(initial.Capacity != null ? String(initial.Capacity) : '');
      setType(initial.Type ?? '');
      setDescription(initial.Description ?? '');
      const src = resolveVenueImageSrc(initial.imageUrl);
      setImageUrl(src || null);
    } else {
      setName('');
      setLocation('');
      setCapacity('');
      setType('');
      setDescription('');
      setImageUrl(null);
    }
  }, [open, mode, initial]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('venues.form.imageTypeError'));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(t('venues.form.imageSizeError', { mb: MAX_IMAGE_MB }));
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const loc = location.trim();
    if (!n || !loc) {
      setError(t('venues.form.requiredFields'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        Name: n,
        Location: loc,
        Capacity: capacity,
        Type: type,
        Description: description,
        imageUrl,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('venues.form.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('venues.form.editTitle') : t('venues.form.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <div>
            <label htmlFor="venue-form-name" className="mb-2 block text-sm font-medium">
              {t('venues.form.name')}
            </label>
            <input
              id="venue-form-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3"
              required
            />
          </div>
          <div>
            <label htmlFor="venue-form-location" className="mb-2 block text-sm font-medium">
              {t('venues.form.location')}
            </label>
            <input
              id="venue-form-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="venue-form-capacity" className="mb-2 block text-sm font-medium">
                {t('venues.form.capacity')}
              </label>
              <input
                id="venue-form-capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="venue-form-type" className="mb-2 block text-sm font-medium">
                {t('venues.form.type')}
              </label>
              <input
                id="venue-form-type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3"
              />
            </div>
          </div>
          <div>
            <label htmlFor="venue-form-description" className="mb-2 block text-sm font-medium">
              {t('venues.form.description')}
            </label>
            <textarea
              id="venue-form-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor="venue-form-photo" className="mb-2 block text-sm font-medium">
              {t('venues.form.photo')}
            </label>
            <input
              id="venue-form-photo"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('venues.form.photoHint', { mb: MAX_IMAGE_MB })}
            </p>
            {imageUrl && (
              <div className="relative mt-3 inline-block">
                <img
                  src={imageUrl}
                  alt=""
                  className="h-32 w-48 rounded-lg border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute end-1 top-1 text-destructive"
                  onClick={() => setImageUrl(null)}
                >
                  {t('venues.form.removePhoto')}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('venues.form.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t('venues.form.saving')
                : mode === 'edit'
                  ? t('venues.form.save')
                  : t('venues.form.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function venueFormToApiBody(values: VenueFormValues) {
  const body: {
    Name: string;
    Location: string;
    Capacity?: number;
    Type?: string;
    Description?: string;
    imageUrl?: string;
  } = {
    Name: values.Name,
    Location: values.Location,
  };
  if (values.Capacity.trim() !== '' && !Number.isNaN(Number(values.Capacity))) {
    body.Capacity = Number(values.Capacity);
  }
  if (values.Type.trim()) body.Type = values.Type.trim();
  if (values.Description.trim()) body.Description = values.Description.trim();
  if (values.imageUrl) body.imageUrl = values.imageUrl;
  return body;
}
