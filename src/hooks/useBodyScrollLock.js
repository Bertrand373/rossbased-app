// src/hooks/useBodyScrollLock.js
// Locks body scroll when modal is open, unlocks when closed

import { useEffect, useRef } from 'react';

const useBodyScrollLock = (isLocked) => {
  const scrollYRef = useRef(0);
  
  useEffect(() => {
    if (isLocked) {
      // Save current scroll position
      scrollYRef.current = window.scrollY;
      
      // Lock body
      document.body.classList.add('modal-open');
      document.body.style.top = `-${scrollYRef.current}px`;
    } else {
      // Only unlock if class exists (prevents running on initial mount)
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollYRef.current);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollYRef.current);
      }
    };
  }, [isLocked]);
};

export default useBodyScrollLock;