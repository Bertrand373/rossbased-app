// src/components/Shared/Footer.js
import React from 'react';
import './Footer.css';
import { FaYoutube, FaDiscord } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-branding">
          <span className="footer-text">
            Created by <strong>rossbased</strong> • Part of the rossbased ecosystem
          </span>
        </div>
        
        <div className="footer-social">
          <a 
            href="https://youtube.com/@rossbased" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link youtube-link"
            title="Subscribe to rossbased on YouTube"
          >
            <FaYoutube />
            <span>Subscribe</span>
          </a>
          
          <a 
            href="https://discord.gg/your-discord-invite" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-link discord-link"
            title="Join our Discord community"
          >
            <FaDiscord />
            <span>Discord</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;