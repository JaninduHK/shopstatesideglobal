export const REQUEST_STATUS_LABEL = {
  pending_payment: 'Pending fee',
  submitted: 'Submitted',
  under_review: 'Under review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  awaiting_additional_payment: 'Awaiting payment',
  additional_paid: 'Payment received',
  sourcing: 'Sourcing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const COLOR = {
  pending_payment: 'text-status-warning',
  submitted: 'text-status-info',
  under_review: 'text-status-info',
  accepted: 'text-status-info',
  rejected: 'text-text-muted',
  awaiting_additional_payment: 'text-status-warning',
  additional_paid: 'text-status-info',
  sourcing: 'text-status-info',
  ready: 'text-gold',
  completed: 'text-status-success',
  cancelled: 'text-text-muted',
};

export function RequestStatusBadge({ status }) {
  return (
    <span className={`text-xs uppercase tracking-luxe ${COLOR[status] || 'text-text-secondary'}`}>
      {REQUEST_STATUS_LABEL[status] || status}
    </span>
  );
}
