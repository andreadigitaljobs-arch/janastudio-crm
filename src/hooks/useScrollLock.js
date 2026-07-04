import { useEffect } from 'react';

let globalOpenModalsCount = 0;

export const useScrollLock = (isOpen) => {
  useEffect(() => {
    let wasOpen = false;

    if (isOpen) {
      wasOpen = true;
      globalOpenModalsCount++;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    
    return () => {
      if (wasOpen) {
        globalOpenModalsCount--;
        if (globalOpenModalsCount <= 0) {
          globalOpenModalsCount = 0;
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          document.body.classList.remove('modal-open');
        }
      }
    };
  }, [isOpen]);
};
