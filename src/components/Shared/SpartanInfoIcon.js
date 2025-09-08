// components/Shared/SpartanInfoIcon.js - Reusable Spartan helmet for informational banners
import React from 'react';
import './SpartanInfoIcon.css';

const SpartanInfoIcon = ({ 
  size = 'default', // 'small', 'default', 'large'
  className = ''
}) => {
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'block';
  };

  return (
    <div className={`spartan-info-icon-container ${size} ${className}`}>
      <img 
        className="spartan-info-helmet" 
        src="/helmet.png" 
        alt="Info" 
        onError={handleImageError}
      />
      <div className="spartan-info-helmet-fallback" style={{ display: 'none' }}>
        ⚔️
      </div>
    </div>
  );
};

export default SpartanInfoIcon;