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
  const appointmentServices = _asArray(app.appointment_services);
  const firstService = appointmentServices[0];
  const serviceTotal = appointmentServices.reduce((sum, row) => (
    sum + Number(row.price_paid ?? row.services?.price ?? 0)
  ), 0);
  return {
    ...app,
    clients: app.clients || null,
    service_id: app.service_id || firstService?.service_id || null,
    staff_id: app.staff_id || firstService?.staff_id || null,
    services: app.services || firstService?.services || null,
    staff: app.staff || firstService?.staff || null,
    total_price: appointmentServices.length ? serviceTotal : Number(app.total_price || 0),
    appointment_services: appointmentServices,
    appointment_staff: _asArray(app.appointment_staff),
    appointment_extras: _asArray(app.appointment_extras),
    appointment_products: _asArray(app.appointment_products),
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
    const { data, error } = await supabase
      .from('service_costs')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at');
    if (error) throw error;
    return _asArray(data);
  },

  async replaceServiceCosts(serviceId, costs = []) {
    const { error: deleteError } = await supabase.from('service_costs').delete().eq('service_id', serviceId);
    if (deleteError) throw deleteError;
    if (costs.length === 0) return [];
    const rows = costs.map((cost) => ({
      service_id: serviceId,
      inventory_item_id: cost.inventory_item_id,
      item_name: cost.item_name,
      quantity_per_service: Number(cost.quantity_per_service) || 0,
      unit_cost: Number(cost.unit_cost) || 0,
      unit: cost.unit || 'unidad',
    }));
    const { data, error } = await supabase.from('service_costs').insert(rows).select();
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
        services (id, name, price, duration_minutes, commission_pct, included_items),
        staff!appointments_staff_id_fkey (id, name, display_name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount),
        appointment_services (
          id, service_id, staff_id, price_paid, status, scheduled_at, duration_minutes,
          client_package_id, package_supplies_cost, before_photo_url, after_photo_url,
          services (id, name, price, duration_minutes, commission_pct, included_items),
          staff (id, name, display_name, role, commission_pct)
        ),
        appointment_extras (id, price, service_extras (id, name, price, commission_pct)),
        appointment_products (id, quantity, price, cost, inventory (id, name, commission_pct))
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
        services (id, name, price, duration_minutes, commission_pct, included_items),
        staff!appointments_staff_id_fkey (id, name, display_name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount),
        appointment_services (
          id, service_id, staff_id, price_paid, status, scheduled_at, duration_minutes,
          client_package_id, package_supplies_cost, before_photo_url, after_photo_url,
          services (id, name, price, duration_minutes, commission_pct, included_items),
          staff (id, name, display_name, role, commission_pct)
        ),
        appointment_extras (id, price, service_extras (id, name, price, commission_pct)),
        appointment_products (id, quantity, price, cost, inventory (id, name, commission_pct))
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
    const payload = services.map((svc, idx) => ({ ...svc, sequence_order: idx }));
    const { data, error } = await supabase.rpc('create_appointment_order', {
      p_appointment: appointmentData,
      p_services: payload
    });
    if (error) throw error;
    return { id: data, ...appointmentData };
  },

  async getStaffSchedules(staffList = []) {
    const { data, error } = await supabase.from('staff_schedules').select('*').order('day_of_week');
    if (error) throw error;
    const rows = _asArray(data);
    const missing = _asArray(staffList).filter(s => !rows.some(r => r.staff_id === s.id));
    if (missing.length) {
      const seeds = missing.flatMap(s => Array.from({ length: 7 }, (_, day) => ({
        staff_id: s.id, day_of_week: day, is_working: day !== 0,
        start_time: day === 0 ? null : '09:00', end_time: day === 0 ? null : '18:00'
      })));
      const { data: inserted, error: seedError } = await supabase.from('staff_schedules').upsert(seeds, { onConflict: 'staff_id,day_of_week' }).select();
      if (seedError) throw seedError;
      return [...rows, ..._asArray(inserted)];
    }
    return rows;
  },

  async saveStaffSchedules(staffId, rows) {
    const payload = _asArray(rows).map(row => ({
      staff_id: staffId, day_of_week: row.day_of_week, is_working: !!row.is_working,
      start_time: row.is_working ? row.start_time : null,
      end_time: row.is_working ? row.end_time : null,
      updated_at: new Date().toISOString()
    }));
    const { data, error } = await supabase.from('staff_schedules').upsert(payload, { onConflict: 'staff_id,day_of_week' }).select();
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('jana:schedule-changed'));
    return _asArray(data);
  },

  async getStaffTimeOff(staffId) {
    let query = supabase.from('staff_time_off').select('*').order('date');
    if (staffId) query = query.eq('staff_id', staffId);
    const { data, error } = await query;
    if (error) throw error;
    return _asArray(data);
  },

  async addStaffTimeOff(staffId, date, reason = '') {
    const { data, error } = await supabase.from('staff_time_off').upsert({ staff_id: staffId, date, reason }, { onConflict: 'staff_id,date' }).select().single();
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('jana:schedule-changed'));
    return data;
  },

  async removeStaffTimeOff(id) {
    const { error } = await supabase.from('staff_time_off').delete().eq('id', id);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('jana:schedule-changed'));
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

  async updateStock(id, stock) {
    return this.updateInventoryItem(id, { stock: Math.max(0, Number(stock) || 0) });
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

  async logInventoryMovement(movement) {
    return this.addInventoryMovement(movement);
  },

  async getInventoryMovements() {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, inventory(name, category)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return _asArray(data);
  },

  async getProfitabilityReport(startDate, endDate) {
    const { data, error } = await supabase.rpc('get_profitability_report', {
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) throw error;
    return _asArray(data);
  },

  async getManagementReport(startDate, endDate) {
    const { data, error } = await supabase.rpc('get_management_report', { p_start: startDate, p_end: endDate });
    if (error) throw error;
    return data || {};
  },

  async getPromotions({ includeInactive = true } = {}) {
    let query = supabase.from('promotions').select('*, services(name), clients(name)').order('starts_at', { ascending: false });
    if (!includeInactive) query = query.eq('active', true).lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return _asArray(data);
  },

  async savePromotion(promotion) {
    const payload = { ...promotion };
    const id = payload.id;
    delete payload.id;
    const query = id ? supabase.from('promotions').update(payload).eq('id', id) : supabase.from('promotions').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  },

  async deletePromotion(id) {
    const { error } = await supabase.from('promotions').update({ active: false }).eq('id', id);
    if (error) throw error;
  },

  async getInventoryContainers() {
    const { data, error } = await supabase.from('inventory_containers').select('*, inventory(name, unit)').order('opened_at', { ascending: false });
    if (error) throw error;
    return _asArray(data);
  },

  async openInventoryContainer(container) {
    const { data, error } = await supabase.from('inventory_containers').insert(container).select().single();
    if (error) throw error;
    return data;
  },

  async closeInventoryContainer(id, closeReason, status = 'closed') {
    const { data, error } = await supabase.from('inventory_containers').update({ status, close_reason: closeReason, closed_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getAccountingOverview() {
    const [{ data: accounts, error: e1 }, { data: entries, error: e2 }, { data: items, error: e3 }, { data: bank, error: e4 }] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('active', true).order('code'),
      supabase.from('journal_entries').select('*, journal_lines(*, chart_of_accounts(code,name))').order('entry_date', { ascending: false }).limit(100),
      supabase.from('payables_receivables').select('*').order('due_date'),
      supabase.from('bank_statement_lines').select('*').order('transaction_date', { ascending: false }).limit(200)
    ]);
    if (e1 || e2 || e3 || e4) throw (e1 || e2 || e3 || e4);
    return { accounts: _asArray(accounts), entries: _asArray(entries), items: _asArray(items), bank: _asArray(bank) };
  },

  async addPayableReceivable(item) {
    const { data, error } = await supabase.from('payables_receivables').insert(item).select().single();
    if (error) throw error;
    return data;
  },

  async postJournalEntry(entry, lines) {
    const { data, error } = await supabase.rpc('post_journal_entry', { p_entry: entry, p_lines: lines });
    if (error) throw error;
    return data;
  },

  async addBankStatementLines(lines) {
    const { data, error } = await supabase.from('bank_statement_lines').insert(lines).select();
    if (error) throw error;
    return _asArray(data);
  },

  async reconcileBankLine(id, transactionId) {
    const { data, error } = await supabase.from('bank_statement_lines').update({ reconciled: true, transaction_id: transactionId }).eq('id', id).select().single();
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
      .select('*, clients(name, phone), services(name, category, price, duration_minutes), package_installments(*), package_sessions(*)')
      .in('status', ['active', 'completed', 'expired'])
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

  async uploadLaserProgressPhoto(file, clientPackageId, kind) {
    if (!file || !clientPackageId || !['before', 'after'].includes(kind)) {
      throw new Error('Faltan datos para guardar la foto láser.');
    }
    const extension = String(file.name || 'foto.jpg').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${clientPackageId}/${crypto.randomUUID()}-${kind}.${extension}`;
    const { error } = await supabase.storage.from('janastudio-laser-progress').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    return path;
  },

  async getLaserProgressPhotoUrl(path, expiresIn = 3600) {
    if (!path) return '';
    const { data, error } = await supabase.storage
      .from('janastudio-laser-progress')
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || '';
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

  async sellLaserPackage({ clientId, serviceId, sessions, total, paymentMode, paymentMethod, exchangeRate }) {
    const { data, error } = await supabase.rpc('sell_laser_package', {
      p_client_id: clientId, p_service_id: serviceId, p_sessions: sessions,
      p_total: total, p_payment_mode: paymentMode, p_payment_method: paymentMethod,
      p_exchange_rate: exchangeRate
    });
    if (error) throw error;
    _cacheInvalidate('transactions');
    return data;
  },

  async payPackageInstallment(installmentId, method, exchangeRate) {
    const { data, error } = await supabase.rpc('pay_package_installment', {
      p_installment_id: installmentId, p_method: method, p_exchange_rate: exchangeRate
    });
    if (error) throw error;
    _cacheInvalidate('transactions');
    return data;
  },

  async checkLaserPackageExpirations() {
    try {
      const { data, error } = await supabase.rpc('process_laser_package_lifecycle', {
        p_now: new Date().toISOString(),
      });
      if (error) throw error;
      if (Number(data?.warned || 0) > 0) {
        notificationService.sendNotification('Paquetes láser', `${data.warned} paquete(s) están cerca de vencer.`);
      }
      return data || { warned: 0, expired: 0 };
    } catch (e) {
      console.error('Error in checkLaserPackageExpirations:', e);
      return { warned: 0, expired: 0, error: e.message };
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
