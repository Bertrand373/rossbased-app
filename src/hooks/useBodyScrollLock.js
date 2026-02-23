// src/hooks/useBodyScrollLock.js
// Locks body scroll when modal is open, unlocks when closed
// Uses overflow:hidden only — no position:fixed hack (which caused nav jump on close)

import { useEffect } from 'react';

const useBodyScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      document.body.classList.add('modal-open');
    } else {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
      }
    }

    // Cleanup on unmount
    return () => {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
      }
    };
  }, [isLocked]);
};

export default useBodyScrollLock;
