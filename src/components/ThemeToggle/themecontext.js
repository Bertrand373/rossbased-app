/* ThemeContext.js - For managing theme state across the app */
import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check local storage or default to dark mode
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme : 'dark';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  // Apply theme class to body when theme changes
  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
