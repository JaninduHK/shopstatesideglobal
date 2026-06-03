import { useState } from 'react';

export function ProductGallery({ images = [], title }) {
  const sorted = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const [activeIdx, setActiveIdx] = useState(0);
  const active = sorted[activeIdx];

  if (!sorted.length) {
    return <div className="aspect-square bg-bg-secondary border border-border" />;
  }

  return (
    <div className="grid grid-cols-[80px_1fr] gap-4">
      <div className="flex flex-col gap-2">
        {sorted.map((img, i) => (
          <button
            key={img._id || i}
            onClick={() => setActiveIdx(i)}
            className={`aspect-square overflow-hidden border ${i === activeIdx ? 'border-gold' : 'border-border'}`}
          >
            <img src={img.url} alt={img.alt || `${title} ${i}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <div className="aspect-[3/4] bg-bg-secondary border border-border overflow-hidden">
        <img src={active.url} alt={active.alt || title} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
