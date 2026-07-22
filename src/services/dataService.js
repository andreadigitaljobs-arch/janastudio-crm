import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';
import {
  inferServiceCategories,
  normalizeServiceCategories,
} from '../domain/serviceCategoryRules.js';

// ─── Smart In-Memory Cache ────────────────────────────────────────────────────
const _cache = {};
const STAFF_LIST_SELECT = 'id, auth_user_id, email, name, display_name, role, commission_pct, active, created_at, phone, address, specialties, birth_date, id_card';
const STAFF_DETAIL_SELECT = `${STAFF_LIST_SELECT}, image_url`;

async function _invokeAdminStaff(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-staff', {
    body: { action, ...payload }
  });
  if (error) throw new Error(error.message || 'Admin operation failed');
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

function _cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete _cache[key];
    return null;
  }
  return entry.data;
}

function _cacheSet(key, data, ttlMs = 45000) {
  _cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

function _cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}

function _cacheInvalidateAppts() {
  Object.keys(_cache).filter(k => k.startsWith('appts_')).forEach(k => delete _cache[k]);
  delete _cache.clients;
}

function _asArray(value) {
  return Array.isArray(value) ? value : [];
}

function _normalizeAppointment(app) {
  if (!app || typeof app !== 'object') return app;
  return {
    ...app,
    clients: app.clients || null,
    services: app.services || null,
    appointment_staff: _asArray(app.appointment_staff)
  };
}

