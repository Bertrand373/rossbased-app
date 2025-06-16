// src/components/Shared/SpartanLoader.js - FIXED to be truly responsive - simpler approach
import React from 'react';
import './SpartanLoader.css';
import helmetImage from '../../assets/helmet.png';

const SpartanLoader = ({ 
  size = 80, 
  message = "Loading...", 
  showMessage = true,
  animationType = "default" // default, intense, breathing, warrior
}) => {
  
  // Choose animation class based on type
  const getAnimationClass = () => {
    switch(animationType) {
      case "intense":
        return "spartan-helmet-intense";
      case "breathing": 
        return "spartan-helmet-breathing";
      case "warrior":
        return "spartan-helmet-warrior";
      default:
        return "spartan-helmet-image";
    }
  };

  return (
    <div className="spartan-loader-container">
      <div className="spartan-loader-animation">
        <img 
          src={helmetImage}
          alt="Loading" 
          className={getAnimationClass()}
        />
      </div>
      {showMessage && (
        <p className="spartan-loader-message">{message}</p>
      )}
    </div>
  );
};

export default SpartanLoader;