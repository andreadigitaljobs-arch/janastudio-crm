import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, TrendingUp, Plus, Search, Filter, AlertCircle, X, ChevronRight, CheckCircle2, User, Trash2, CalendarClock, Package, PlayCircle, LayoutGrid, List } from 'lucide-react';
import LaserPackageModal from './LaserPackageModal';
import LaserSessionModal from './LaserSessionModal';
import LaserProgressGallery from './LaserProgressGallery';
import LaserSettingsPanel from './LaserSettingsPanel';
import AnimatedModal from './AnimatedModal';
import { dataService } from '../services/dataService';
import { useDialog } from '../context/DialogContext';

const getLaserStatusPalette = (status) => {
  if (status === 'Vencido') return { background: '#fef2f2', color: '#b42318', border: '#fecaca' };
  if (status === 'Al día') return { background: '#fff0f2', color: '#c97282', border: 'rgba(201,114,130,0.2)' };
  if (status === 'Cuota Pendiente') return { background: '#ffe1e6', color: '#a0506a', border: 'rgba(160,80,106,0.2)' };
  if (['Pagado', 'Completado'].includes(status)) return { background: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.2)' };
  return { background: '#fcf9f8', color: '#a0909a', border: 'rgba(160,144,154,0.2)' };
};

const LaserPackageListRow = ({ pkg, isMobile, onSchedule }) => {
  const statusPalette = getLaserStatusPalette(pkg.status);
  const progress = Math.min(100, (pkg.currentSession / pkg.totalSessions) * 100);

  return (
    <div
      className="agenda-glass-card"
      style={{
        padding: isMobile ? '16px' : '14px 18px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1.5fr) minmax(170px, 1fr) minmax(180px, 1.15fr) minmax(105px, 0.65fr) auto',
        alignItems: 'center',
        gap: isMobile ? '14px' : '20px',
        border: '1px solid rgba(255,255,255,0.78)',
        borderRadius: '18px',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={event => {
        event.currentTarget.style.boxShadow = '0 12px 28px rgba(74,48,54,0.07)';
        event.currentTarget.style.borderColor = 'rgba(201,114,130,0.2)';
      }}
      onMouseLeave={event => {
        event.currentTarget.style.boxShadow = '0 8px 32px rgba(74,48,54,0.04)';
        event.currentTarget.style.borderColor = 'rgba(255,255,255,0.78)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'grid', placeItems: 'center', color: '#c97282', fontWeight: 900, border: '2px solid #fff' }}>
          {pkg.client.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#2d1b22', fontSize: '0.95rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.client}</div>
          <div style={{ color: '#a0909a', fontSize: '0.76rem', fontWeight: 600 }}>{pkg.phone || 'Sin teléfono'}</div>
        </div>
      </div>

      <div>
        <div style={{ color: '#2d1b22', fontSize: '0.86rem', fontWeight: 800 }}>{pkg.package}</div>
        {pkg.status === 'Vencido' && (
          <div style={{ marginTop: '3px', color: '#b42318', fontSize: '0.7rem', fontWeight: 700 }}>{pkg.expiredSessions} sesión(es) vencida(s)</div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '7px', fontSize: '0.74rem', fontWeight: 800 }}>
          <span style={{ color: '#8c767b' }}>Sesiones</span>
          <span style={{ color: '#c97282' }}>{pkg.currentSession} / {pkg.totalSessions}</span>
        </div>
        <div style={{ width: '100%', height: '7px', overflow: 'hidden', borderRadius: '999px', background: 'rgba(201,114,130,0.1)' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, #c48b9f 0%, #c97282 100%)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: isMobile ? 'space-between' : 'center', gap: '4px' }}>
        <span style={{ color: '#a0909a', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>Deuda</span>
        <span style={{ color: pkg.pending > 0 ? '#a0506a' : '#059669', fontSize: '0.95rem', fontWeight: 900 }}>${pkg.pending.toFixed(2)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ padding: '6px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, background: statusPalette.background, color: statusPalette.color, border: `1px solid ${statusPalette.border}`, whiteSpace: 'nowrap' }}>
          {pkg.status}
        </span>
        <button
          type="button"
          onClick={() => onSchedule(pkg)}
          disabled={pkg.raw.status !== 'active'}
          className="btn-press"
          style={{ minHeight: '38px', padding: '0 14px', borderRadius: '11px', background: '#fff', color: '#c97282', border: '1px solid rgba(201,114,130,0.25)', fontWeight: 800, fontSize: '0.76rem', cursor: pkg.raw.status === 'active' ? 'pointer' : 'not-allowed', opacity: pkg.raw.status === 'active' ? 1 : 0.5, whiteSpace: 'nowrap' }}
        >
          {pkg.raw.status === 'active' ? 'Agendar sesión' : pkg.status}
        </button>
      </div>
    </div>
  );
};

const LaserModule = ({ isMobile }) => {
  const { alert } = useDialog();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [packageView, setPackageView] = useState(() => {
    if (typeof window === 'undefined') return 'cards';
    return window.localStorage.getItem('jana-laser-package-view') || 'cards';
  });
  
  const [isSellPackageOpen, setIsSellPackageOpen] = useState(false);
  const [selectedPackageForSession, setSelectedPackageForSession] = useState(null);
  
  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await dataService.getAllActiveLaserPackages();
      const formatted = data.map(pkg => {
        const installments = pkg.package_installments || [];
        const paid = installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
        const total = Number(pkg.total_amount) || 0;
        const pending = total - paid;
        
        const sessions = pkg.package_sessions || [];
        const sessionDates = sessions.map(session => session.consumed_at || session.scheduled_at).filter(Boolean).sort();
        let status = 'Al día';
        if (pkg.status === 'expired') status = 'Vencido';
        else if (pkg.status === 'completed') status = 'Completado';
        if (pkg.status === 'active' && installments.some(i => i.status === 'pending' && i.installment_number <= pkg.used_sessions + 1)) {
          status = 'Cuota Pendiente';
        }
        if (pending <= 0 && pkg.status === 'active') status = 'Pagado';

        return {
          id: pkg.id,
          client: pkg.clients?.name || 'S/N',
          phone: pkg.clients?.phone || '',
          package: pkg.services?.name || 'Paquete Láser',
          currentSession: pkg.used_sessions || 0,
          totalSessions: pkg.total_sessions || 8,
          lastSession: sessionDates.length ? sessionDates.at(-1) : null,
          nextSession: 'Pendiente',
          price: total,
          paid,
          pending: pending > 0 ? pending : 0,
          status,
          expiredSessions: Number(pkg.expired_sessions || 0),
          raw: pkg
        };
      });
      setPackages(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    window.localStorage.setItem('jana-laser-package-view', packageView);
  }, [packageView]);
  
  // Calendario real: comparte las mismas citas de la Agenda.
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [calendarSlots, setCalendarSlots] = useState([]);

  useEffect(() => {
    const start = new Date(currentDate); start.setHours(0,0,0,0);
    const end = new Date(currentDate); end.setHours(23,59,59,999);
    dataService.getAppointmentServicesFlat(start.toISOString(), end.toISOString()).then(rows => {
      const laserRows = rows.filter(row => {
        const text = `${row.services?.name || ''} ${row.services?.category || ''}`.toLowerCase();
        return text.includes('laser') || text.includes('láser') || text.includes('depilación');
      });
      const slots = Array.from({length: 11}, (_,i) => {
        const hour = i + 8;
        const row = laserRows.find(a => new Date(a.scheduled_at).getHours() === hour);
        const time = new Date(2000,0,1,hour).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        if (!row) return { time, status:'available' };
        const pkg = packages.find(p => p.raw.client_id === row.client_id && p.raw.service_id === row.service_id);
        return { time, status:'booked', client:row.clients?.name || 'Cliente', package:row.services?.name || 'Láser', session:pkg ? `${pkg.currentSession + 1}/${pkg.totalSessions}` : 'Sesión', debt:pkg?.pending || 0, tag:pkg?.pending ? `Debe $${pkg.pending.toFixed(2)}` : 'Al día', tagColor:pkg?.pending ? '#dc2626':'#16a34a' };
      });
      setCalendarSlots(slots);
    }).catch(err => { console.error(err); setCalendarSlots([]); });
  }, [currentDate, packages]);

  const handleUnblock = (index) => {
    const newSlots = [...calendarSlots];
    newSlots[index] = { ...newSlots[index], status: 'available', reason: null };
    setCalendarSlots(newSlots);
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const formattedDate = currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const filteredPackages = packages.filter(pkg => (
    pkg.client.toLowerCase().includes(searchQuery.toLowerCase())
    || pkg.phone.includes(searchQuery)
  ));


  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      
      {/* HEADER EXACTLY LIKE AGENDA */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        padding: '12px 0 16px 0', 
        flexWrap: 'wrap', 
        gap: '20px',
        position: 'relative',
        width: '100%'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: isMobile ? '100%' : 'auto', gap: '16px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
              <svg viewBox="0 0 1500 1500" style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', flexShrink: 0 }} fill="none">
                <path fill="white" d="M 1096.910156 1314.777344 C 1063.835938 1314.777344 1039.238281 1294.308594 1018.652344 1277.164062 C 984.75 1248.945312 949.699219 1219.785156 864.25 1245.058594 C 801.542969 1263.617188 752.117188 1258.609375 717.332031 1230.183594 C 670.527344 1191.953125 670.292969 1125.414062 671 1108.859375 C 668.464844 1093.929688 642.988281 979.171875 450.414062 863.886719 C 314.1875 782.328125 230.683594 671.902344 184.617188 593.613281 C 134.601562 508.578125 116.839844 442.835938 116.105469 440.09375 C 111.921875 424.367188 121.289062 408.253906 137.019531 404.074219 C 152.71875 399.890625 168.828125 409.226562 173.039062 424.925781 C 173.21875 425.546875 190.035156 487.074219 236.484375 565.542969 C 278.988281 637.351562 355.894531 738.648438 480.722656 813.375 C 714.828125 953.488281 729.464844 1099.171875 729.96875 1105.296875 C 730.113281 1106.945312 730.113281 1108.625 729.96875 1110.273438 C 728.878906 1124.382812 731.144531 1165.53125 754.828125 1184.707031 C 778.242188 1203.675781 818.183594 1197.253906 847.609375 1188.566406 C 963.277344 1154.339844 1019.328125 1201.023438 1056.410156 1231.894531 C 1081.390625 1252.6875 1090.726562 1259.019531 1105.75 1254.367188 C 1166.808594 1235.484375 1194.199219 1225.53125 1208.191406 1214.839844 C 1175.203125 1208.566406 1121.976562 1191.980469 1057.296875 1129.714844 C 1013.085938 1087.152344 965.75 1055.84375 919.976562 1025.5625 C 882.71875 1000.941406 847.519531 977.671875 814.648438 949.1875 C 762.71875 904.242188 668.703125 751.222656 559.835938 574.027344 C 498.128906 473.585938 434.300781 369.699219 379.457031 288.640625 C 300.019531 171.292969 270.652344 149.230469 261.699219 145.195312 C 246.882812 138.511719 240.285156 121.042969 246.972656 106.226562 C 253.65625 91.414062 271.125 84.816406 285.941406 91.5 C 345.96875 118.628906 448.410156 280.246094 609.96875 543.1875 C 707.375 701.742188 808.109375 865.65625 853.144531 904.652344 C 883.128906 930.601562 916.769531 952.871094 952.40625 976.402344 C 1000.390625 1008.125 1050.019531 1040.9375 1098.121094 1087.242188 C 1162.183594 1148.949219 1208.925781 1155.695312 1234.023438 1159.316406 C 1249.488281 1161.554688 1267.042969 1164.089844 1276.378906 1181.347656 C 1285.863281 1198.902344 1277.46875 1216.871094 1273.875 1224.558594 C 1252.34375 1270.625 1209.164062 1283.96875 1123.125 1310.59375 C 1113.820312 1313.480469 1105.128906 1314.71875 1096.941406 1314.71875 Z" />
                <path fill="white" d="M 1207.484375 829.75 C 1160.238281 829.75 1117.617188 796.878906 1107.191406 748.867188 L 1069.726562 576.527344 L 799.15625 576.527344 C 764.546875 576.527344 736.417969 548.371094 736.417969 513.761719 L 736.417969 278.480469 C 736.417969 243.871094 764.578125 215.710938 799.15625 215.710938 L 1189.28125 215.710938 C 1223.535156 215.710938 1255.554688 234.089844 1272.816406 263.691406 L 1370.425781 431.199219 C 1388.070312 461.449219 1388.160156 497.648438 1370.722656 528.015625 C 1353.285156 558.386719 1321.945312 576.5 1286.921875 576.5 L 1279.882812 576.5 L 1307.867188 705.214844 C 1319.882812 760.53125 1284.65625 815.316406 1229.339844 827.363281 C 1222.035156 828.953125 1214.699219 829.71875 1207.515625 829.71875 Z M 799.15625 274.679688 C 797.035156 274.679688 795.328125 276.417969 795.328125 278.539062 L 795.328125 513.820312 C 795.328125 515.941406 797.035156 517.679688 799.15625 517.679688 L 1093.464844 517.679688 C 1107.308594 517.679688 1119.296875 527.339844 1122.242188 540.890625 L 1164.746094 736.410156 C 1169.871094 759.972656 1193.226562 774.992188 1216.792969 769.867188 C 1240.355469 764.742188 1255.378906 741.386719 1250.253906 717.824219 L 1214.523438 553.40625 C 1212.640625 544.6875 1214.789062 535.617188 1220.386719 528.664062 C 1225.980469 521.742188 1234.40625 517.707031 1243.332031 517.707031 L 1286.894531 517.707031 C 1306.597656 517.707031 1316.347656 504.453125 1319.617188 498.769531 C 1322.886719 493.085938 1329.425781 478.003906 1319.5 460.949219 L 1221.917969 293.441406 C 1215.171875 281.894531 1202.683594 274.707031 1189.28125 274.707031 L 799.15625 274.707031 Z" />
                <path fill="white" d="M 1027.8125 470.023438 C 1016.441406 470.023438 1005.601562 463.394531 1000.773438 452.289062 L 956.382812 350.171875 C 949.902344 335.265625 956.738281 317.890625 971.640625 311.410156 C 986.546875 304.929688 1003.925781 311.761719 1010.402344 326.667969 L 1054.792969 428.785156 C 1061.273438 443.6875 1054.4375 461.066406 1039.535156 467.546875 C 1035.707031 469.195312 1031.730469 469.992188 1027.8125 469.992188 Z" />
                <path fill="white" d="M 1136.644531 470.023438 C 1125.277344 470.023438 1114.4375 463.394531 1109.605469 452.289062 L 1065.21875 350.171875 C 1058.738281 335.265625 1065.574219 317.890625 1080.476562 311.410156 C 1095.378906 304.929688 1112.757812 311.761719 1119.238281 326.667969 L 1163.625 428.785156 C 1170.105469 443.6875 1163.273438 461.066406 1148.367188 467.546875 C 1144.539062 469.195312 1140.5625 469.992188 1136.644531 469.992188 Z" />
                <path fill="white" d="M 765.84375 490.285156 L 658.511719 490.285156 C 642.25 490.285156 629.054688 477.089844 629.054688 460.832031 L 629.054688 318.210938 C 629.054688 301.953125 642.25 288.757812 658.511719 288.757812 L 765.84375 288.757812 C 782.101562 288.757812 795.296875 301.953125 795.296875 318.210938 C 795.296875 334.472656 782.101562 347.667969 765.84375 347.667969 L 687.964844 347.667969 L 687.964844 431.378906 L 765.84375 431.378906 C 782.101562 431.378906 795.296875 444.574219 795.296875 460.832031 C 795.296875 477.089844 782.101562 490.285156 765.84375 490.285156 Z" />
                <path fill="white" d="M 1260.382812 945.0625 C 1247.894531 945.0625 1236.320312 937.082031 1232.34375 924.5625 L 1195.023438 807.570312 C 1190.078125 792.078125 1198.617188 775.496094 1214.140625 770.546875 C 1229.632812 765.597656 1246.21875 774.140625 1251.164062 789.664062 L 1288.484375 906.65625 C 1293.433594 922.148438 1284.890625 938.730469 1269.367188 943.679688 C 1266.394531 944.621094 1263.359375 945.09375 1260.414062 945.09375 Z" />
              </svg>
            </div>
            <div>
              <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
                Centro Láser
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
                Gestión de paquetes, cuotas y sesiones de depilación láser.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setIsSellPackageOpen(true)}
          style={{
            padding: isMobile ? '12px 20px' : '8px 18px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
            color: '#fff', fontSize: isMobile ? '0.95rem' : '0.82rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: isMobile ? '1 1 100%' : 'none',
            boxShadow: '0 4px 15px rgba(201, 114, 130,0.25)',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(201, 114, 130,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 114, 130,0.25)';
          }}
        >
          <Plus size={15} /> Vender Paquete
        </button>
      </div>

      <LaserSettingsPanel isMobile={isMobile} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('packages')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'packages' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'packages' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'packages' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-2px' }}
        >
          <Package size={18} /> Paquetes
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'calendar' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'calendar' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'calendar' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-2px' }}
        >
          <CalendarIcon size={18} /> Calendario Láser
        </button>
      </div>

      {/* Content Area */}
      <div style={{ position: 'relative' }}>
        
        {activeTab === 'packages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            {/* Filters / Search */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} color="#a0909a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar clienta por nombre o teléfono..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.25)', backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', fontSize: '0.95rem', color: '#2d1b22', fontWeight: 600, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#c97282';
                    e.target.style.boxShadow = '0 0 0 3px rgba(201, 114, 130, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(223, 178, 140, 0.25)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <div
                aria-label="Cambiar vista de paquetes"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '4px', borderRadius: '14px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(223,178,140,0.25)', flex: isMobile ? '1 1 100%' : '0 0 auto' }}
              >
                {[
                  { value: 'cards', label: 'Tarjetas', icon: LayoutGrid },
                  { value: 'list', label: 'Lista', icon: List },
                ].map(option => {
                  const Icon = option.icon;
                  const isActive = packageView === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setPackageView(option.value)}
                      style={{
                        minHeight: '42px',
                        padding: '0 14px',
                        border: 'none',
                        borderRadius: '10px',
                        background: isActive ? '#a84f70' : 'transparent',
                        color: isActive ? '#fff' : '#7f6970',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon size={15} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Packages List */}
            <div style={{ display: packageView === 'cards' ? 'grid' : 'flex', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', flexDirection: 'column', gap: packageView === 'cards' ? '24px' : '10px' }}>
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#a0909a' }}>Cargando paquetes...</div>
              ) : filteredPackages.length === 0 ? (
                <div style={{ padding: '34px', textAlign: 'center', color: '#a0909a', background: 'rgba(255,255,255,0.55)', border: '1px dashed rgba(201,114,130,0.2)', borderRadius: '18px' }}>
                  No se encontraron paquetes para esta búsqueda.
                </div>
              ) : filteredPackages.map(pkg => packageView === 'list' ? (
                <LaserPackageListRow
                  key={pkg.id}
                  pkg={pkg}
                  isMobile={isMobile}
                  onSchedule={setSelectedPackageForSession}
                />
              ) : (
                <div key={pkg.id} className="agenda-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.7)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(74, 48, 54, 0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(74, 48, 54, 0.04)'; }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontWeight: 900, fontSize: '1.4rem', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(201,114,130,0.15)' }}>
                        {pkg.client.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.3px' }}>{pkg.client}</div>
                        <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>{pkg.phone}</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, 
                      backgroundColor: pkg.status === 'Vencido' ? '#fef2f2' : pkg.status === 'Al día' ? '#fff0f2' : pkg.status === 'Cuota Pendiente' ? '#ffe1e6' : ['Pagado', 'Completado'].includes(pkg.status) ? '#ecfdf5' : '#fcf9f8',
                      color: pkg.status === 'Vencido' ? '#b42318' : pkg.status === 'Al día' ? '#c97282' : pkg.status === 'Cuota Pendiente' ? '#a0506a' : ['Pagado', 'Completado'].includes(pkg.status) ? '#059669' : '#a0909a',
                      border: `1px solid ${pkg.status === 'Vencido' ? '#fecaca' : pkg.status === 'Al día' ? 'rgba(201,114,130,0.2)' : pkg.status === 'Cuota Pendiente' ? 'rgba(160,80,106,0.2)' : ['Pagado', 'Completado'].includes(pkg.status) ? 'rgba(5,150,105,0.2)' : 'rgba(160,144,154,0.2)'}`
                    }}>
                      {pkg.status}
                    </div>
                  </div>

                  {pkg.status === 'Vencido' && <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fef2f2', color: '#b42318', fontSize: 12, fontWeight: 800 }}>Se vencieron {pkg.expiredSessions} sesión(es) no utilizadas.</div>}
                  <LaserProgressGallery sessions={pkg.raw.package_sessions || []} />

                  {/* Info Box */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.6)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(223, 178, 140, 0.15)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22', paddingBottom: '10px', borderBottom: '1px dashed rgba(223, 178, 140, 0.3)' }}>
                      <span style={{ color: '#c97282', marginRight: '6px' }}>✦</span>
                      {pkg.package}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8c767b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <PlayCircle size={14} color="#c97282" /> Sesiones Consumidas
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#c97282' }}>
                        {pkg.currentSession} <span style={{ fontSize: '0.85rem', color: '#a0909a', fontWeight: 700 }}>/ {pkg.totalSessions}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(201,114,130,0.1)', borderRadius: '999px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: `${(pkg.currentSession / pkg.totalSessions) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #c48b9f 0%, #c97282 100%)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                    </div>
                  </div>

                  {/* Payment Info & Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a0909a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Deuda Pendiente</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: pkg.pending > 0 ? '#a0506a' : '#c97282', letterSpacing: '-0.5px' }}>${pkg.pending.toFixed(2)}</div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedPackageForSession(pkg)}
                      disabled={pkg.raw.status !== 'active'}
                      className="btn-press"
                      style={{ padding: '10px 20px', borderRadius: '14px', background: '#fff', color: '#c97282', border: '1px solid rgba(201,114,130,0.2)', fontWeight: 800, fontSize: '0.85rem', cursor: pkg.raw.status === 'active' ? 'pointer' : 'not-allowed', opacity: pkg.raw.status === 'active' ? 1 : .5, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(201,114,130,0.05)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.4)'; }} 
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.2)'; }}
                    >
                      {pkg.raw.status === 'active' ? 'Agendar Sesión' : pkg.status}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row', animation: 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            {/* Sidebar with mini calendar / summary */}
            <div style={{ flex: '1', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2d1b22', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#c97282" /> Máquina Láser
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(201, 114, 130, 0.05) 0%, rgba(201, 114, 130, 0.15) 100%)', borderRadius: '16px', border: '1px solid rgba(201,114,130,0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hoy</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.5px', marginTop: '4px', whiteSpace: 'nowrap' }}>8 Citas</div>
                  <div style={{ fontSize: '0.85rem', color: '#a0909a', fontWeight: 600, marginTop: '4px' }}>4 horas de uso estimado</div>
                </div>
                
                <div 
                  onClick={() => setIsBlockTimeOpen(true)}
                  className="btn-press"
                  style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px dashed rgba(223,178,140,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#dfb28c', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} 
                  onMouseEnter={e => { e.currentTarget.style.background = '#fffaf5'; }} 
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  <Plus size={18} /> Bloquear Horario
                </div>
              </div>
            </div>

            {/* Main Schedule Area Mockup */}
            <div style={{ flex: '3', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.5)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Fake timeline header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(201,114,130,0.1)' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2d1b22', margin: 0, textTransform: 'capitalize' }}>{capitalizedDate}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrevDay} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff', border: '1px solid rgba(201,114,130,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', cursor: 'pointer' }}>{'<'}</button>
                  <button onClick={handleNextDay} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff', border: '1px solid rgba(201,114,130,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', cursor: 'pointer' }}>{'>'}</button>
                </div>
              </div>

              {/* Timeline slots dynamically generated */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingRight: '4px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '500px' }}>
                {calendarSlots.map((slot, idx) => (
                  <div key={idx} className="fade-in-stagger" style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ width: '70px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#a0909a', paddingTop: '12px', flexShrink: 0 }}>{slot.time}</div>
                    
                    {slot.status === 'booked' && (
                      <div className="hover-lift booked-slot" style={{ flex: 1, background: slot.debt > 0 ? 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)' : 'linear-gradient(135deg, #fff 0%, #fff0f2 100%)', borderRadius: '16px', padding: '16px', borderLeft: `4px solid ${slot.debt > 0 ? '#dc2626' : '#c97282'}`, boxShadow: `0 2px 10px ${slot.debt > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(201,114,130,0.05)'}`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22' }}>{slot.client}</div>
                            <div style={{ fontSize: '0.8rem', color: slot.debt > 0 ? '#dc2626' : '#c97282', fontWeight: 700, margin: '4px 0 0 0' }}>
                              <div style={{ marginBottom: '2px' }}>{slot.package}</div>
                              <div style={{ opacity: 0.85 }}>Sesión {slot.session}</div>
                            </div>
                          </div>
                          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: slot.tagColor, border: `1px solid ${slot.tagColor}33`, whiteSpace: 'nowrap', flexShrink: 0 }}>{slot.tag}</div>
                        </div>
                        
                        {/* Hover Actions */}
                        <div
                          className="unlock-overlay"
                          style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.95)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '8px' : '16px', padding: '8px', transition: 'all 0.2s ease', backdropFilter: 'blur(2px)' }}
                        >
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await alert('Puedes cambiar la fecha y hora desde Agenda. La cita láser seguirá sincronizada aquí automáticamente.', 'Posponer cita láser');
                            }}
                            className="btn-press"
                            style={{ background: '#fff', border: '1px solid rgba(223, 178, 140, 0.5)', color: '#dfb28c', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(223, 178, 140, 0.1)', whiteSpace: 'nowrap' }}
                          >
                            <CalendarClock size={16} /> Posponer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnblock(idx);
                            }}
                            className="btn-press"
                            style={{ background: '#fff', border: '1px solid rgba(201, 114, 130, 0.5)', color: '#c97282', padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: isMobile ? '0.75rem' : '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(201, 114, 130, 0.1)', whiteSpace: 'nowrap' }}
                          >
                            <Trash2 size={16} /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
              
                    {slot.status === 'available' && (
                      <div 
                        onClick={() => setIsSellPackageOpen(true)}
                        className="btn-press"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px dashed rgba(201,114,130,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontSize: '0.85rem', fontWeight: 600, minHeight: '60px', cursor: 'pointer' }} 
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'} 
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                      >
                        + Agendar cita
                      </div>
                    )}
              
                    {slot.status === 'blocked' && (
                      <div 
                        className="blocked-slot"
                        style={{ flex: 1, background: '#f5f0f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', fontSize: '0.85rem', fontWeight: 700, minHeight: '60px', border: '1px solid rgba(160, 144, 154, 0.1)', position: 'relative', overflow: 'hidden' }}
                      >
                        <span>Bloqueado: {slot.reason}</span>
                        <div 
                          className="unlock-overlay"
                          onClick={() => handleUnblock(idx)}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(201, 114, 130, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s ease' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <X size={16} /> Desbloquear
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      <LaserPackageModal 
        isOpen={isSellPackageOpen} 
        onClose={() => { setIsSellPackageOpen(false); loadPackages(); }} 
        isMobile={isMobile} 
      />

      <LaserSessionModal 
        isOpen={!!selectedPackageForSession} 
        onClose={() => { setSelectedPackageForSession(null); loadPackages(); }} 
        isMobile={isMobile} 
        packageData={selectedPackageForSession} 
      />

      {/* Block Time Mockup Modal */}
      <AnimatedModal isOpen={isBlockTimeOpen}>
        {(overlayClass, cardClass) => (
          <div className={`modal-overlay ${overlayClass}`} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(45, 27, 34, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className={`modal-card ${cardClass}`} style={{ background: '#fff', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#2d1b22', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#c97282" /> Bloquear Horario Láser
              </h3>
              <p style={{ color: '#a0909a', fontSize: '0.9rem', marginBottom: '24px' }}>Selecciona el rango de horas en el que la máquina láser estará en mantenimiento o inactiva.</p>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <input type="text" defaultValue="12:00 PM" style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid rgba(201, 114, 130, 0.4)', outline: 'none', textAlign: 'center', fontWeight: 700, color: '#2d1b22', boxSizing: 'border-box' }} />
                <span style={{ color: '#a0909a', flexShrink: 0 }}>a</span>
                <input type="text" defaultValue="02:00 PM" style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid rgba(201, 114, 130, 0.4)', outline: 'none', textAlign: 'center', fontWeight: 700, color: '#2d1b22', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsBlockTimeOpen(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f5f0f2', border: 'none', color: '#a0909a', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => setIsBlockTimeOpen(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(201,114,130,0.25)' }}>Bloquear</button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

    </div>
  );
};

export default LaserModule;
