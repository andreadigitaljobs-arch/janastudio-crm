import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const slides = [
  {
    image: '/assets/onboarding/desktop1.png',
    mobileImage: '/assets/onboarding/mobile1.png',
    desktopDark: ['Tu estudio,', 'en la palma de'],
    titleLine1: 'Tu estudio, en la',
    titlePrefix: 'palma de ',
    titleAccent: 'tu mano.',
    subtitle: 'Bienvenida al nuevo sistema de gestión de Jana Studio. Todo lo que necesitas, ahora en un solo lugar.',
  },
  {
    image: '/assets/onboarding/desktop2.png',
    mobileImage: '/assets/onboarding/mobile2.png',
    desktopDark: ['Control total de'],
    titleLine1: 'Control total',
    titlePrefix: 'de ',
    titleAccent: 'tus citas.',
    subtitle: 'Organiza tu agenda, revisa tus comisiones y bríndale la mejor experiencia de lujo a cada clienta.',
  },
  {
    image: '/assets/onboarding/desktop3.png',
    mobileImage: '/assets/onboarding/mobile3.png',
    desktopDark: ['Eleva el nivel de'],
    titleLine1: 'Eleva el nivel',
    titlePrefix: 'de ',
    titleAccent: 'tu trabajo.',
    subtitle: 'Diseñado exclusivamente para el equipo de Jana Studio. Inicia sesión y comencemos a brillar.',
  }
];

