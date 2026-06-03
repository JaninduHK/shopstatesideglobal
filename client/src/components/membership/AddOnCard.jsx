import { formatNaira } from '../../utils/formatCurrency.js';
import { PlanBenefits } from './PlanBenefits.jsx';

export function AddOnCard({ addon, selected, onToggle, owned }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={owned}
      className={`text-left bg-bg-secondary border p-8 transition-colors duration-200 ease-luxe
        ${owned ? 'border-gold/40 cursor-default' : selected ? 'border-gold' : 'border-border hover:border-border-highlight'}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-luxe text-gold mb-2">Add-on</p>
          <h3 className="font-display text-2xl">{addon.name}</h3>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg">{formatNaira(addon.monthly)}</div>
          <div className="text-xs text-text-muted">/ month</div>
        </div>
      </div>
      <PlanBenefits items={addon.benefits} />
      <div className="mt-6 pt-4 border-t border-border">
        {owned ? (
          <span className="text-xs uppercase tracking-luxe text-gold">Active</span>
        ) : selected ? (
          <span className="text-xs uppercase tracking-luxe text-gold">Selected</span>
        ) : (
          <span className="text-xs uppercase tracking-luxe text-text-muted">Tap to add</span>
        )}
      </div>
    </button>
  );
}
