import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Sparkles, 
  TrendingUp, 
  Download,
  Clock,
  ChevronDown,
  X
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroDatePicker from './AstroDatePicker';
import AstroSelect from './AstroSelect';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png';
import { isWash } from '../utils/wash';

const ReportsModule = ({ isMobile, rates, staff = [] }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef(null);
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'custom', 'all'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState(null); // timestamp of week start
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedAssistant, setSelectedAssistant] = useState('all');
  const [chartGranularity, setChartGranularity] = useState('week'); // 'day', 'week', 'month'
  const [hoveredTimelinePoint, setHoveredTimelinePoint] = useState(null);
  const [hoveredHourPoint, setHoveredHourPoint] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Week selector logic ----------
  const weeks = React.useMemo(() => {
    if (!transactions.length) return [];
    // Determine overall range
    const dates = transactions.map(t => new Date(t.created_at));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    // Align to start of week (Monday)
    const start = new Date(min);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday as first day
    const weeksArr = [];
    let cur = new Date(start);
    while (cur <= max) {
      const weekStart = new Date(cur);
      const weekEnd = new Date(cur);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeksArr.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
      });
      cur.setDate(cur.getDate() + 7);
    }
    return weeksArr;
  }, [transactions]);

  const handleWeekClick = (week) => {
    const startStr = week.start.toISOString().split('T')[0];
    const endStr = week.end.toISOString().split('T')[0];
    setDateRange('custom');
    setCustomStartDate(startStr);
    setCustomEndDate(endStr);
    setSelectedWeek(week.start.getTime());
  };

  const handleCaptureFullPage = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    try {
      // Small delay to let loading state update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Preload logo
      let logoImg = null;
      try {
        logoImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = logo;
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
        });
      } catch (e) {
        console.warn("No se pudo cargar el logo para el PDF:", e);
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateLabel = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      // Helper function to draw page background and header/footer borders
      const initPage = (pageNum, totalPagesCount) => {
        // Dark background for full page
        pdf.setFillColor(12, 12, 14);
        pdf.rect(0, 0, 210, 297, 'F');

        // Draw logo if loaded
        let logoWidth = 0;
        if (logoImg) {
          const aspectRatio = logoImg.width / (logoImg.height || 1);
          const logoHeight = 12; // Standard height inside header
          logoWidth = logoHeight * aspectRatio;
          // Safeguard: limit logo width if it's extremely wide
          if (logoWidth > 45) {
            logoWidth = 45;
          }
          const logoX = 195 - logoWidth;
          pdf.addImage(logoImg, 'PNG', logoX, 11, logoWidth, logoHeight);
        }

        // Draw header branding
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(196, 139, 159);
        pdf.text("JANASTUDIO", 15, 18);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(160, 160, 165);
        pdf.text("REPORTE OPERATIVO DE ANALÍTICA Y RENDIMIENTO", 15, 23);

        // Header horizontal separator line
        pdf.setDrawColor(196, 139, 159);
        pdf.setLineWidth(0.5);
        pdf.line(15, 28, 195, 28);

        // Footer
        pdf.setFontSize(7);
        pdf.setTextColor(112, 112, 117);
        pdf.text(`JanaStudio  \u2022  Reporte generado el ${dateLabel} a las ${timeLabel}`, 15, 290);
        pdf.text(`Página ${pageNum} de ${totalPagesCount}`, 195, 290, { align: 'right' });
      };

      // PAGE 1: KPI Cards and Overview
      initPage(1, 2);

      // Filter metadata card
      pdf.setFillColor(18, 18, 21);
      pdf.setDrawColor(32, 32, 37);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(15, 32, 180, 16, 2, 2, 'F');
      
      pdf.setFontSize(7);
      pdf.setTextColor(112, 112, 117);
      pdf.text("RANGO DE FECHAS", 20, 37);
      pdf.text("SERVICIO FILTRADO", 85, 37);
      pdf.text("PERSONAL FILTRADO", 145, 37);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      
      const rangeText = dateRange === 'all' ? 'Histórico Total' :
                        dateRange === 'today' ? 'Hoy' :
                        dateRange === 'week' ? 'Esta Semana' :
                        dateRange === 'month' ? 'Este Mes' :
                        `Pers. (${customStartDate} a ${customEndDate})`;
      pdf.text(rangeText, 20, 43);
      pdf.text(selectedService === 'all' ? 'Todos los Servicios' : selectedService, 85, 43);
      
      const staffName = selectedStaff === 'all' ? 'Todo el Personal' : 
                        (staff.find(s => String(s.id) === String(selectedStaff))?.name || selectedStaff);
      pdf.text(staffName, 145, 43);

      // KPI Grid - Row 1 (y = 53 to 73)
      const cardW = 56.6;
      const kpis = [
        { title: "TOTAL REF. $", value: `$${totalIncome.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, isGold: true },
        { title: "TICKET PROMEDIO", value: `$${avgTicket.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, isGold: false },
        { title: "PROMEDIO SEMANAL", value: `${weeklyAvg}`, isGold: false },
        { title: "SERVICIOS REALIZADOS", value: `${totalServices}`, isGold: false },
        { title: "LAVADOS REALIZADOS", value: `${totalLavados}`, isGold: false },
        { title: "RATIO LAVADOS", value: `${washRatio.toFixed(1)}%`, isGold: false }
      ];

      kpis.forEach((kpi, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const kpiX = 15 + col * (cardW + 5);
        const kpiY = 53 + row * 24;

        pdf.setFillColor(18, 18, 21);
        pdf.roundedRect(kpiX, kpiY, cardW, 20, 3, 3, 'F');
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(160, 160, 165);
        pdf.text(kpi.title, kpiX + 4, kpiY + 6);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(kpi.isGold ? 196 : 255, kpi.isGold ? 139 : 255, kpi.isGold ? 159 : 255);
        pdf.text(kpi.value, kpiX + 4, kpiY + 15);
      });

      // Split layout for Desglose Operativo
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(196, 139, 159);
      pdf.text("DESGLOSE OPERATIVO", 15, 110);
      
      pdf.setDrawColor(196, 139, 159);
      pdf.setLineWidth(0.2);
      pdf.line(15, 112, 195, 112);

      // Left column: Servicios por Estilista
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Servicios por Estilista", 15, 120);

      let stylistY = 128;
      stylistServices.slice(0, 5).forEach(b => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(230, 230, 230);
        pdf.text(String(b.name || ''), 15, stylistY);
        
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(196, 139, 159);
        pdf.text(`${b.count} serv.`, 95, stylistY, { align: 'right' });

        // Draw custom progress bar
        pdf.setFillColor(30, 30, 35);
        pdf.rect(15, stylistY + 2, 80, 1.5, 'F');
        
        const pct = b.count / maxStylistCount;
        pdf.setFillColor(196, 139, 159);
        pdf.rect(15, stylistY + 2, Math.max(2, 80 * pct), 1.5, 'F');

        stylistY += 12;
      });

      // Right column: Actividad por Día de la Semana
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Rendimiento por Día", 110, 120);

      let dayY = 128;
      daysFlow.forEach(d => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(230, 230, 230);
        const dayLabel = d.name.charAt(0).toUpperCase() + d.name.slice(1);
        pdf.text(String(dayLabel || ''), 110, dayY);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(196, 139, 159);
        pdf.text(`${d.count}`, 195, dayY, { align: 'right' });

        // Draw progress bar
        pdf.setFillColor(30, 30, 35);
        pdf.rect(110, dayY + 2, 85, 1.5, 'F');

        const pct = d.count / maxDayCount;
        pdf.setFillColor(196, 139, 159);
        pdf.rect(110, dayY + 2, Math.max(1, 85 * pct), 1.5, 'F');

        dayY += 9;
      });

      // Assistant Washing Section
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(196, 139, 159);
      pdf.text("RENDIMIENTO DE ASISTENTES DE TRATAMIENTO", 15, 205);
      pdf.line(15, 207, 195, 207);

      const assistList = assistantReport.assistants || [];
      if (assistList.length === 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text("No se encontraron registros de asistentes para este período.", 15, 215);
      } else {
        let assistX = 15;
        assistList.slice(0, 3).forEach(as => {
          pdf.setFillColor(18, 18, 21);
          pdf.roundedRect(assistX, 212, 56.6, 32, 2, 2, 'F');

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(255, 255, 255);
          pdf.text(String(as.name || 'Asistente'), assistX + 4, 218);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.setTextColor(160, 160, 165);
          pdf.text(`Lavados: ${Math.round(as.lavados || 0)}`, assistX + 4, 226);
          pdf.text(`Comisión: $${(as.comision || 0).toFixed(2)}`, assistX + 4, 233);
          pdf.text(`Propinas: $${(as.propinas || 0).toFixed(2)}`, assistX + 4, 240);

          assistX += 61.6;
        });
      }

      // PAGE 2: Detailed Transactions Table
      pdf.addPage();
      initPage(2, 2);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(196, 139, 159);
      pdf.text("HISTORIAL DE TRANSACCIONES DEL PERÍODO", 15, 34);
      pdf.line(15, 36, 195, 36);

      // Table Header
      pdf.setFillColor(18, 18, 21);
      pdf.rect(15, 40, 180, 7, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(196, 139, 159);
      pdf.text("FECHA", 18, 45);
      pdf.text("DESCRIPCIÓN / SERVICIO", 50, 45);
      pdf.text("PERSONAL INVOLUCRADO", 125, 45);
      pdf.text("MONTO", 192, 45, { align: 'right' });

      // Draw rows
      let rowY = 47;
      const tList = filteredTransactions.filter(t => t.type === 'income').slice(0, 30);
      
      tList.forEach((t, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(25, 25, 28);
          pdf.rect(15, rowY, 180, 6.5, 'F');
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(230, 230, 230);
        
        const dateStr = new Date(t.created_at).toLocaleDateString('es-VE', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        pdf.text(dateStr, 18, rowY + 4.5);

        const descText = t.description.length > 42 ? t.description.slice(0, 39) + "..." : t.description;
        pdf.text(descText, 50, rowY + 4.5);

        const staffInvolved = t.metadata?.staffInvolved || [];
        const staffNames = staffInvolved.map(s => s.name.split(' ')[0]).join(' + ') || 'N/A';
        pdf.text(staffNames, 125, rowY + 4.5);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(`$${t.amount.toFixed(2)}`, 192, rowY + 4.5, { align: 'right' });

        rowY += 6.5;
      });

      if (filteredTransactions.length > 30) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`* Mostrando las primeras 30 transacciones de un total de ${filteredTransactions.length}.`, 15, rowY + 6);
      }

      // Save PDF
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      const rangeLabel = dateRange === 'all' ? 'Historico'
        : dateRange === 'today' ? 'Hoy'
        : dateRange === 'week' ? 'Semana'
        : dateRange === 'month' ? 'Mes'
        : 'Personalizado';

      pdf.save(`JanaStudio_Reporte_${rangeLabel}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista única de servicios de las transacciones para el filtro
  const uniqueServicesList = (() => {
    const list = new Set();
    transactions.forEach(t => {
      if (t.type !== 'income') return;
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Corte Basico';
        }
      }
      serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim()).filter(Boolean).forEach(s => list.add(s));
    });
    return Array.from(list).sort();
  })();

  const isStylistRole = (role = '') => {
    const normalizedRole = role.toLowerCase();
    const isExcluded = normalizedRole.includes('admin') || normalizedRole.includes('asistente') || normalizedRole.includes('lavado') || normalizedRole.includes('caja') || normalizedRole.includes('recepcion');
    return !isExcluded && (normalizedRole.includes('barber') || normalizedRole.includes('estilista') || normalizedRole.includes('stylist'));
  };

  const isAssistantRole = (role = '') => {
    const normalizedRole = role.toLowerCase();
    return normalizedRole.includes('asistente') || normalizedRole.includes('lavado') || normalizedRole.includes('operaciones');
  };

  const reportStaffOptions = (() => {
    return staff
      .filter((s) => isStylistRole(s.role))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.id, label: s.name }));
  })();

  const assistantOptions = (() => {
    return staff
      .filter((s) => isAssistantRole(s.role))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.id, label: s.name }));
  })();

  const filteredTransactions = transactions.filter(t => {
    // 1. Rango de Fecha
    const tDate = new Date(t.created_at);
    const now = new Date();
    
    if (dateRange === 'today') {
      if (tDate.toDateString() !== now.toDateString()) return false;
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(now);
      const dayOffset = (startOfWeek.getDay() + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - dayOffset);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      if (tDate < startOfWeek || tDate > endOfWeek) return false;
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      if (tDate < startOfMonth || tDate > endOfMonth) return false;
    } else if (dateRange === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00');
        if (tDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59');
        if (tDate > end) return false;
      }
    }

    // 2. Filtro de Servicio
    if (selectedService !== 'all') {
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Corte Basico';
        }
      }
      const individualServices = serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!individualServices.includes(selectedService.toLowerCase())) return false;
    }

    // 3. Filtro de Personal (Estilistas y Asistentes)
    if (selectedStaff !== 'all') {
      const staffInvolved = t.metadata?.staffInvolved || [];
      const isInvolved = staffInvolved.some(s => 
        String(s.staffId) === String(selectedStaff) || 
        s.name.trim().toLowerCase() === selectedStaff.trim().toLowerCase()
      );
      if (!isInvolved) return false;
    }

    return true;
  });

  // Calculate Metrics (Looker Studio Style)
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalServices = filteredTransactions
    .filter(t => t.type === 'income')
    .length || 0;

  const avgTicket = totalServices > 0 ? totalIncome / totalServices : 0;

  const selectedRangeDays = (() => {
    if (dateRange === 'today') return 1;
    if (dateRange === 'week') return 7;
    if (dateRange === 'month') {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T00:00:00`);
      return Math.max(1, Math.round((end - start) / 86400000) + 1);
    }

    const dates = filteredTransactions.map(t => new Date(t.created_at).getTime());
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      return Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 1);
    }
    return 1;
  })();

  // Estimate weeks represented in the dateRange
  const weeksCount = (() => {
    if (dateRange === 'today') return 1 / 7;
    if (dateRange === 'week') return 1;
    if (dateRange === 'month') return 4.3;
    
    const dates = filteredTransactions.map(t => new Date(t.created_at).getTime());
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;
      return Math.ceil(diffDays / 7) || 1;
    }
    return 1;
  })();

  const weeklyAvg = Math.round(totalServices / (weeksCount || 1));

  const totalLavados = filteredTransactions.filter(t => 
    t.type === 'income' && 
    isWash(t.metadata?.didWash)
  ).length || 0;

  const washRatio = totalServices > 0 ? (totalLavados / totalServices) * 100 : 0;

  // 1. SERVICES Table with pagination
  const serviceStats = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      
      let serviceName = t.metadata?.serviceName;
      if (!serviceName) {
        const parts = t.description.split(' - ');
        if (parts.length >= 3 && parts[2].includes('Servi:')) {
          serviceName = parts[2].replace('Servi: ', '');
        } else {
          serviceName = 'Corte Basico'; // Fallback matching looker studio top service
        }
      }
      
      // Split multiple services (e.g. "Gravedad Cero + En órbita")
      const individualServices = serviceName.split(/\s*[\+,\/]\s*/).map(s => s.trim()).filter(Boolean);
      
      individualServices.forEach(sName => {
        if (!stats[sName]) {
          stats[sName] = { usd: 0, count: 0 };
        }
        stats[sName].count += 1;
        // Attribute proportional USD amount to each individual service
        stats[sName].usd += (t.amount || 0) / individualServices.length;
      });
    });

    const totalIncomeServices = Object.values(stats).reduce((acc, s) => acc + s.usd, 0) || 1;

    return Object.entries(stats).map(([name, s]) => {
      const pct = (s.usd / totalIncomeServices) * 100;
      return {
        name,
        usd: Math.round(s.usd),
        percent: pct
      };
    }).sort((a, b) => b.usd - a.usd);
  })();

  // Pagination for services table
  const paginatedServices = serviceStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(serviceStats.length / itemsPerPage) || 1;

  // 2. STYLIST SERVICES (Horizontal Bar Chart)
  const stylistServices = (() => {
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const staffInvolved = t.metadata?.staffInvolved || [];
      staffInvolved.forEach(s => {
        const roleParts = (s.role || '').toLowerCase().split('|');
        const roleName = roleParts.length > 2 ? roleParts[1] : roleParts[0];
        if (!roleName.includes('barber') && !roleName.includes('estilista')) return;
        stats[s.name] = (stats[s.name] || 0) + 1;
      });
    });
    // Map with default stylist statistics if database is fresh
    const list = Object.entries(stats).map(([name, count]) => ({ name, count }));
    if (list.length === 0) {
      return [
        { name: "Manuel", count: 287 },
        { name: "Aidan", count: 193 },
        { name: "Jesus", count: 76 }
      ];
    }
    return list.sort((a, b) => b.count - a.count);
  })();

  const maxStylistCount = Math.max(...stylistServices.map(b => b.count)) || 1;

  // 3. DAYS FLOW (Vertical Bar Chart)
  const daysFlow = (() => {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const stats = {};
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const day = days[new Date(t.created_at).getDay()];
      stats[day] = (stats[day] || 0) + 1;
    });
    
    // Sort in specific order matching Looker Studio's graph layout (sábado, viernes, jueves, miércoles, martes, domingo, lunes)
    const renderOrder = ['sábado', 'viernes', 'jueves', 'miércoles', 'martes', 'domingo', 'lunes'];
    const list = renderOrder.map(day => ({
      name: day,
      count: stats[day] || 0
    }));

    if (list.every(d => d.count === 0)) {
      return [
        { name: "sábado", count: 330 },
        { name: "viernes", count: 80 },
        { name: "jueves", count: 55 },
        { name: "miércoles", count: 44 },
        { name: "martes", count: 38 },
        { name: "domingo", count: 8 },
        { name: "lunes", count: 3 }
      ];
    }
    return list;
  })();

  const maxDayCount = Math.max(...daysFlow.map(d => d.count)) || 1;

  // 4. ASSISTANT WASHING REPORT
  const assistantReport = (() => {
    const byAssistant = {};
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayOrder = ['sabado', 'viernes', 'jueves', 'miercoles', 'martes', 'domingo', 'lunes'];
    const byDay = dayOrder.reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
    const byHour = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };
    let unassignedWashes = 0;
    const assistantsCatalog = staff.filter((s) => isAssistantRole(s.role));
    const soleAssistant = assistantsCatalog.length === 1 ? assistantsCatalog[0] : null;

    assistantsCatalog
      .filter((s) => selectedAssistant === 'all' || String(s.id) === String(selectedAssistant))
      .forEach((s) => {
        byAssistant[s.id] = {
          id: s.id,
          name: s.name,
          lavados: 0,
          clientes: 0,
          comision: 0,
          propinas: 0,
          total: 0
        };
      });

    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      const staffInvolved = t.metadata?.staffInvolved || [];
      let assistantStaff = staffInvolved.filter(s => isAssistantRole(s.role));
      const washCount = Number(t.metadata?.washCount || 0) || (isWash(t.metadata?.didWash) ? 1 : 0);

      if (assistantStaff.length === 0 && washCount > 0 && soleAssistant) {
        assistantStaff = [{
          staffId: soleAssistant.id,
          id: soleAssistant.id,
          name: soleAssistant.name,
          role: soleAssistant.role,
          commissionEarned: Number(soleAssistant.washing_rate || 0) * washCount,
          tip: 0
        }];
      }

      assistantStaff = assistantStaff.filter((assistant) => selectedAssistant === 'all' || String(assistant.staffId || assistant.id) === String(selectedAssistant));

      if (assistantStaff.length === 0) {
        if (washCount > 0 && selectedAssistant === 'all') unassignedWashes += washCount;
        return;
      }

      const tDate = new Date(t.created_at);
      const dayKey = dayNames[tDate.getDay()];
      const hour = tDate.getHours();
      const hourKey = hour < 11 ? '9a.m.' : hour < 14 ? '12p.m.' : hour < 17 ? '3p.m.' : hour < 20 ? '6p.m.' : '9p.m.';
      const washesPerAssistant = Math.max(1, washCount) / assistantStaff.length;

      assistantStaff.forEach((assistant) => {
        const id = assistant.staffId || assistant.id || assistant.name;
        if (!byAssistant[id]) {
          byAssistant[id] = {
            id,
            name: assistant.name || 'Asistente',
            lavados: 0,
            clientes: 0,
            comision: 0,
            propinas: 0,
            total: 0
          };
        }

        const commission = Number(assistant.commissionEarned || 0);
        const tip = Number(assistant.tip || 0);

        byAssistant[id].lavados += washesPerAssistant;
        byAssistant[id].clientes += washesPerAssistant;
        byAssistant[id].comision += commission;
        byAssistant[id].propinas += tip;
        byAssistant[id].total += commission + tip;

        byDay[dayKey] = (byDay[dayKey] || 0) + washesPerAssistant;
        byHour[hourKey] = (byHour[hourKey] || 0) + washesPerAssistant;
      });
    });

    const assistants = Object.values(byAssistant)
      .filter(a => a.lavados > 0 || a.comision > 0 || a.propinas > 0)
      .sort((a, b) => b.lavados - a.lavados);

    const totalLavadosAssistant = assistants.reduce((sum, a) => sum + a.lavados, 0);
    const totalComisionAssistant = assistants.reduce((sum, a) => sum + a.comision, 0);
    const totalTipsAssistant = assistants.reduce((sum, a) => sum + a.propinas, 0);
    const maxAssistantDay = Math.max(...Object.values(byDay), 1);
    const maxAssistantHour = Math.max(...Object.values(byHour), 1);

    return {
      assistants,
      byDay: dayOrder.map(day => ({ name: day, count: byDay[day] || 0 })),
      byHour: Object.entries(byHour).map(([label, count]) => ({ label, count })),
      totalLavados: totalLavadosAssistant,
      totalClientes: totalLavadosAssistant,
      totalComision: totalComisionAssistant,
      totalPropinas: totalTipsAssistant,
      unassignedWashes,
      maxDay: maxAssistantDay,
      maxHour: maxAssistantHour
    };
  })();

  // 5. REF $ OVER TIME (Line Chart with Custom Granularity)
  const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLongDate = (date) => date.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getIsoWeekNumber = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    normalized.setDate(normalized.getDate() + 3 - ((normalized.getDay() + 6) % 7));
    const weekOne = new Date(normalized.getFullYear(), 0, 4);
    return 1 + Math.round(((normalized - weekOne) / 86400000 - 3 + ((weekOne.getDay() + 6) % 7)) / 7);
  };

  const isTimelineWeekDrilldown = (() => {
    if (dateRange !== 'custom' || chartGranularity !== 'week' || !customStartDate || !customEndDate) return false;
    const start = new Date(`${customStartDate}T00:00:00`);
    const end = new Date(`${customEndDate}T00:00:00`);
    const days = Math.round((end - start) / 86400000) + 1;
    return days > 0 && days <= 7;
  })();

  const effectiveTimelineGranularity = isTimelineWeekDrilldown ? 'day' : chartGranularity;

  const getTimelineGroup = (date) => {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (effectiveTimelineGranularity === 'week') {
      const dayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dayOffset);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const weekNumber = getIsoWeekNumber(start);

      return {
        key: toInputDate(start),
        date: start.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
        sortKey: start.getTime(),
        startDate: toInputDate(start),
        endDate: toInputDate(end),
        rangeLabel: `Del ${formatLongDate(start)} al ${formatLongDate(end)} (Semana ${weekNumber})`
      };
    }

    if (effectiveTimelineGranularity === 'month') {
      start.setDate(1);
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);

      return {
        key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        date: start.toLocaleDateString('es-VE', { month: 'short', year: '2-digit' }),
        sortKey: start.getTime(),
        startDate: toInputDate(start),
        endDate: toInputDate(end),
        rangeLabel: `${formatLongDate(start)} - ${formatLongDate(end)}`
      };
    }

    return {
      key: toInputDate(start),
      date: start.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
      sortKey: start.getTime(),
      startDate: toInputDate(start),
      endDate: toInputDate(end),
      rangeLabel: formatLongDate(start)
    };
  };

  const timelineData = (() => {
    const groups = {};
    const incomeTransactions = filteredTransactions
      .filter(t => t.type === 'income')
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    if (incomeTransactions.length === 0) return groupTimelinePlaceholder();
    
    incomeTransactions.forEach(t => {
      const tDate = new Date(t.created_at);
      const group = getTimelineGroup(tDate);

      if (!groups[group.key]) {
        groups[group.key] = {
          ...group,
          amount: 0
        };
      }
      groups[group.key].amount += t.amount;
    });

    if (isTimelineWeekDrilldown) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T00:00:00`);
      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const group = getTimelineGroup(cur);
        if (!groups[group.key]) {
          groups[group.key] = {
            ...group,
            amount: 0
          };
        }
      }
    }

    const list = Object.values(groups).sort((a, b) => a.sortKey - b.sortKey);
    if (list.length === 0) return groupTimelinePlaceholder();
    return list.slice(-7);
  })();

  function groupTimelinePlaceholder() {
    return [
      { date: "20/04", amount: 2430, startDate: "2026-04-20", endDate: "2026-04-26", rangeLabel: "Del 20 abr 2026 al 26 abr 2026 (Semana 17)", sortKey: 0 },
      { date: "27/04", amount: 888, startDate: "2026-04-27", endDate: "2026-05-03", rangeLabel: "Del 27 abr 2026 al 3 may 2026 (Semana 18)", sortKey: 1 },
      { date: "04/05", amount: 951, startDate: "2026-05-04", endDate: "2026-05-10", rangeLabel: "Del 4 may 2026 al 10 may 2026 (Semana 19)", sortKey: 2 },
      { date: "11/05", amount: 712, startDate: "2026-05-11", endDate: "2026-05-17", rangeLabel: "Del 11 may 2026 al 17 may 2026 (Semana 20)", sortKey: 3 },
      { date: "18/05", amount: 800, startDate: "2026-05-18", endDate: "2026-05-24", rangeLabel: "Del 18 may 2026 al 24 may 2026 (Semana 21)", sortKey: 4 }
    ];
  }

  const maxTimelineAmount = Math.max(...timelineData.map(d => d.amount)) || 1;
  const timelineHeight = 110;
  const timelineWidth = 360;
  const timelinePoints = timelineData.map((d, i) => {
    const x = 35 + i * (300 / (timelineData.length - 1 || 1));
    const y = 130 - (d.amount / maxTimelineAmount) * timelineHeight;
    return {
      x,
      y,
      amount: d.amount,
      date: d.date,
      startDate: d.startDate,
      endDate: d.endDate,
      rangeLabel: d.rangeLabel,
      sortKey: d.sortKey
    };
  });

  const handleTimelinePointClick = (point) => {
    if (!point?.startDate || !point?.endDate) return;
    setDateRange('custom');
    setCustomStartDate(point.startDate);
    setCustomEndDate(point.endDate);
    setSelectedWeek(new Date(`${point.startDate}T00:00:00`).getTime());
    setHoveredTimelinePoint(null);
  };

  const timelinePath = timelinePoints.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = timelinePoints[i - 1];
    return `${path} C ${(prev.x + p.x) / 2} ${prev.y}, ${(prev.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const timelineFill = timelinePoints.length > 0 
    ? `${timelinePath} L ${timelinePoints[timelinePoints.length - 1].x} 150 L ${timelinePoints[0].x} 150 Z` 
    : '';

  // 5. HOURS FLOW (Curved Line Chart)
  const hoursFlowData = (() => {
    const hrs = Array(24).fill(0);
    filteredTransactions.forEach(t => {
      if (t.type !== 'income') return;
      if (t.metadata?.timeMissing) return;
      const h = new Date(t.created_at).getHours();
      hrs[h] += 1;
    });
    
    const businessHours = Array.from({ length: 13 }, (_, i) => i + 9);
    const list = businessHours.map(h => {
      const label = h === 12 ? '12p.m.' : (h > 12 ? `${h - 12}p.m.` : `${h}a.m.`);
      const total = hrs[h] || 0;
      const avg = total / selectedRangeDays;
      return { hour: h, label, count: avg, total };
    });

    return list.filter(h => h.total > 0);
  })();

  const maxHourCount = hoursFlowData.length > 0 ? Math.max(...hoursFlowData.map(h => h.count)) || 1 : 1;
  const hoursPoints = hoursFlowData.map((d, i) => {
    const x = 35 + i * (285 / (hoursFlowData.length - 1 || 1));
    const y = 165 - (d.count / maxHourCount) * 135;
    return { x, y, label: d.label, hour: d.hour, count: d.count, total: d.total };
  });

  const hoursPath = hoursPoints.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, '');

  const hoursFill = hoursPoints.length > 0
    ? `${hoursPath} L ${hoursPoints[hoursPoints.length - 1].x} 175 L ${hoursPoints[0].x} 175 Z`
    : '';

  return (
    <div ref={reportRef} className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '80px' : '20px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header (Premium Google Looker Studio Title) */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '32px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Centro de <span className="text-pink">Analítica</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Auditoría y rendimiento operativo.</p>
        </div>
        
        <div data-pdf-exclude="true" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCaptureFullPage}
            disabled={generatingPdf}
            style={{ 
              backgroundColor: generatingPdf ? 'rgba(196,139,159,0.15)' : 'var(--bg-tertiary)', 
              border: `1px solid ${generatingPdf ? 'var(--pink-primary)' : 'var(--border-color)'}`, 
              color: generatingPdf ? 'var(--pink-primary)' : 'white', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: generatingPdf ? 'wait' : 'pointer',
              transition: 'all 0.3s ease'
            }}>
            {generatingPdf ? '⏳ Generando PDF...' : <><Download size={16} /> PDF</>}
          </button>
        </div>
      </div>

      {generatingPdf && (
        <div style={{
          backgroundColor: 'rgba(18, 18, 21, 0.95)',
          padding: '24px',
          borderRadius: '24px',
          border: '1px solid rgba(196, 139, 159, 0.3)',
          marginBottom: '32px',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '24px', color: 'var(--pink-primary)', margin: '0 0 8px 0', fontWeight: '900', letterSpacing: '1px' }}>JANASTUDIO</h1>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0', color: '#b3b3b3', fontWeight: '600' }}>
            Reporte Ejecutivo de Analítica y Rendimiento Operativo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <div>
              <span style={{ color: '#888', fontWeight: '700' }}>RANGO DE FECHA: </span>
              <span style={{ fontWeight: '850', color: 'white' }}>{
                dateRange === 'all' ? 'Histórico Total' :
                dateRange === 'today' ? 'Hoy' :
                dateRange === 'week' ? 'Esta Semana' :
                dateRange === 'month' ? 'Este Mes' :
                `Personalizado (${customStartDate} a ${customEndDate})`
              }</span>
            </div>
            <div>
              <span style={{ color: '#888', fontWeight: '700' }}>SERVICIO: </span>
              <span style={{ fontWeight: '850', color: 'white' }}>{selectedService === 'all' ? 'Todos los Servicios' : selectedService}</span>
            </div>
            <div>
              <span style={{ color: '#888', fontWeight: '700' }}>PERSONAL: </span>
              <span style={{ fontWeight: '850', color: 'white' }}>{selectedStaff === 'all' ? 'Todo el Personal' : (staff.find(s => String(s.id) === String(selectedStaff))?.name || selectedStaff)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FILTER CONTROL BAR (Looker Studio Style) */}
      <div className="glass-card" data-pdf-exclude="true" style={{
        padding: '20px',
        borderRadius: '20px',
        marginBottom: '32px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '16px',
        border: '1px solid rgba(196,139,159,0.15)',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        {/* Date Range Selector */}
        <AstroSelect 
          label="Rango de Fecha"
          value={dateRange}
          onChange={setDateRange}
          options={[
            { value: 'today', label: 'Hoy' },
            { value: 'week', label: 'Esta Semana' },
            { value: 'month', label: 'Este Mes' },
            { value: 'custom', label: 'Rango Personalizado' },
            { value: 'all', label: 'Histórico Total' }
          ]}
        />

        {/* Service Selector */}
        <AstroSelect 
          label="Servicio"
          value={selectedService}
          onChange={setSelectedService}
          options={[
            { value: 'all', label: 'Todos los Servicios' },
            ...uniqueServicesList.map((s) => ({ value: s, label: s }))
          ]}
        />

        {/* Staff Selector */}
        <AstroSelect 
          label="Miembro del Equipo"
          value={selectedStaff}
          onChange={setSelectedStaff}
          options={[
            { value: 'all', label: 'Todo el Personal' },
            ...reportStaffOptions
          ]}
        />

        {/* Chart Granularity Selector */}
        <AstroSelect 
          label="Agrupamiento Ref. $"
          value={chartGranularity}
          onChange={setChartGranularity}
          options={[
            { value: 'day', label: 'Por Día' },
            { value: 'week', label: 'Por Semana' },
            { value: 'month', label: 'Por Mes' }
          ]}
        />



        {/* Custom Date Picker Fields (Only visible when "custom" is selected) */}
        {dateRange === 'custom' && (
          <div className="animate-fade-in" style={{
            gridColumn: isMobile ? 'span 1' : 'span 4',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'flex-end',
            gap: '16px',
            marginTop: '8px',
            background: 'rgba(0,0,0,0.2)',
            padding: '16px',
            borderRadius: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Fecha Inicial (Desde)</label>
              <AstroDatePicker 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Fecha Final (Hasta)</label>
              <AstroDatePicker 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <div style={{ flexShrink: 0 }}>
              <button 
                onClick={() => {
                  setDateRange('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(196,139,159,0.15)',
                  border: '1px solid var(--pink-primary)',
                  color: 'var(--pink-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--pink-primary)';
                  e.currentTarget.style.color = 'black';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(196,139,159,0.15)';
                  e.currentTarget.style.color = 'var(--pink-primary)';
                }}
              >
                <X size={14} />
                Quitar Filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOP METRICS GRID (Looker Studio Box Layout) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {[
          { label: "Total Ref. $", value: `$${totalIncome.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` },
          { label: "Ticket Promedio Ref. $", value: `$${avgTicket.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, isGold: true },
          { label: "Promedio semanal", value: weeklyAvg.toString() },
          { label: "Servicios", value: totalServices.toString() },
          { label: "Lavados", value: totalLavados.toString() },
          { label: "Ratio Lavados", value: `${washRatio.toFixed(1)} %` }
        ].map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '800', 
              fontStyle: 'italic', 
              color: 'white', 
              textTransform: 'uppercase', 
              marginBottom: '6px',
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}>
              {m.label}
            </span>
            <div style={{ 
              width: '100%', 
              padding: '16px 8px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '12px', 
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px'
            }}>
              <span style={{ 
                fontSize: m.value.length > 8 ? '16px' : '22px', 
                fontWeight: '900', 
                color: m.isGold ? 'var(--pink-primary)' : 'white' 
              }}>
                {m.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MIDDLE CHARTS (3-Columns Grid clone) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        
        {/* CHART 1: Ref $ Over Time Line Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Ref. $</span>
          </div>
          
          <div style={{ position: 'relative', height: '170px' }}>
            <svg width="100%" height="160" viewBox="0 0 360 160" style={{ overflow: 'visible' }}>
              {/* Horizontal grid lines */}
              {[40, 75, 110, 145].map((gY, gi) => (
                <line key={gi} x1="30" y1={gY} x2="330" y2={gY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              
              {/* Timeline Fill Area */}
              {timelineFill && (
                <path d={timelineFill} fill="url(#goldGrad)" opacity="0.15" />
              )}
              
              {/* Timeline Path Line */}
              {timelinePath && (
                <path d={timelinePath} fill="none" stroke="var(--pink-primary)" strokeWidth="3" strokeLinecap="round" />
              )}

              {/* Data points and badges */}
              {timelinePoints.map((p, i) => {
                const isHovered = hoveredTimelinePoint?.sortKey === p.sortKey;
                return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredTimelinePoint(p)}
                  onMouseLeave={() => setHoveredTimelinePoint(null)}
                  onClick={() => handleTimelinePointClick(p)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={p.x} cy={p.y} r="13" fill="transparent" pointerEvents="all" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "7" : "5"}
                    fill="var(--pink-primary)"
                    stroke={isHovered ? "#ffffff" : "#121212"}
                    strokeWidth="2"
                  />
                  
                  {/* Point Labels bubbles matching the white Looker bubbles */}
                  <g transform={`translate(${p.x}, ${p.y - 18})`}>
                    <rect x="-30" y="-8" width="60" height="15" rx="3" fill="#ffffff" />
                    <text x="0" y="3" fill="#000000" fontSize="9" fontWeight="950" textAnchor="middle">
                      {p.amount >= 1000 ? `$${(p.amount/1000).toFixed(2)} mil` : `$${Math.round(p.amount)}`}
                    </text>
                  </g>
                  
                  {/* X Axis Labels */}
                  <text x={p.x} y="156" fill="#8c8c8c" fontSize="9" fontWeight="800" textAnchor="middle">
                    {p.date}
                  </text>
                </g>
              )})}
              
              {/* Gradients */}
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pink-primary)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
            {hoveredTimelinePoint && (
              <div style={{
                position: 'absolute',
                left: `${(hoveredTimelinePoint.x / timelineWidth) * 100}%`,
                top: `${Math.max(hoveredTimelinePoint.y - 8, 28)}px`,
                transform: hoveredTimelinePoint.x < 120 
                  ? 'translate(-10%, -105%)' 
                  : hoveredTimelinePoint.x > 240 
                    ? 'translate(-90%, -105%)' 
                    : 'translate(-50%, -105%)',
                minWidth: '270px',
                padding: '12px 14px',
                background: '#f4f4f6',
                color: '#1b1b1f',
                borderRadius: '8px',
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                zIndex: 200,
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '10px', lineHeight: 1.35 }}>
                  {hoveredTimelinePoint.rangeLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', fontSize: '12px', fontWeight: '800' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '18px', height: '2px', background: 'var(--pink-primary)', display: 'inline-block', position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '7px',
                        top: '-4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--pink-primary)'
                      }} />
                    </span>
                    Ref $
                  </span>
                  <span>${hoveredTimelinePoint.amount.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ marginTop: '8px', color: '#5e6068', fontSize: '10px', fontWeight: '800' }}>
                  Click para filtrar este rango
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Servicios Estilista Horizontal Bar Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicios Estilista</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '170px', justifyContent: 'center' }}>
            {stylistServices.slice(0, 3).map((b, idx) => {
              const pct = (b.count / maxStylistCount) * 80;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '70px', fontSize: '12px', fontWeight: '800', color: '#ffffff', textAlign: 'left' }}>
                    {b.name}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '24px',
                      background: 'var(--pink-gradient)',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '12px',
                      boxShadow: '0 4px 10px rgba(196,139,159,0.15)'
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: '950', color: '#000000' }}>{b.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 3: Días Flujo Vertical Bar Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Días Flujo</span>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            height: '140px', 
            padding: '10px 0',
            marginTop: '20px'
          }}>
            {daysFlow.map((d, idx) => {
              const h = (d.count / maxDayCount) * 90;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--pink-primary)' }}>{d.count}</span>
                  <div style={{ 
                    width: '18px', 
                    height: `${Math.max(h, 4)}px`, 
                    background: 'var(--pink-gradient)', 
                    borderRadius: '2px 2px 0 0',
                    boxShadow: '0 4px 10px rgba(196,139,159,0.15)'
                  }}></div>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#8c8c8c', textTransform: 'lowercase', marginTop: '2px' }}>
                    {d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION (Table and Hour Flow) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: '24px' 
      }}>
        
        {/* WIDGET 1: Top Services Table (Spans 2 columns on desktop) */}
        <div className="glass-card" style={{ 
          padding: '24px', 
          borderRadius: '24px', 
          gridColumn: isMobile ? 'span 1' : 'span 2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '340px'
        }}>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#c48b9f', color: '#000000', fontSize: '12px', fontWeight: '950', textTransform: 'uppercase', fontStyle: 'italic' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>SERVICIO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ref $</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', fontWeight: '800' }}>
                    <td style={{ padding: '14px 16px', color: '#ffffff', textAlign: 'left' }}>
                      {(currentPage - 1) * itemsPerPage + idx + 1}. {s.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e6e6e6', textAlign: 'right' }}>
                      {s.usd.toLocaleString('es-VE')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e6e6e6', textAlign: 'right' }}>
                      {s.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {paginatedServices.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay datos disponibles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            gap: '16px', 
            marginTop: '20px', 
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            paddingTop: '16px' 
          }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#b3b3b3' }}>
              {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, serviceStats.length)} / {serviceStats.length}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: currentPage === 1 ? '#4d4d4d' : 'var(--pink-primary)', 
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '900',
                  fontSize: '18px',
                  padding: '0 8px'
                }}
              >
                &lt;
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: currentPage === totalPages ? '#4d4d4d' : 'var(--pink-primary)', 
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '900',
                  fontSize: '18px',
                  padding: '0 8px'
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* WIDGET 2: Horas Flujo Peak Line Chart */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Horas Flujo</span>
          </div>

          <div style={{ position: 'relative', height: '220px', marginTop: '20px' }}>
            {hoursPoints.length > 0 ? (
            <svg width="100%" height="210" viewBox="0 0 350 210" style={{ overflow: 'visible' }}>
              {/* Horizontal grid lines */}
              {[35, 70, 105, 140, 175].map((gY, gi) => (
                <line key={gi} x1="30" y1={gY} x2="325" y2={gY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}

              <line x1="30" y1="175" x2="325" y2="175" stroke="var(--pink-primary)" strokeWidth="1" opacity="0.75" />

              <defs>
                <linearGradient id="hoursGoldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pink-primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--pink-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {hoursFill && (
                <path d={hoursFill} fill="url(#hoursGoldGrad)" />
              )}

              {/* Peak line path */}
              {hoursPath && (
                <path d={hoursPath} fill="none" stroke="var(--pink-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Hourly points */}
              {hoursPoints.map((p, i) => {
                const isKeyLabel = hoursPoints.length <= 7 || [9, 12, 15, 18, 21].includes(p.hour);
                const isHovered = hoveredHourPoint?.hour === p.hour;
                return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredHourPoint(p)}
                  onMouseLeave={() => setHoveredHourPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={p.x} cy={p.y} r="12" fill="transparent" pointerEvents="all" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "7" : "4.5"}
                    fill="var(--pink-primary)"
                    stroke={isHovered ? "#ffffff" : "#121212"}
                    strokeWidth="2"
                  />
                  
                  {/* Axis labels */}
                  {isKeyLabel && (
                    <text x={p.x} y="198" fill="#d8d8d8" fontSize="10" fontWeight="900" textAnchor="middle">
                      {p.label}
                    </text>
                  )}
                </g>
              )})}
            </svg>
            ) : (
              <div style={{
                height: '210px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '700',
                padding: '20px'
              }}>
                No hay servicios con hora registrada en este rango.
              </div>
            )}
            {hoveredHourPoint && hoursPoints.length > 0 && (
              <div style={{
                position: 'absolute',
                left: `${Math.min(Math.max((hoveredHourPoint.x / 350) * 100, 8), 80)}%`,
                top: `${Math.max(hoveredHourPoint.y - 10, 20)}px`,
                transform: 'translate(-50%, -100%)',
                minWidth: '190px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f4f4f6',
                color: '#1b1b1f',
                boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
                zIndex: 25
              }}>
                <div style={{ fontSize: '13px', fontWeight: '900', marginBottom: '10px' }}>
                  {hoveredHourPoint.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', fontSize: '12px', fontWeight: '850' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '22px', height: '3px', background: 'var(--pink-primary)', borderRadius: '8px', display: 'inline-block' }} />
                    Promedio
                  </span>
                  <span>{hoveredHourPoint.count.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
                <div style={{ marginTop: '8px', color: '#5e6068', fontSize: '10px', fontWeight: '800' }}>
                  Total: {hoveredHourPoint.total} servicios
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ASSISTANT WASHING REPORT */}
      <div style={{ marginTop: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reporte de Asistentes
            </h3>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px' }}>
            <AstroSelect
              label="Asistente"
              value={selectedAssistant}
              onChange={setSelectedAssistant}
              options={[
                { value: 'all', label: 'Todas las Asistentes' },
                ...assistantOptions
              ]}
            />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Lavados', value: Math.round(assistantReport.totalLavados).toString() },
            { label: 'Clientes asistidos', value: Math.round(assistantReport.totalClientes).toString() },
            { label: 'Tarifa Ref. $', value: `$${assistantReport.totalComision.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Propinas Ref. $', value: `$${assistantReport.totalPropinas.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Sin asignar', value: Math.round(assistantReport.unassignedWashes).toString() }
          ].map((m, idx) => (
            <div key={idx} style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '78px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', color: '#b3b3b3', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                {m.label}
              </span>
              <span style={{ fontSize: m.value.length > 8 ? '16px' : '22px', color: idx === 3 ? 'var(--pink-primary)' : '#ffffff', fontWeight: '950' }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Asistentes</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assistantReport.assistants.length > 0 ? assistantReport.assistants.map((assistant) => (
                <div key={assistant.id} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '14px' }}>{assistant.name}</span>
                    <span style={{ color: 'var(--pink-primary)', fontWeight: '950', fontSize: '16px' }}>{Math.round(assistant.lavados)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Tarifa</div>
                      <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '800' }}>${assistant.comision.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Propina</div>
                      <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '800' }}>${assistant.propinas.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}>Total</div>
                      <div style={{ color: 'var(--pink-primary)', fontSize: '12px', fontWeight: '900' }}>${assistant.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '38px 10px' }}>
                  No hay lavados asignados a asistentes en este rango.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Lavados por Dia</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '190px', gap: '8px' }}>
              {assistantReport.byDay.map((d) => {
                const height = (d.count / assistantReport.maxDay) * 120;
                return (
                  <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#0a84ff', fontSize: '10px', fontWeight: '950' }}>{Math.round(d.count)}</span>
                    <div style={{
                      width: '20px',
                      height: `${Math.max(height, 4)}px`,
                      borderRadius: '3px 3px 0 0',
                      background: 'linear-gradient(135deg, #0a84ff, #64d2ff)',
                      boxShadow: '0 6px 14px rgba(10,132,255,0.18)'
                    }} />
                    <span style={{ color: '#8c8c8c', fontSize: '9px', fontWeight: '800', textTransform: 'lowercase' }}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#0a84ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Lavados por Hora</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px', height: '210px' }}>
              {assistantReport.byHour.map((h) => {
                const width = (h.count / assistantReport.maxHour) * 82;
                return (
                  <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '48px', color: '#ffffff', fontSize: '12px', fontWeight: '850' }}>{h.label}</span>
                    <div style={{ flex: 1, height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(width, h.count > 0 ? 6 : 0)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0a84ff, #64d2ff)',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ width: '26px', color: '#0a84ff', fontSize: '12px', fontWeight: '950', textAlign: 'right' }}>{Math.round(h.count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportsModule;
