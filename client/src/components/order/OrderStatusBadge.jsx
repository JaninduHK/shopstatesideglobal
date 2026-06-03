const STATUS_LABEL = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const STATUS_COLOR = {
  pending_payment: 'text-status-warning',
  confirmed: 'text-status-info',
  processing: 'text-status-info',
  shipped: 'text-status-info',
  delivered: 'text-status-success',
  cancelled: 'text-text-muted',
  returned: 'text-text-muted',
};

export function OrderStatusBadge({ status }) {
  return (
    <span className={`text-xs uppercase tracking-luxe ${STATUS_COLOR[status] || 'text-text-secondary'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export { STATUS_LABEL };
