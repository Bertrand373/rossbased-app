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
            Built with 💪 by <strong>rossbased</strong>
          </span>
          <span className="footer-tagline">
            Helping you stay strong, one day at a time
          </span>
        </div>
        
        <div className="footer-social">
          <a 
            href="https://youtube.com/@rossbased" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-btn youtube-btn"
            title="Subscribe for more content"
          >
            <FaYoutube />
            <span>Subscribe</span>
          </a>
          
          <a 
            href="https://discord.gg/RDFC5eUtuA" 
            target="_blank" 
            rel="noopener noreferrer"
            className="social-btn discord-btn"
            title="Join our supportive community"
          >
            <FaDiscord />
            <span>Community</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;