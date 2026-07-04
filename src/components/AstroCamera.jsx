import React, { useRef, useState } from 'react';
import { Camera, X, Check, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

/**
 * AstroCamera - Un componente premium para capturar o subir fotos.
 * Diseñado para permitir ambas opciones desde el primer momento.
 */
const AstroCamera = ({ onCapture, onClose, overlayClass, cardClass }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        setError(null);
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      setError("Cámara no disponible, pero puedes subir fotos.");
      console.warn("Camera access failed:", err);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      
      // Calculate optimized dimensions (max 1000px)
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxDim = 1000;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError("Comprimiendo imagen...");
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setCapturedImage(dataUrl);
          setError(null);
          stopCamera();
        };
        img.onerror = () => {
          setError("Error al procesar la imagen.");
        };
      };
      reader.onerror = () => {
        setError("Error al leer el archivo.");
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    onCapture(capturedImage);
    stopCamera();
    onClose();
  };

  React.useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  return (
    <div className={overlayClass || 'animate-fade-in'} style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.98)',
      backdropFilter: 'blur(15px)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Header with Close */}
      <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 12 }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '1px' }}>ASTRO REC</div>
        <button 
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Viewport */}
      <div className={cardClass || 'animate-scale-in'} style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '400px',
        maxHeight: 'calc(100vh - 220px)',
        aspectRatio: '3/4', 
        backgroundColor: '#050505', 
        overflow: 'hidden', 
        borderRadius: '40px', 
        border: '1.5px solid rgba(212,175,55,0.3)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9)' 
      }}>
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: error ? 0.3 : 1 }} 
            />
            
            {/* Visual Guides */}
            {!error && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(212,175,55,0.2)', width: '70%', height: '70%', borderRadius: '20px', pointerEvents: 'none' }} />
            )}

            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                <ImageIcon size={48} color="rgba(212,175,55,0.3)" style={{ marginBottom: '20px' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '500', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}
            
            {/* Action Bar (Simplified & Integrated) */}
            <div style={{ 
              position: 'absolute', 
              bottom: '0', 
              left: 0, 
              right: 0, 
              padding: '32px', 
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '40px' 
            }}>
              {/* Option 1: Gallery */}
              <button 
                onClick={() => fileInputRef.current.click()}
                className="hover-scale"
                style={{ 
                  width: '56px', height: '56px', borderRadius: '18px', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                }}
              >
                <Upload size={20} />
                <span style={{ fontSize: '8px', fontWeight: '900', marginTop: '4px' }}>GALERÍA</span>
              </button>

              {/* Option 2: Live Shutter */}
              <button 
                onClick={takePhoto}
                disabled={!!error}
                style={{
                  width: '84px', height: '84px', borderRadius: '50%', 
                  border: '4px solid white', 
                  backgroundColor: error ? 'rgba(255,255,255,0.05)' : 'rgba(212, 175, 55, 0.2)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: error ? 'not-allowed' : 'pointer',
                  opacity: error ? 0.3 : 1
                }}
              >
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  backgroundColor: 'white',
                  animation: !error ? 'shutterPulse 2s infinite' : 'none'
                }} />
              </button>

              <div style={{ width: '56px' }} /> {/* Spacer for balance */}
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <img src={capturedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px' }}>
              <button 
                onClick={retake}
                style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
              >
                <RefreshCw size={24} />
              </button>
              <button 
                onClick={confirm}
                style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', border: 'none', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 25px rgba(212,175,55,0.4)' }}
              >
                <Check size={32} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {!capturedImage ? "Capturar • Subir" : "Previsualización Elite"}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes shutterPulse { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .hover-scale:hover { transform: scale(1.1); background-color: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
};

export default AstroCamera;
