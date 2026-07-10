import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const slides = [
  {
    image: '/assets/onboarding/slide1.png',
    title: 'Tu estudio, en la palma de tu mano.',
    subtitle: 'Bienvenida al nuevo sistema de gestión de Jana Studio. Todo lo que necesitas, ahora en un solo lugar.',
  },
  {
    image: '/assets/onboarding/slide2.png',
    title: 'Control total de tus citas.',
    subtitle: 'Organiza tu agenda, revisa tus comisiones y bríndale la mejor experiencia de lujo a cada clienta.',
  },
  {
    image: '/assets/onboarding/slide3.png',
    title: 'Eleva el nivel de tu trabajo.',
    subtitle: 'Diseñado exclusivamente para el equipo de Jana Studio. Inicia sesión y comencemos a brillar.',
  }
];

export default function OnboardingModule({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const splash = document.getElementById('splash-loader');
    if (splash) {
      splash.style.transition = 'opacity 0.4s ease';
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
    }
  }, []);

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <style>{`
        .onboarding-wrapper {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #fcf9f8;
          display: flex;
          overflow: hidden;
        }

        .onboarding-image-panel {
          flex: 1;
          position: relative;
          background: #111;
          display: flex;
        }

        .onboarding-images {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .onboarding-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .onboarding-img.active {
          opacity: 1;
        }

        .onboarding-gradient {
          display: none;
        }

        .onboarding-content-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          position: relative;
          z-index: 10;
        }

        .onboarding-content-inner {
          max-width: 450px;
          text-align: center;
        }

        .onboarding-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2.5rem;
          color: #2d1b22;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 20px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.2s;
        }

        .onboarding-subtitle {
          font-size: 1.1rem;
          color: #7a6065;
          line-height: 1.6;
          margin-bottom: 40px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.3s;
        }

        .onboarding-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.4s;
        }

        .onboarding-dots {
          display: flex;
          gap: 10px;
        }

        .onboarding-dot {
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background: #f6e6e2;
          transition: all 0.4s ease;
        }

        .onboarding-dot.active {
          width: 30px;
          background: #c97282;
        }

        .onboarding-btn {
          background: linear-gradient(135deg, #c97282 0%, #a0506a 100%);
          color: white;
          border: none;
          padding: 16px 40px;
          border-radius: 100px;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(212, 160, 154, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .onboarding-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(212, 160, 154, 0.4);
        }

        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile specific styles */
        @media (max-width: 900px) {
          .onboarding-wrapper {
            flex-direction: column;
          }
          
          .onboarding-image-panel {
            position: absolute;
            inset: 0;
            height: 65vh; /* Limit image height to allow solid cream at bottom */
          }

          .onboarding-content-panel {
            position: absolute;
            inset: 0;
            justify-content: flex-end;
            padding: 30px 20px 50px 20px;
            background: transparent;
          }

          .onboarding-gradient {
            display: block;
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom, rgba(252,249,248,0) 0%, rgba(252,249,248,0) 75%, rgba(252,249,248,0.9) 90%, #fcf9f8 100%);
            z-index: 5;
          }

          .onboarding-title {
            color: #2d1b22;
            font-size: 2.2rem;
            text-shadow: none;
          }

          .onboarding-subtitle {
            color: #7a6065;
            text-shadow: none;
            font-weight: 500;
          }

          .onboarding-dot {
            background: #e8cac5;
          }
          
          .onboarding-dot.active {
            background: #c97282;
          }
          
          .onboarding-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="onboarding-image-panel">
        <div className="onboarding-images">
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.image}
              alt="Jana Studio"
              className={`onboarding-img ${index === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
        <div className="onboarding-gradient" />
      </div>

      <div className="onboarding-content-panel">
        <div className="onboarding-content-inner" key={currentSlide}>
          <h1 className="onboarding-title">{slides[currentSlide].title}</h1>
          <p className="onboarding-subtitle">{slides[currentSlide].subtitle}</p>
          
          <div className="onboarding-controls">
            <div className="onboarding-dots">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`onboarding-dot ${index === currentSlide ? 'active' : ''}`}
                />
              ))}
            </div>
            
            <button className="onboarding-btn" onClick={handleNext}>
              {currentSlide === slides.length - 1 ? 'Empezar' : 'Siguiente'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
