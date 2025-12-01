// src/components/Shared/SpartanLoader.js
import React from 'react';
import './SpartanLoader.css';

const SpartanLoader = ({ size = 48 }) => {
  return (
    <div className="spartan-loader-container">
      <img 
        src="/icon-192.png"
        alt="" 
        className="spartan-loader-icon"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default SpartanLoader;