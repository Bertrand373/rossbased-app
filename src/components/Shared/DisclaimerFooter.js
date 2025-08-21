// src/components/Shared/DisclaimerFooter.js
import React from 'react';
import './DisclaimerFooter.css';

const DisclaimerFooter = () => {
  return (
    <footer className="disclaimer-footer">
      <div className="disclaimer-content">
        <div className="disclaimer-section">
          <p className="disclaimer-text medical">
            <strong>Medical Disclaimer:</strong> This app is for educational and tracking purposes only. 
            It is not intended to diagnose, treat, cure, or prevent any medical condition. 
            Always consult with qualified healthcare professionals for medical advice.
          </p>
        </div>
        
        <div className="disclaimer-section">
          <p className="disclaimer-text crisis">
            <strong>Crisis Support:</strong> If you're experiencing a mental health crisis, 
            contact emergency services or call the <strong>988 Suicide & Crisis Lifeline</strong> (US) 
            or your local emergency number immediately.
          </p>
        </div>
        
        <div className="disclaimer-section">
          <p className="disclaimer-text privacy">
            <strong>Privacy Notice:</strong> Your personal data is stored securely and is not shared 
            with third parties. However, no digital platform is 100% secure. 
            Avoid entering highly sensitive personal information.
          </p>
        </div>
        
        <div className="disclaimer-section">
          <p className="disclaimer-text responsibility">
            <strong>User Responsibility:</strong> This tool supports your recovery journey but 
            cannot replace professional treatment, therapy, or medical supervision. 
            Recovery outcomes depend on individual circumstances and professional support.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default DisclaimerFooter;