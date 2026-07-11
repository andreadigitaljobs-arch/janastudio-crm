import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, CreditCard, Loader2, Calendar } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { ModalShield } from '../context/ModalContext';
import JanaDatePicker from './JanaDatePicker';
import AnimatedModal from './AnimatedModal';
import { formatName } from '../utils/stringUtils';
import { useScrollLock } from '../hooks/useScrollLock';

const NewClientModal = ({ isOpen, onClose, onSuccess, onClientCreated }) => {
  const { showToast } = useNotifs();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    id_card: '',
    birth_date: ''
  });

  useScrollLock(isOpen);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.id_card) {
      showToast('Por favor completa todos los campos.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Check for duplicate id_card
      const existing = await dataService.checkClientExists(formData.id_card);
      if (existing) {
        showToast(`La cédula ${formData.id_card} ya está registrada a nombre de ${existing.name}.`, 'warning');
        setLoading(false);
        return;
      }

      const newClient = await dataService.addClient(formData);
      
      showToast(`Cliente ${newClient.name} registrado con éxito`);
      if (onSuccess) onSuccess(newClient);
      if (onClientCreated) onClientCreated(newClient);
      onClose();
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation code
        showToast('Esta cédula ya está registrada en el sistema.', 'error');
      } else {
        showToast('Error de conexión con la base de datos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div className={overlayClass} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.4)', 
            backdropFilter: 'blur(10px)', 
            zIndex: 10000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px' 
          }}>
            <div className={`glass-card ${cardClass}`} style={{ 
              maxWidth: '460px', 
              width: '100%', 
              borderRadius: '24px', 
              border: '1px solid var(--border-color)',
              padding: '32px',
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 24px 70px rgba(38, 24, 28, 0.28)',
              position: 'relative'
            }}>
              <button 
                onClick={onClose} 
                style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  right: '24px', 
                  background: 'rgba(212,160,154,0.1)', 
                  border: 'none', 
                  color: 'var(--text-primary)', 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <X size={18} />
              </button>

              <header style={{ marginBottom: '26px', paddingRight: '46px' }}>
                <h2 style={{ 
                  fontSize: '22px', 
                  fontWeight: '800', 
                  color: 'var(--text-primary)', 
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="white" />
                  </div>
                  Nuevo Cliente
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Completa los datos para registrarlo en el sistema.
                </p>
              </header>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="jana-client-field">
                  <label className="jana-client-label">
                    Nombre y Apellido
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User className="jana-client-input-icon" size={18} />
                    <input 
                      autoFocus
                      className="jana-client-input"
                      type="text" 
                      placeholder="Ej. Juan Pérez" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: formatName(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="jana-client-field">
                  <label className="jana-client-label">
                    Teléfono
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone className="jana-client-input-icon" size={18} />
                    <input 
                      className="jana-client-input"
                      type="tel" 
                      placeholder="Ej. 04121234567" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="jana-client-field">
                  <label className="jana-client-label">
                    Cédula de Identidad
                  </label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard className="jana-client-input-icon" size={18} />
                    <input 
                      className="jana-client-input"
                      type="text" 
                      placeholder="Ej. 25.123.456" 
                      value={formData.id_card}
                      onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                    />
                  </div>
                </div>

                <div className="jana-client-field">
                  <label className="jana-client-label">
                    Fecha de Nacimiento
                  </label>
                  <JanaDatePicker
                    variant="light"
                    inputClassName="jana-client-input"
                    inputStyle={{ paddingLeft: '48px' }}
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button 
                    type="button"
                    onClick={onClose} 
                    className="jana-client-secondary-btn"
                    style={{ 
                      flex: 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-pink" 
                    style={{ flex: 1.5, height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'REGISTRAR'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default NewClientModal;
