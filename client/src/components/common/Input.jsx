import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="mb-5">
      {label && (
        <label htmlFor={inputId} className="label-luxe">
          {label}
        </label>
      )}
      <input id={inputId} ref={ref} className={`input-luxe ${className}`} {...rest} />
      {error && <p className="mt-2 text-xs text-status-error">{error}</p>}
    </div>
  );
});
