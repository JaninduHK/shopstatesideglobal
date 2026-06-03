export function Loader({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-muted">
      <div className="h-8 w-8 border border-gold/40 border-t-gold rounded-full animate-spin" />
      {label && <span className="text-xs uppercase tracking-luxe">{label}</span>}
    </div>
  );
}
