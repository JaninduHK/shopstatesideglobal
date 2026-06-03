import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload.js';

export function ImageUploaderAdmin({ images, onChange }) {
  const fileRef = useRef(null);
  const { upload, uploading, progress } = useCloudinaryUpload('products');

  const handleFiles = async (files) => {
    for (const file of files) {
      try {
        const img = await upload(file);
        onChange([
          ...images,
          { ...img, isPrimary: images.length === 0 },
        ]);
      } catch (err) {
        toast.error(err.message || 'Upload failed');
      }
    }
  };

  const remove = (publicId) => {
    const next = images.filter((i) => i.publicId !== publicId);
    if (!next.some((i) => i.isPrimary) && next[0]) next[0].isPrimary = true;
    onChange(next);
  };

  const setPrimary = (publicId) => {
    onChange(images.map((i) => ({ ...i, isPrimary: i.publicId === publicId })));
  };

  return (
    <div>
      <label className="label-luxe">Images</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {images.map((img) => (
          <div key={img.publicId} className={`relative border ${img.isPrimary ? 'border-gold' : 'border-border'} bg-bg-tertiary`}>
            <img src={img.url} alt={img.alt || ''} className="w-full aspect-square object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-bg-primary/80 p-1 flex justify-between items-center text-[10px]">
              <button onClick={() => setPrimary(img.publicId)} className={img.isPrimary ? 'text-gold' : 'text-text-secondary hover:text-gold'}>
                {img.isPrimary ? 'Primary' : 'Set primary'}
              </button>
              <button onClick={() => remove(img.publicId)} className="text-status-error">Remove</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="aspect-square border border-dashed border-border hover:border-gold text-text-muted hover:text-gold text-xs uppercase tracking-luxe flex items-center justify-center"
        >
          {uploading ? `${progress}%` : '+ Add'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => handleFiles([...e.target.files])}
        className="hidden"
      />
      <p className="text-xs text-text-muted">First image becomes primary unless set otherwise. Max 5MB each.</p>
    </div>
  );
}
