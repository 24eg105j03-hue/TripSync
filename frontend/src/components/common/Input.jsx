import React, { useId } from 'react';

const Input = ({
  label,
  type = 'text',
  error,
  icon: Icon,
  className = '',
  ...rest
}) => {
  const id = useId();

  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <Icon size={18} />
          </div>
        )}
        <input
          id={id}
          type={type}
          className={`input-field ${error ? 'input-error' : ''}`}
          style={Icon ? { paddingLeft: '40px' } : {}}
          {...rest}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

export default Input;
