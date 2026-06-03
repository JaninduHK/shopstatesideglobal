export function PlanBenefits({ items }) {
  return (
    <ul className="space-y-3 mt-6">
      {items?.map((b) => (
        <li key={b} className="flex items-start gap-3 text-sm text-text-secondary">
          <span className="text-gold mt-1 text-xs">◆</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
