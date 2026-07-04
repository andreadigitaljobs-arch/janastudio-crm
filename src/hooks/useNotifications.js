import { useState, useCallback } from 'react';

export const useNotifications = () => {
  const [toasts, setToasts] = useState([]);

  // --- UI TOASTS (Alertas Visuales) ---
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // --- BROWSER PUSH NOTIFICATIONS ---
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones.', 'error');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('¡Notificaciones activadas con éxito!', 'success');
      return true;
    } else {
      showToast('Permiso de notificaciones denegado.', 'error');
      return false;
    }
  };

  const sendPushNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Default icon
        badge: '/favicon.ico',
        tag: 'astro-alert',
        renotify: true
      });
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    const colors = ['#d4af37', '#f9d976', '#ffffff', '#c0c0c0'];
    const count = 40;
    
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.width = Math.random() * 10 + 5 + 'px';
      p.style.height = Math.random() * 10 + 5 + 'px';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = Math.random() * 3 + 2 + 's';
      p.style.opacity = Math.random();
      document.body.appendChild(p);
      
      // Cleanup
      setTimeout(() => p.remove(), 5000);
    }
  }, []);

  const triggerRocket = useCallback(() => {
    // 1. Create Rocket
    const container = document.createElement('div');
    container.className = 'rocket-container';
    container.innerHTML = `
      <div class="rocket-body">
        🚀
        <div class="rocket-trail"></div>
      </div>
    `;
    document.body.appendChild(container);

    // 2. Spawn Smoke/Fire Particles
    const spawnSmoke = () => {
      for(let i=0; i<15; i++) {
        setTimeout(() => {
          const s = document.createElement('div');
          s.className = 'rocket-smoke';
          s.style.left = (50 + (Math.random() * 10 - 5)) + '%';
          s.style.backgroundColor = i % 2 === 0 ? 'var(--gold-primary)' : '#ff4500';
          document.body.appendChild(s);
          setTimeout(() => s.remove(), 1500);
        }, i * 50);
      }
    };
    
    spawnSmoke();

    // 3. Cleanup
    setTimeout(() => container.remove(), 3000);
  }, []);

  return {
    toasts,
    showToast,
    requestPushPermission,
    sendPushNotification,
    triggerConfetti,
    triggerRocket
  };
};
