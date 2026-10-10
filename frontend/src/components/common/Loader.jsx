import React from 'react';

const Loader = ({ text }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <div className="loader"></div>
      {text && <p className="text-secondary mt-md">{text}</p>}
    </div>
  );
};

export default Loader;