function _normalizeStaff(member) {
  if (!member || typeof member !== 'object') return member;
  return {
    ...member,
    specialties: _asArray(member.specialties)
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export const dataService = {
  supabase,
  invalidateOperationalCache() {
    _cacheInvalidate('clients', 'clients_lite', 'staff', 'staff_with_images', 'services', 'transactions', 'inventory', 'sale_inventory');
    _cacheInvalidateAppts();
  },

  invalidateSpecificCache(table) {
    if (table === 'appointments') {
      _cacheInvalidateAppts();
    } else if (table === 'transactions') {
      _cacheInvalidate('transactions');
    } else if (table === 'clients') {
      _cacheInvalidate('clients', 'clients_lite');
    } else if (table === 'inventory') {
      _cacheInvalidate('inventory', 'sale_inventory');
    } else if (table === 'services') {
      _cacheInvalidate('services');
    } else if (table === 'staff') {
      _cacheInvalidate('staff', 'staff_with_images');
    } else if (table === 'service_costs') {
      _cacheInvalidate('service_costs');
    }
  },

  invalidateClientsCache() {
    _cacheInvalidate('clients', 'clients_lite');
  },

  // ─── Clients ────────────────────────────────────────────────────────────────
  async getClients() {
    const cached = _cacheGet('clients');
    if (cached) return cached;

    const { data, error } = await supabase.rpc('get_clients_with_stats');
    if (error) {
      console.error("Error fetching clients via RPC:", error);
      return this.getClientsLite();
    }

    const result = _asArray(data);
    _cacheSet('clients', result, 45000);
    return result;
  },

  async getClientsLite() {
    const cached = _cacheGet('clients_lite');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, id_card, created_at, active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data).map(c => ({ ...c, total_visits: 0, total_spent: 0 }));
    _cacheSet('clients_lite', result, 45000);
    return result;
  },

  async checkClientExists(idCard) {
    if (!idCard) return null;
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id_card', idCard)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async addClient(client) {
    _cacheInvalidate('clients', 'clients_lite');
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...client,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ? 
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;

    try {
      notificationService.sendNotification(
        'Nueva Cliente Registrada 👤',
        `Se ha registrado a ${data.name || 'una nueva cliente'} (Tlf: ${data.phone || 'No registrado'}) en el sistema.`
      );
    } catch (e) {
      console.error('Error al enviar notificacion:', e);
    }

    return data;
  },

  async updateClient(id, updates) {
    _cacheInvalidate('clients', 'clients_lite');
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id) {
    _cacheInvalidate('clients', 'clients_lite');
    const { data: apps } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', id);

    if (apps && apps.length > 0) {
      const appIds = _asArray(apps).map(a => a.id);
      await Promise.all([
        supabase.from('appointment_staff').delete().in('appointment_id', appIds),
        supabase.from('appointments').delete().in('id', appIds)
      ]);
    }

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Staff ──────────────────────────────────────────────────────────────────
  async getStaff({ includeImages = false } = {}) {
    const cacheKey = includeImages ? 'staff_with_images' : 'staff';
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;
    const { data, error } = await supabase
      .from('staff')
      .select(includeImages ? STAFF_DETAIL_SELECT : STAFF_LIST_SELECT)
      .order('name');
    if (error) throw error;
    const result = _asArray(data).map(_normalizeStaff).filter(s => !s.role?.startsWith('ARCHIVED|'));
    _cacheSet(cacheKey, result, 45000);
    return result;
  },

  async getStaffByAuthUserId(authUserId) {
    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_DETAIL_SELECT)
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.role?.startsWith('ARCHIVED|')) return null;
    return _normalizeStaff(data);
  },

  async addStaff(member) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { data, error } = await supabase
      .from('staff')
      .insert([member])
      .select(STAFF_DETAIL_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async createStaffWithAuth(member) {
    if (!member.email) throw new Error('El email es obligatorio para crear acceso.');
    if (!member.username) throw new Error('La contraseña es obligatoria para crear acceso.');
    _cacheInvalidate('staff', 'staff_with_images');
    const { username: password, ...safeMember } = member;
    return _invokeAdminStaff('create', { member: safeMember, email: member.email, password });
  },

  async updateStaff(id, updates) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { username: _password, ...safeUpdates } = updates;
    return _invokeAdminStaff('update', { staffId: id, updates: safeUpdates });
  },

  async updateStaffAuthCredentials(authUserId, { email, password } = {}) {
    if (!authUserId || (!email && !password)) return;
    return _invokeAdminStaff('credentials', { authUserId, email, password });
  },

  async linkAuthToStaff(staffId, email, password) {
    return _invokeAdminStaff('link', { staffId, email, password });
  },

  async deleteStaff(id) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Services ───────────────────────────────────────────────────────────────
  async getServices() {
    const cached = _cacheGet('services');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name');
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet('services', result, 45000);
    return result;
  },

  async addService(service) {
    _cacheInvalidate('services');
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    _cacheInvalidate('services');
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    _cacheInvalidate('services');
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Service Costs (Costeo) ────────────────────────────────────────────────
  async getServiceCosts(serviceId) {
    const { data, error } = await supabase.rpc('get_service_costs', { p_service_id: serviceId });
    if (error) throw error;
    return _asArray(data);
  },

  async calculateServiceProfit(serviceId) {
    const { data, error } = await supabase.rpc('calculate_service_profit', { p_service_id: serviceId });
    if (error) throw error;
    return data;
  },

  async addServiceCost(cost) {
    _cacheInvalidate('service_costs');
    const { data, error } = await supabase
      .from('service_costs')
      .insert([cost])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateServiceCost(id, updates) {
    _cacheInvalidate('service_costs');
    const { data, error } = await supabase
      .from('service_costs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteServiceCost(id) {
    _cacheInvalidate('service_costs');
    const { error } = await supabase.from('service_costs').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Appointments ───────────────────────────────────────────────────────────
  async getAppointments(startDate, endDate) {
    const cacheKey = `appts_${startDate}_${endDate}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone, allergies),
        services (id, name, price, duration_minutes),
        staff!appointments_staff_id_fkey (id, name, display_name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount)
      `)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');
    if (error) throw error;
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async getTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointments(`${today}T00:00:00`, `${today}T23:59:59`);
  },

  async getClientPastAppointments(clientId, excludeAppointmentId) {
    let query = supabase
      .from('appointments')
      .select('id, scheduled_at, status, total_price, services (name, price), appointment_services (staff_id, staff (id, name, display_name))')
      .eq('client_id', clientId)
      .eq('status', 'Completado')
      .order('scheduled_at', { ascending: false })
      .limit(100);
    if (excludeAppointmentId) query = query.neq('id', excludeAppointmentId);
    const { data, error } = await query;
    if (error) throw error;
    return _asArray(data);
  },

  async getAppointmentsByState(states, startDate) {
    const cacheKey = `appts_state_${states.join('_')}_${startDate || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone, allergies),
        services (id, name, price, duration_minutes),
        staff!appointments_staff_id_fkey (id, name, display_name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount)
      `)
      .in('status', states);

    if (startDate) {
      query = query.gte('scheduled_at', startDate);
    }

    const { data, error } = await query.order('scheduled_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async addAppointment(appointment) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointment,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ?
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createAppointment(appointment) {
    return this.addAppointment(appointment);
  },

  async updateAppointment(id, updates) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAppointment(id) {
    _cacheInvalidateAppts();
    await supabase.from('appointment_staff').delete().eq('appointment_id', id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── APPOINTMENT SERVICES (Multiple services per appointment) ───────────────────────

  async createAppointmentWithServices(appointmentData, services = []) {
    _cacheInvalidateAppts();

    // Use the earliest per-service scheduled_at as the parent appointment's scheduled_at
    const earliestScheduledAt = services.length > 0
      ? services.reduce((min, svc) => {
          const t = svc.scheduled_at || appointmentData.scheduled_at;
          return (!min || new Date(t) < new Date(min)) ? t : min;
        }, null)
      : appointmentData.scheduled_at;

    // 1. Create the main appointment
    const { data: apptData, error: apptError } = await supabase
      .from('appointments')
      .insert([{
        client_id: appointmentData.client_id,
        status: appointmentData.status || 'Agendado',
        total_price: 0,
        scheduled_at: earliestScheduledAt || appointmentData.scheduled_at,
        notes: appointmentData.notes,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ?
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();

    if (apptError) throw apptError;

    // 2. Add services to appointment
    if (services.length > 0) {
      const serviceInserts = services.map((svc, idx) => ({
        appointment_id: apptData.id,
        service_id: svc.service_id,
        staff_id: svc.staff_id,
        sequence_order: idx,
        price_paid: svc.price_paid || 0,
        scheduled_at: svc.scheduled_at || appointmentData.scheduled_at,
        duration_minutes: svc.duration_minutes || 60,
        status: 'Pendiente'
      }));

      const { error: svcError } = await supabase
        .from('appointment_services')
        .insert(serviceInserts);

      if (svcError) throw svcError;
    }

    return apptData;
  },

  async addServiceToAppointment(appointmentId, serviceData) {
    _cacheInvalidateAppts();

    const { data, error } = await supabase
      .from('appointment_services')
      .insert([{
        appointment_id: appointmentId,
        service_id: serviceData.service_id,
        staff_id: serviceData.staff_id,
        price_paid: serviceData.price_paid || 0,
        scheduled_at: serviceData.scheduled_at || null,
        duration_minutes: serviceData.duration_minutes || 60,
        status: 'Pendiente'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStaffBusyServicesForDate(staffId, dateKey) {
    if (!staffId || !dateKey) return [];
    const dayStart = `${dateKey}T00:00:00`;
    const dayEnd = `${dateKey}T23:59:59`;

    const { data, error } = await supabase
      .from('appointment_services')
      .select('id, scheduled_at, duration_minutes, status, appointments!inner(status)')
      .eq('staff_id', staffId)
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .not('status', 'in', '("Cancelado")');

    if (error) throw error;
    return (data || []).filter(s => s.appointments?.status !== 'Cancelado');
  },

  async removeServiceFromAppointment(appointmentServiceId) {
    _cacheInvalidateAppts();

    const { error } = await supabase
      .from('appointment_services')
      .delete()
      .eq('id', appointmentServiceId);

    if (error) throw error;
  },

  async updateAppointmentService(appointmentServiceId, updates) {
    _cacheInvalidateAppts();

    const { data, error } = await supabase
      .from('appointment_services')
      .update(updates)
      .eq('id', appointmentServiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Vista "aplanada" para la Agenda: cada fila es UN servicio de UNA orden,
  // con su profesional y horario propios (una orden con 3 servicios = 3 tarjetas).
  async getAppointmentServicesFlat(startDate, endDate) {
    const cacheKey = `appt_svcs_flat_${startDate}_${endDate}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id,
        appointment_id,
        service_id,
        staff_id,
        price_paid,
        status,
        scheduled_at,
        duration_minutes,
        services (id, name, price, duration_minutes),
        staff (id, name, display_name, role),
        appointments!inner (id, client_id, status, notes, clients (id, name, phone, allergies, notes, hair_type))
      `)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');

    if (error) throw error;

    const result = _asArray(data).map(row => ({
      id: row.id,
      appointment_id: row.appointment_id,
      client_id: row.appointments?.client_id,
      clients: row.appointments?.clients,
      staff_id: row.staff_id,
      staff: row.staff,
      service_id: row.service_id,
      services: row.services || { name: 'Servicio', duration_minutes: row.duration_minutes, price: row.price_paid },
      scheduled_at: row.scheduled_at,
      duration_minutes: row.duration_minutes,
      total_price: row.price_paid,
      status: row.appointments?.status || 'Agendado',
      service_status: row.status
    }));

    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async getAppointmentWithServices(appointmentId) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone, email),
        appointment_services (
          id,
          service_id,
          staff_id,
          sequence_order,
          price_paid,
          status,
          scheduled_at,
          duration_minutes,
          started_at,
          completed_at,
          services (id, name, price, duration_minutes, commission_pct),
          staff (id, name, display_name, role, photo_url)
        ),
        appointment_extras (
          id,
          price,
          service_extras (id, name, price, commission_pct)
        ),
        appointment_products (
          id,
          quantity,
          price,
          inventory (id, name, commission_pct)
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error) throw error;
    return data;
  },

  async addExtraToAppointment(appointmentId, appointmentServiceId, extraId, price) {
    _cacheInvalidateAppts();

    const { data, error } = await supabase
      .from('appointment_extras')
      .insert([{
        appointment_id: appointmentId,
        appointment_service_id: appointmentServiceId,
        extra_id: extraId,
        price: price || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeExtraFromAppointment(appointmentExtraId) {
    _cacheInvalidateAppts();

    const { error } = await supabase
      .from('appointment_extras')
      .delete()
      .eq('id', appointmentExtraId);

    if (error) throw error;
  },

  async addProductToAppointment(appointmentId, productId, quantity, price, cost) {
    _cacheInvalidateAppts();

    const { data, error } = await supabase
      .from('appointment_products')
      .insert([{
        appointment_id: appointmentId,
        product_id: productId,
        quantity,
        price,
        cost: cost || 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeProductFromAppointment(appointmentProductId) {
    _cacheInvalidateAppts();

    const { error } = await supabase
      .from('appointment_products')
      .delete()
      .eq('id', appointmentProductId);

    if (error) throw error;
  },

  async updateServiceStatus(appointmentServiceId, status, startedAt = null, completedAt = null) {
    _cacheInvalidateAppts();

    const { data, error } = await supabase
      .from('appointment_services')
      .update({
        status,
        started_at: startedAt,
        completed_at: completedAt
      })
      .eq('id', appointmentServiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getServiceExtras() {
    const { data, error } = await supabase
      .from('service_extras')
      .select('*')
      .eq('active', true);

    if (error) throw error;
    return data;
  },

  // ─── Transactions ───────────────────────────────────────────────────────────
  async getTransactions(startDate) {
    const cacheKey = `transactions_${startDate || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet(cacheKey, result, 30000);
    return result;
  },

  async getClientTransactions(clientId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return _asArray(data);
  },

  async addTransaction(transaction) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ?
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id) {
    _cacheInvalidate('transactions');
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Inventory ──────────────────────────────────────────────────────────────
  async getInventory() {
    const cached = _cacheGet('inventory');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet('inventory', result, 45000);
    return result;
  },

  async getSaleInventoryCatalog() {
    return this.getInventory();
  },

  async getExtras() {
    const cached = _cacheGet('service_extras');
    if (cached) return cached;
    try {
      const { data, error } = await supabase
        .from('service_extras')
        .select('*')
        .order('name');
      if (error) throw error;
      const result = _asArray(data);
      _cacheSet('service_extras', result, 45000);
      return result;
    } catch (err) {
      console.warn("Could not load service_extras from Supabase (schema cache issue). Using fallback.", err);
      return [
        { id: 'ext-1', name: 'Ampolla Hidratación', price: 300, active: true },
        { id: 'ext-2', name: 'Exfoliación Manos', price: 200, active: true },
        { id: 'ext-3', name: 'Tratamiento Cejas', price: 400, active: true }
      ];
    }
  },

  async addInventoryItem(item) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(id) {
    _cacheInvalidate('inventory');
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
  },

  async addInventoryMovement(movement) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([movement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Worker Stats ───────────────────────────────────────────────────────────
  async getWorkerStats(startDate) {
    const { data, error } = await supabase.rpc('get_worker_stats', { p_start_date: startDate });
    if (error) throw error;
    return _asArray(data);
  },

  // ─── Exchange Rates ─────────────────────────────────────────────────────────
  async getExchangeRates() {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await response.json();
      const oficial = data.find(d => d.fuente === 'oficial');
      const paralelo = data.find(d => d.fuente === 'paralelo');
      const bcv = oficial?.promedio || 0;
      const usdt = paralelo?.promedio || 0;
      return { bcv, usdt, updated_at: new Date().toISOString() };
    } catch (e) {
      console.error('Error fetching exchange rates:', e);
      return { bcv: 0, usdt: 0, updated_at: null };
    }
  },

  // ─── Notifications ──────────────────────────────────────────────────────────
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return _asArray(data);
  },

  async markNotificationRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  // ─── System Settings ────────────────────────────────────────────────────────
  async getSystemSetting(key, fallback = '') {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  },

  async setSystemSetting(key, value) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value: String(value || '').trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      .select('key, value')
      .single();
    if (error) throw error;
    return data.value;
  },

  // ─── Capillary Diagnoses ───────────────────────────────────────────────────
  async getCapillaryDiagnoses(clientId) {
    const { data, error } = await supabase
      .from('capillary_diagnoses')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addCapillaryDiagnosis(diagnosis) {
    const { data, error } = await supabase
      .from('capillary_diagnoses')
      .insert([diagnosis])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Client Packages ───────────────────────────────────────────────────────
  async getClientPackages(clientId) {
    const { data, error } = await supabase
      .from('client_packages')
      .select('*, services(name), package_installments(*)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllActiveLaserPackages() {
    const { data, error } = await supabase
      .from('client_packages')
      .select('*, clients(name, phone), services(name, category), package_installments(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Filtramos solo los de láser en memoria si no podemos asegurar que el service_id sea de láser
    const result = (data || []).filter(pkg => {
      const sName = (pkg.services?.name || '').toLowerCase();
      const sCat = (pkg.services?.category || '').toLowerCase();
      return sName.includes('láser') || sName.includes('laser') || sName.includes('depilación') ||
             sCat.includes('laser') || sCat.includes('depilación');
    });
    return result;
  },

  async addClientPackage(pkg) {
    const { data, error } = await supabase
      .from('client_packages')
      .insert([pkg])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addPackageInstallments(installments) {
    const { data, error } = await supabase
      .from('package_installments')
      .insert(installments)
      .select();
    if (error) throw error;
    return data;
  },

  async updatePackageInstallment(installmentId, updates) {
    const { data, error } = await supabase
      .from('package_installments')
      .update(updates)
      .eq('id', installmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async usePackageSession(clientPackageId, appointmentId = null, notes = '', suppliesCost = 0) {
    const { data: pkg, error: getErr } = await supabase
      .from('client_packages')
      .select('used_sessions, total_sessions')
      .eq('id', clientPackageId)
      .single();
    if (getErr) throw getErr;

    if (pkg.used_sessions >= pkg.total_sessions) {
      throw new Error('Todas las sesiones de este paquete ya han sido consumidas.');
    }

    const newUsed = pkg.used_sessions + 1;
    const status = newUsed >= pkg.total_sessions ? 'completed' : 'active';

    const { error: updErr } = await supabase
      .from('client_packages')
      .update({ used_sessions: newUsed, status })
      .eq('id', clientPackageId);
    if (updErr) throw updErr;

    const { data: sessionLog, error: logErr } = await supabase
      .from('package_sessions')
      .insert([{
        client_package_id: clientPackageId,
        appointment_id: appointmentId,
        notes,
        supplies_cost: suppliesCost
      }])
      .select()
      .single();
    if (logErr) throw logErr;

    return sessionLog;
  },

  // ─── Payment Plans & Installments ──────────────────────────────────────────
  async getClientPaymentPlans(clientId) {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPendingPaymentPlans() {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*, clients(name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addPaymentPlan(plan) {
    const { data, error } = await supabase
      .from('payment_plans')
      .insert([plan])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async recordInstallmentPayment(paymentPlanId, amountPaid, paymentMethod) {
    const { data: plan, error: getErr } = await supabase
      .from('payment_plans')
      .select('remaining_balance, total_installments, paid_installments')
      .eq('id', paymentPlanId)
      .single();
    if (getErr) throw getErr;

    const remaining = Number(plan.remaining_balance) - Number(amountPaid);
    const newPaidInstallments = plan.paid_installments + 1;
    const status = remaining <= 0 ? 'paid' : 'pending';

    const { error: updErr } = await supabase
      .from('payment_plans')
      .update({
        remaining_balance: Math.max(0, remaining),
        paid_installments: newPaidInstallments,
        status
      })
      .eq('id', paymentPlanId);
    if (updErr) throw updErr;

    const { data: log, error: logErr } = await supabase
      .from('installment_payments')
      .insert([{
        payment_plan_id: paymentPlanId,
        amount_paid: amountPaid,
        payment_method: paymentMethod
      }])
      .select()
      .single();
    if (logErr) throw logErr;

    return log;
  },

  async updateAppointmentStatus(id, status) {
    return this.updateAppointment(id, { status });
  },

  async processFinalPayment(paymentData) {
    if (!paymentData?.idempotencyKey) {
      throw new Error('El cobro no tiene clave de idempotencia y no puede procesarse de forma segura.');
    }

    const { data, error } = await supabase.rpc('process_checkout_atomic', {
      p_payment: paymentData,
      p_idempotency_key: paymentData.idempotencyKey,
    });
    if (error) throw error;

    _cacheInvalidate('transactions', 'inventory', 'sale_inventory', 'clients', 'clients_lite');
    _cacheInvalidateAppts();

    return {
      success: true,
      transactionId: data?.transaction_id || data,
      replayed: Boolean(data?.replayed),
    };
  },

  async checkLaserPackageExpirations() {
    try {
      const { data: packages, error } = await supabase
        .from('client_packages')
        .select('*, clients(id, name, phone), services(name, category)')
        .eq('status', 'active');
      
      if (error) throw error;
      if (!packages || packages.length === 0) return;

      const now = new Date();

      for (const pkg of packages) {
        const serviceName = pkg.services?.name || '';
        const serviceCategory = pkg.services?.category || '';
        const isLaser = serviceName.toLowerCase().includes('láser') || 
                        serviceName.toLowerCase().includes('laser') || 
                        serviceName.toLowerCase().includes('depilación') ||
                        serviceCategory.toLowerCase().includes('laser') || 
                        serviceCategory.toLowerCase().includes('depilación');

        if (!isLaser) continue;

        const createdAt = new Date(pkg.created_at);
        const diffTime = Math.abs(now - createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // 9 months = 270 days, 10 months = 300 days
        const nineMonthsDays = 270;
        const tenMonthsDays = 300;

        if (diffDays >= nineMonthsDays && diffDays < tenMonthsDays) {
          const { data: existingNotif, error: notifError } = await supabase
            .from('notifications')
            .select('id')
            .eq('metadata->>client_package_id', pkg.id)
            .limit(1);

          if (notifError) {
            console.error('Error checking existing notifications:', notifError);
            continue;
          }

          if (!existingNotif || existingNotif.length === 0) {
            const clientName = pkg.clients?.name || 'Cliente';
            const title = 'Paquete Láser por Vencer ⚡';
            const message = `A la clienta ${clientName} le queda 1 mes para culminar su paquete de depilación láser de 8 sesiones (Plazo de 10 meses). Consumidas: ${pkg.used_sessions || 0}/8.`;
            
            const { error: insertError } = await supabase
              .from('notifications')
              .insert([{
                title,
                message,
                type: 'warning',
                read: false,
                metadata: {
                  client_package_id: pkg.id,
                  client_id: pkg.client_id
                }
              }]);

            if (insertError) {
              console.error('Error inserting laser package warning notification:', insertError);
            } else {
              try {
                notificationService.sendNotification(title, message);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error in checkLaserPackageExpirations:', e);
    }
  },

  // ─── Service Categories ─────────────────────────────────────────────────────
  async getServiceCategories() {
    try {
      const val = await this.getSystemSetting('service_categories', '[]');
      let list = normalizeServiceCategories(JSON.parse(val));

      if (list.length === 0) {
        const { data: serviceRows, error } = await supabase
          .from('services')
          .select('category')
          .not('category', 'is', null)
          .order('category');
        if (error) throw error;

        list = inferServiceCategories(serviceRows);
        if (list.length === 0) {
          list = normalizeServiceCategories([
            { name: 'Estilismo', icon: 'Scissors' },
            { name: 'Cejas', icon: 'Brush' },
            { name: 'Pestañas', icon: 'Sparkles' },
            { name: 'Uñas', icon: 'NailPolish' },
            { name: 'Facial', icon: 'Smile' },
            { name: 'Combos', icon: 'Crown' },
          ]);
        }

        // El listado inferido debe mostrarse incluso si el usuario actual no
        // tiene permisos administrativos para persistir la configuración.
        try {
          await this.setSystemSetting('service_categories', JSON.stringify(list));
        } catch (persistError) {
          console.warn('No se pudo persistir service_categories:', persistError);
        }
      }
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async addServiceCategory(name, icon) {
    const list = await this.getServiceCategories();
    const normalizedName = String(name || '').trim();
    if (!normalizedName) throw new Error('El nombre de la categoría es obligatorio.');
    if (list.some(category => category.name.toLocaleLowerCase('es') === normalizedName.toLocaleLowerCase('es'))) {
      throw new Error('Esa categoría ya existe.');
    }

    const category = { name: normalizedName, icon };
    await this.setSystemSetting('service_categories', JSON.stringify([...list, category]));
    return category;
  },

  async updateServiceCategory(oldName, oldIcon, newName, newIcon) {
    const list = await this.getServiceCategories();
    const idx = list.findIndex(c => c.name === oldName);
    if (idx === -1) throw new Error('La categoría ya no existe.');

    const normalizedName = String(newName || '').trim();
    if (!normalizedName) throw new Error('El nombre de la categoría es obligatorio.');
    const duplicate = list.some((category, index) => (
      index !== idx && category.name.toLocaleLowerCase('es') === normalizedName.toLocaleLowerCase('es')
    ));
    if (duplicate) throw new Error('Esa categoría ya existe.');

    if (oldName !== normalizedName) {
      const { error } = await supabase
        .from('services')
        .update({ category: normalizedName })
        .eq('category', oldName);
      if (error) throw error;
      _cacheInvalidate('services');
    }

    list[idx] = { name: normalizedName, icon: newIcon };
    await this.setSystemSetting('service_categories', JSON.stringify(list));
    return list[idx];
  },

  async deleteServiceCategory(name) {
    const { count, error } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('category', name);
    if (error) throw error;
    if (count > 0) {
      throw new Error(`No puedes eliminar "${name}" porque tiene ${count} servicio${count === 1 ? '' : 's'} asociado${count === 1 ? '' : 's'}.`);
    }

    const list = await this.getServiceCategories();
    const filtered = list.filter(category => category.name !== name);
    await this.setSystemSetting('service_categories', JSON.stringify(filtered));
  },

  // ─── Service Strategies ─────────────────────────────────────────────────────
  async getServiceStrategies() {
    try {
      const val = await this.getSystemSetting('service_strategies', '[]');
      let list = JSON.parse(val);
      if (!list || list.length === 0) {
        list = [
          { value: 'MVP', label: 'Servicio Base / MVP' },
          { value: 'Premium', label: 'Servicio Premium / Alta Rentabilidad' }
        ];
        await this.setSystemSetting('service_strategies', JSON.stringify(list));
      }
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async addServiceStrategy(value, label) {
    const list = await this.getServiceStrategies();
    list.push({ value, label });
    await this.setSystemSetting('service_strategies', JSON.stringify(list));
    return { value, label };
  },

  // ─── Checklist Items ────────────────────────────────────────────────────────
  async getChecklistItems() {
    try {
      const val = await this.getSystemSetting('checklist_items', '[]');
      let list = JSON.parse(val);
      if (!list || list.length === 0) {
        list = [
          { id: '1', name: 'Cera Depilatoria Cejas (gr)', base_cost: 0.05 },
          { id: '2', name: 'Espuma Limpiadora Facial', base_cost: 0.15 },
          { id: '3', name: 'Bandana Depilatoria Cejas', base_cost: 0.04 }
        ];
        await this.setSystemSetting('checklist_items', JSON.stringify(list));
      }
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async addChecklistItem(item) {
    const list = await this.getChecklistItems();
    const newItem = {
      id: String(Date.now()),
      name: item.name,
      base_cost: Number(item.base_cost || 0)
    };
    list.push(newItem);
    await this.setSystemSetting('checklist_items', JSON.stringify(list));
    return newItem;
  },

  async deleteChecklistItem(id) {
    const list = await this.getChecklistItems();
    const filtered = list.filter(item => String(item.id) !== String(id));
    await this.setSystemSetting('checklist_items', JSON.stringify(filtered));
  },

  // ─── Auth ───────────────────────────────────────────────────────────────────
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};
