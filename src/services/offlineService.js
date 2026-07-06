import Dexie from 'dexie';
import { dataService } from './dataService';
import { supabase } from '../lib/supabase';

// Inicialización de la base de datos local en IndexedDB
export const db = new Dexie('JanaStudioOfflineDB');
db.version(1).stores({
  checkout_queue: '++id, status, createdAt'
});
db.version(2).stores({
  checkout_queue: '++id, status, createdAt, ownerAuthUserId'
});

let listeners = [];
let isProcessing = false;
let syncInterval = null;

// Obtener cantidad de cobros pendientes
export const getPendingCount = async () => {
  try {
    return await db.checkout_queue.count();
  } catch (e) {
    console.error("Error al obtener conteo de cola local:", e);
    return 0;
  }
};

// Suscribirse a los cambios en la cola (para el indicador visual en el POS)
export const subscribeToQueue = (callback) => {
  listeners.push(callback);
  // Llamar inmediatamente con el valor actual
  getPendingCount().then(callback);
  
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
};

const notifyListeners = async () => {
  const count = await getPendingCount();
  listeners.forEach(l => {
    try {
      l(count);
    } catch (err) {
      console.error("Error en listener de cola:", err);
    }
  });
};

// Encolar un cobro
export const enqueuePayment = async (paymentData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión antes de registrar un cobro.');
    const durablePaymentData = {
      ...paymentData,
      idempotencyKey: paymentData.idempotencyKey || crypto.randomUUID()
    };
    await db.checkout_queue.add({
      paymentData: durablePaymentData,
      status: 'pending',
      ownerAuthUserId: user.id,
      createdAt: new Date().getTime()
    });
    await notifyListeners();
    
    // Disparar procesamiento asíncrono inmediato
    processQueue();
  } catch (error) {
    console.error("Error al encolar cobro:", error);
    throw error;
  }
};

// Procesar la cola en segundo plano
export const processQueue = async () => {
  if (isProcessing) return;
  
  // Verificar si hay internet básico
  if (!navigator.onLine) {
    console.log("[OfflineService] Dispositivo sin conexión. Se reintentará cuando vuelva el internet.");
    return;
  }

  isProcessing = true;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obtener los cobros pendientes ordenados cronológicamente
    const pendingItems = await db.checkout_queue
      .where('status')
      .anyOf(['pending', 'failed', 'syncing'])
      .sortBy('createdAt');

    if (pendingItems.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`[OfflineService] Procesando ${pendingItems.length} transacciones de la cola...`);

    for (const item of pendingItems) {
      if (item.ownerAuthUserId !== user.id) continue;
      try {
        // Actualizar estado a procesando
        await db.checkout_queue.update(item.id, { status: 'syncing' });
        
        // Ejecutar el cobro en el backend (Supabase + Sheets)
        await dataService.processFinalPayment(item.paymentData);
        
        // Si tiene éxito, eliminar de la cola
        await db.checkout_queue.delete(item.id);
        console.log(`[OfflineService] Sincronización exitosa para cobro ID local: ${item.id}`);
      } catch (err) {
        console.error(`[OfflineService] Error al sincronizar cobro local ${item.id}:`, err);
        
        // Si el error es una violación de llave foránea (ej. la cita fue eliminada) o conflicto, no reintentar
        const isPermanentError = err?.code === '23503' || err?.code === '23505' || err?.status === 409 || err?.status === 400;
        
        if (isPermanentError) {
          console.warn(`[OfflineService] Error permanente detectado. Descartando cobro ${item.id} de la cola para evitar bloqueo.`);
          await db.checkout_queue.delete(item.id);
        } else {
          // Marcar como fallido para reintento posterior
          await db.checkout_queue.update(item.id, { status: 'failed' });
          // Detener procesamiento secuencial por si es un error de red global
          break;
        }
      }
    }
  } catch (e) {
    console.error("[OfflineService] Error procesando cola:", e);
  } finally {
    isProcessing = false;
    await notifyListeners();
  }
};

// Configurar listeners de red y temporizador de respaldo
export const initOfflineService = () => {
  // Cuando vuelve internet, procesar la cola
  window.addEventListener('online', () => {
    console.log("[OfflineService] Conexión restablecida. Sincronizando cola...");
    processQueue();
  });

  // Temporizador de respaldo cada 30 segundos si hay internet
  if (!syncInterval) {
    syncInterval = setInterval(() => {
      if (navigator.onLine) {
        processQueue();
      }
    }, 30000);
  }
  
  // Procesamiento inicial por si quedaron elementos pendientes de sesiones previas
  processQueue();
};

export default {
  enqueuePayment,
  getPendingCount,
  subscribeToQueue,
  processQueue,
  initOfflineService
};
