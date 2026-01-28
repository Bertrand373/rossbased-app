// src/components/Shared/SpartanLoader.js
import React from 'react';
import './SpartanLoader.css';

const SpartanLoader = ({ size = 48 }) => {
  // Get current theme for icon selection
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const iconSrc = theme === 'light' ? '/icon-192-black.png' : '/icon-192.png';
  
  return (
    <div className="spartan-loader-container">
      <img 
        src={iconSrc}
        alt="" 
        className="spartan-loader-icon"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default SpartanLoader;
