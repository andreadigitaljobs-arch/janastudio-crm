import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particles = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const isSparkle = Math.random() > 0.7;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        baseX: Math.random() * canvas.width,
        baseY: Math.random() * canvas.height,
        size: isSparkle ? Math.random() * 1.5 + 0.8 : Math.random() * 1.2 + 0.4,
        speedX: Math.random() * 0.3 - 0.15,
        speedY: Math.random() * -0.4 - 0.1,
        opacity: Math.random() * 0.3 + 0.1,
        baseOpacity: Math.random() * 0.25 + 0.1,
        color: isSparkle
          ? '#c48b9f'
          : Math.random() > 0.5
            ? '#d4a09a'
            : '#e8c4be',
        isSparkle,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleAngle: Math.random() * Math.PI,
        waveRange: Math.random() * 15 + 5,
        waveSpeed: Math.random() * 0.01 + 0.002,
        waveAngle: Math.random() * Math.PI,
        offsetX: 0,
        offsetY: 0
      });
    }

    const orbs = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3, radius: 250, color: 'rgba(196, 139, 159, 0.06)', speedX: 0.05, speedY: 0.03, angle: 0 },
      { x: canvas.width * 0.8, y: canvas.height * 0.7, radius: 300, color: 'rgba(160, 80, 106, 0.04)', speedX: -0.04, speedY: 0.05, angle: Math.PI }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      orbs.forEach(orb => {
        orb.angle += 0.0005;
        const currentX = orb.x + Math.cos(orb.angle) * 50;
        const currentY = orb.y + Math.sin(orb.angle) * 50;

        const gradient = ctx.createRadialGradient(
          currentX, currentY, 0,
          currentX, currentY, orb.radius
        );
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(currentX, currentY, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      particles.forEach(p => {
        p.y += p.speedY;
        p.waveAngle += p.waveSpeed;
        p.x += p.speedX + Math.sin(p.waveAngle) * 0.15;

        if (p.isSparkle) {
          p.twinkleAngle += p.twinkleSpeed;
          p.opacity = p.baseOpacity + Math.sin(p.twinkleAngle) * 0.15;
        }

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 180;

          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            const angle = Math.atan2(dy, dx);
            const targetOffsetX = Math.cos(angle) * force * 22;
            const targetOffsetY = Math.sin(angle) * force * 22;

            p.offsetX += (targetOffsetX - p.offsetX) * 0.1;
            p.offsetY += (targetOffsetY - p.offsetY) * 0.1;
          } else {
            p.offsetX *= 0.95;
            p.offsetY *= 0.95;
          }
        } else {
          p.offsetX *= 0.95;
          p.offsetY *= 0.95;
        }

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.offsetX = 0;
          p.offsetY = 0;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + p.offsetX, p.y + p.offsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

export default ParticleBackground;
