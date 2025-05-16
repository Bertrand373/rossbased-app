/* components/ThemeToggle/ThemeToggle.js */
import React, { useContext } from 'react';
import { ThemeContext } from '../../ThemeContext';
import './ThemeToggle.css';

// Icons
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button 
      className="theme-toggle-btn" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <FaMoon className="theme-icon" />
      ) : (
        <FaSun className="theme-icon" />
      )}
    </button>
  );
};

export default ThemeToggle;