function renderSubtitle(text) {
  const parts = text.split('Jana Studio');
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && <strong className="onboarding-subtitle-strong">Jana Studio</strong>}
    </React.Fragment>
  ));
}

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
          background: #f1e9e3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow: hidden;
        }

        .onboarding-card {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 36px;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(61, 27, 34, 0.18);
          opacity: 0;
          animation: fadeImageIn 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes fadeImageIn {
          0% {
            opacity: 0;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
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

        .onboarding-logo {
          position: absolute;
          top: 5%;
          left: 6%;
          width: clamp(120px, 11vw, 180px);
          height: auto;
          z-index: 10;
        }

        .onboarding-content-panel {
          position: absolute;
          left: 6%;
          right: 44%;
          top: 0;
          bottom: 0;
          padding-top: clamp(140px, 22%, 240px);
          padding-bottom: 40px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
        }

        .onboarding-content-inner {
          max-width: 560px;
          text-align: left;
        }

        .onboarding-title-mobile {
          display: none;
        }

        .onboarding-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.9rem, 4.6vw, 4.1rem);
          letter-spacing: -1px;
          color: #2d1b22;
          font-weight: 800;
          line-height: 1.16;
          margin-bottom: 0;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.2s;
        }

        .onboarding-title-accent {
          color: #c97282;
        }

        .onboarding-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0 24px 0;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.25s;
        }

        .onboarding-divider-line {
          width: 44px;
          height: 1px;
          background: rgba(201, 114, 130, 0.35);
        }

        .onboarding-subtitle {
          font-size: clamp(1.15rem, 1.35vw, 1.4rem);
          color: #7a6065;
          line-height: 1.6;
          font-weight: 400;
          max-width: 460px;
          margin: 0 0 34px 0;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.3s;
        }

        .onboarding-subtitle-strong {
          font-weight: 800;
          color: #2d1b22;
        }

        .onboarding-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.6s forwards 0.4s;
        }

        .onboarding-dots {
          display: flex;
          gap: 8px;
          order: 2;
        }

        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e8cac5;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .onboarding-dot.active {
          width: 11px;
          height: 11px;
          background: #c97282;
        }

        .onboarding-btn {
          background: linear-gradient(135deg, #c97282 0%, #a0506a 100%);
          color: white;
          border: none;
          padding: 18px 45px;
          border-radius: 100px;
          font-size: clamp(1.05rem, 1.1vw, 1.2rem);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(212, 160, 154, 0.4);
          transition: transform 0.3s, box-shadow 0.3s;
          order: 1;
        }

        .onboarding-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(212, 160, 154, 0.5);
        }

        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .onboarding-mobile-images { display: none; }
        .onboarding-subtitle-strong { font-weight: 800; }
        .onboarding-scrim { display: none; }

        /* Mobile specific styles — also applies to any portrait screen (e.g. iPad Pro 1024x1366) regardless of width */
        @media (max-width: 900px), (orientation: portrait) and (max-width: 1366px) {
          .onboarding-wrapper {
            padding: 0;
            background: #fcf9f8;
          }

          .onboarding-card {
            border-radius: 0;
            box-shadow: none;
          }

          .onboarding-images { display: none; }

          .onboarding-mobile-images {
            display: block;
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }

          .onboarding-mobile-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
            opacity: 0;
            transition: opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }

          .onboarding-mobile-img.active {
            opacity: 1;
          }

          .onboarding-logo {
            top: calc(24px + env(safe-area-inset-top, 0px));
            left: 24px;
            width: 92px;
          }

          .onboarding-content-panel {
            position: absolute;
            left: 0;
            right: 0;
            top: auto;
            bottom: 0;
            transform: none;
            max-width: none;
            justify-content: flex-end;
            align-items: center;
            padding: 30px 24px calc(28px + env(safe-area-inset-bottom, 0px)) 24px;
          }

          .onboarding-content-inner {
            max-width: 450px;
            text-align: center;
          }

          .onboarding-title-mobile {
            display: block;
          }

          .onboarding-title-desktop {
            display: none;
          }

          .onboarding-title {
            color: #2d1b22;
            font-size: clamp(1.9rem, 4.6vw, 2.35rem);
            text-shadow: none;
            text-wrap: balance;
          }

          .onboarding-divider {
            justify-content: center;
            margin: 14px 0 18px;
          }

          .onboarding-divider-line {
            width: 34px;
          }

          .onboarding-subtitle {
            color: #7a6065;
            text-shadow: none;
            font-weight: 500;
            max-width: 380px;
            margin: 0 auto 22px auto;
          }

          .onboarding-controls {
            align-items: center;
            gap: 40px;
          }

          .onboarding-dots {
            gap: 7px;
            order: 1;
          }

          .onboarding-dot {
            width: 7px;
            height: 7px;
          }

          .onboarding-dot.active {
            width: 10px;
            height: 10px;
          }

          .onboarding-btn {
            width: 100%;
            justify-content: center;
            order: 2;
          }
        }

        /* Any tablet portrait (iPad Mini through iPad Pro / Galaxy Tab) — crop the photo higher and scale up text to match the larger canvas */
        @media (min-width: 700px) and (max-width: 1400px) and (orientation: portrait) {
          .onboarding-mobile-img {
            object-position: center 22%;
          }

          .onboarding-title {
            font-size: clamp(2.6rem, 7.2vw, 5rem);
          }

          .onboarding-subtitle {
            font-size: clamp(1.25rem, 2.3vw, 1.85rem);
            max-width: 640px;
          }

          .onboarding-btn {
            font-size: clamp(1.2rem, 2vw, 1.6rem);
            padding: 24px 55px;
          }

          .onboarding-logo {
            width: clamp(120px, 9vw, 170px);
          }

          .onboarding-content-inner {
            max-width: 760px;
          }
        }

        /* Short/squarish portrait screens (e.g. iPhone SE, resized browser windows) — crop the photo higher so text has room and never touches the curve */
        @media (max-height: 780px) and (orientation: portrait) {
          .onboarding-mobile-img {
            object-position: center 16%;
          }

          .onboarding-content-panel {
            padding-top: 16px;
          }

          .onboarding-divider {
            margin: 10px 0 14px;
          }

          .onboarding-subtitle {
            margin-bottom: 14px;
          }

          .onboarding-controls {
            gap: 20px;
          }
        }
      `}</style>

      <div className="onboarding-card">
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
        <div className="onboarding-mobile-images">
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.mobileImage}
              alt="Jana Studio"
              className={`onboarding-mobile-img ${index === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
        <img src="/logo.png" alt="Jana Studio" className="onboarding-logo" />
        <div className="onboarding-scrim" />

        <div className="onboarding-content-panel">
          <div className="onboarding-content-inner" key={currentSlide}>
            <h1 className="onboarding-title onboarding-title-desktop">
              {slides[currentSlide].desktopDark.map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
              <span className="onboarding-title-accent">{slides[currentSlide].titleAccent}</span>
            </h1>
            <h1 className="onboarding-title onboarding-title-mobile">
              {slides[currentSlide].titleLine1}
              <br />
              <span className="onboarding-title-accent">{slides[currentSlide].titlePrefix}{slides[currentSlide].titleAccent}</span>
            </h1>

            <div className="onboarding-divider">
              <span className="onboarding-divider-line" />
              <Sparkles size={13} color="#c97282" />
              <span className="onboarding-divider-line" />
            </div>

            <p className="onboarding-subtitle">{renderSubtitle(slides[currentSlide].subtitle)}</p>

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
    </div>
  );
}
