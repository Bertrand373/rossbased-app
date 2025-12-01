/* MobileNavigation.css - TITANTRACK */

.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  
  display: flex;
  justify-content: space-around;
  align-items: center;
  
  height: 64px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 150ms ease;
}

.nav-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.02em;
  transition: color 150ms ease;
}

.nav-indicator {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: transparent;
  transition: all 150ms ease;
}

/* Active state */
.nav-item.active .nav-label {
  color: #ffffff;
}

.nav-item.active .nav-indicator {
  background-color: #ffffff;
}

/* Hover - only on devices that support it */
@media (hover: hover) {
  .nav-item:hover .nav-label {
    color: rgba(255, 255, 255, 0.7);
  }
}

/* Larger phones */
@media (min-width: 390px) {
  .nav-label {
    font-size: 0.75rem;
  }
  
  .nav-item {
    padding: 8px 16px;
  }
}

/* Small phones */
@media (max-width: 350px) {
  .nav-label {
    font-size: 0.625rem;
  }
  
  .nav-item {
    padding: 8px;
  }
}

/* Landscape */
@media (max-height: 500px) and (orientation: landscape) {
  .mobile-nav {
    height: 52px;
  }
  
  .nav-item {
    flex-direction: row;
    gap: 8px;
  }
  
  .nav-indicator {
    display: none;
  }
  
  .nav-item.active .nav-label {
    color: #ffffff;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .nav-label,
  .nav-indicator {
    transition: none;
  }
}