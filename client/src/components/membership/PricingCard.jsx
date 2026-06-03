import { formatNaira } from '../../utils/formatCurrency.js';
import { PlanBenefits } from './PlanBenefits.jsx';

export function PricingCard({ plan }) {
  return (
    <div className="bg-bg-secondary border border-gold p-8">
      <p className="text-xs uppercase tracking-luxe text-gold mb-2">{plan.name}</p>
      <h2 className="font-display text-4xl">{formatNaira(plan.monthly)}<span className="text-text-muted text-sm ml-2">/ month</span></h2>
      <PlanBenefits items={plan.benefits} />
    </div>
  );
}
