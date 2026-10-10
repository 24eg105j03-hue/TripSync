import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...rest
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'lg' ? 'btn-lg' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'lg' ? 20 : 18} />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
