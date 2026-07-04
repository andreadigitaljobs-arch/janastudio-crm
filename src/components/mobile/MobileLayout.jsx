import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';
import logo from '../../assets/logo.png';

const MobileLayout = ({ children, activeTab, setActiveTab, onOpenSale, rates, activeRateType, onToggleRateType }) => {
  const { logout } = useAuth();
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Sticky Brand Header */}
      <header style={{ 
        flexShrink: 0,
        height: '60px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: 'var(--bg-primary)',
        zIndex: 100,
      }}>
        <div style={{ width: '40px' }} /> {/* Spacer */}
        <img src={logo} alt="Astro Barber" style={{ height: '30px', width: 'auto' }} />
        <button 
          onClick={logout}
          style={{ background: 'none', border: 'none', color: '#ff453a', padding: '10px' }}
        >
          <LogOut size={20} />
        </button>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '10px 20px 120px 20px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </div>

      <MobileBottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSale={onOpenSale} 
        rates={rates}
        activeRateType={activeRateType}
        onToggleRateType={onToggleRateType}
      />

      <style>{`
        body {
          overflow: hidden;
          background-color: var(--bg-primary);
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;
