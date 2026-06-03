const VARIANTS = {
  gold: 'btn-gold',
  ghost: 'btn-ghost',
};

export function Button({
  variant = 'gold',
  type = 'button',
  className = '',
  disabled,
  loading,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${VARIANTS[variant] || VARIANTS.gold} ${className}`}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  );
}
