import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload.js';

export function ReferenceImageUpload({ images, onChange, max = 5 }) {
  const fileRef = useRef(null);
  const { upload, uploading, progress } = useCloudinaryUpload('request');

  const handleFiles = async (files) => {
    const remaining = max - images.length;
    const toUpload = [...files].slice(0, remaining);
    for (const file of toUpload) {
      try {
        const img = await upload(file);
        onChange([...images, img]);
      } catch (err) {
        toast.error(err.message || 'Upload failed');
      }
    }
  };

  const remove = (publicId) => {
    onChange(images.filter((i) => i.publicId !== publicId));
  };

  return (
    <div>
      <label className="label-luxe">Reference images (up to {max})</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {images.map((img) => (
          <div key={img.publicId} className="relative border border-border bg-bg-tertiary">
            <img src={img.url} alt={img.alt || ''} className="w-full aspect-square object-cover" />
            <button
              type="button"
              onClick={() => remove(img.publicId)}
              className="absolute top-1 right-1 bg-bg-primary/80 text-status-error w-6 h-6 text-xs"
              aria-label="Remove"
            >×</button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square border border-dashed border-border hover:border-gold text-text-muted hover:text-gold text-xs uppercase tracking-luxe flex items-center justify-center"
          >
            {uploading ? `${progress}%` : '+ Add'}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => handleFiles([...e.target.files])}
        className="hidden"
      />
      <p className="text-xs text-text-muted">Photos of the piece, similar items, or anything that helps us source it.</p>
    </div>
  );
}
