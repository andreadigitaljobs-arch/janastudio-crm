const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asNonNegativeNumber = (value, field) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${field} debe ser un número mayor o igual a cero.`);
  }
  return number;
};

const uniqueUuidList = (values = []) => [...new Set(
  values.filter(value => typeof value === 'string' && UUID_PATTERN.test(value))
)];

export const selectPayableAppointments = (selectedAppointment, appointments = []) => {
  if (!selectedAppointment?.id || !selectedAppointment?.client_id) return [];

  const uniqueAppointments = new Map();
  [selectedAppointment, ...appointments].forEach((appointment) => {
    if (
      appointment?.id
      && appointment.client_id === selectedAppointment.client_id
      && appointment.status === 'Por Pagar'
    ) {
      uniqueAppointments.set(appointment.id, appointment);
    }
  });

  return [...uniqueAppointments.values()];
};

export const buildDirectSaleServiceAppointment = ({
  clientId,
  service,
  stylistId,
  timestamp = new Date().toISOString(),
}) => ({
  client_id: clientId,
  service_id: service?.id,
  staff_id: stylistId,
  status: 'Por Pagar',
  total_price: Number(service?.price || 0),
  scheduled_at: timestamp,
  completed_at: timestamp,
  notes: 'Venta directa desde Caja',
});

const normalizeProducts = (products = []) => {
  const byId = new Map();

  for (const product of products) {
    if (!product || product.type === 'extra' || !UUID_PATTERN.test(String(product.id || ''))) continue;

    const quantity = asNonNegativeNumber(product.quantity || 1, 'La cantidad del producto');
    if (quantity <= 0) continue;

    const current = byId.get(product.id);
    if (current) {
      current.quantity += quantity;
      continue;
    }

    byId.set(product.id, {
      ...product,
      id: String(product.id),
      quantity,
      price: asNonNegativeNumber(product.price, 'El precio del producto'),
    });
  }

  return [...byId.values()];
};

export const normalizeCheckoutPayment = (paymentData, idempotencyKey) => {
  if (!paymentData || typeof paymentData !== 'object') {
    throw new Error('El cobro no contiene datos válidos.');
  }

  const key = idempotencyKey || paymentData.idempotencyKey;
  if (!UUID_PATTERN.test(String(key || ''))) {
    throw new Error('El cobro necesita una clave de idempotencia válida.');
  }

  const totalUsd = asNonNegativeNumber(paymentData.totalUsd, 'El total del cobro');
  const fixedRate = asNonNegativeNumber(paymentData.fixedRate, 'La tasa de cambio');
  const transferBs = asNonNegativeNumber(paymentData.transferBs, 'El pago en bolívares');
  const cashUsd = asNonNegativeNumber(paymentData.cashUsd, 'El pago en dólares');
  const initialPaymentAmount = asNonNegativeNumber(paymentData.initialPaymentAmount, 'La cuota inicial');
  const remainingBalance = asNonNegativeNumber(paymentData.remainingBalance, 'El saldo pendiente');

  if (transferBs > 0 && fixedRate <= 0) {
    throw new Error('La tasa de cambio debe ser mayor que cero cuando existe un pago en bolívares.');
  }
  if (paymentData.isFinanced && initialPaymentAmount > totalUsd) {
    throw new Error('La cuota inicial no puede superar el total del cobro.');
  }

  const reconciledUsd = paymentData.isFinanced
    ? initialPaymentAmount + remainingBalance
    : cashUsd + (transferBs > 0 ? transferBs / fixedRate : 0);
  if (Math.abs(reconciledUsd - totalUsd) > 0.02) {
    throw new Error('La distribución del pago no coincide con el total del cobro.');
  }

  const appointmentIds = uniqueUuidList([
    ...(Array.isArray(paymentData.appointmentIds) ? paymentData.appointmentIds : []),
    paymentData.appointmentId,
  ]);

  return {
    ...paymentData,
    idempotencyKey: String(key),
    appointmentId: appointmentIds[0] || null,
    appointmentIds,
    totalUsd,
    fixedRate,
    transferBs,
    cashUsd,
    totalTips: asNonNegativeNumber(paymentData.totalTips, 'El total de propinas'),
    initialPaymentAmount,
    remainingBalance,
    totalInstallments: Math.max(0, Math.trunc(Number(paymentData.totalInstallments) || 0)),
    products: normalizeProducts(Array.isArray(paymentData.products) ? paymentData.products : []),
  };
};

export const prepareQueuedCheckout = (paymentData, createIdempotencyKey = () => crypto.randomUUID()) => {
  const existingKey = paymentData?.idempotencyKey;
  const idempotencyKey = existingKey || createIdempotencyKey();

  return {
    paymentData: normalizeCheckoutPayment(paymentData, idempotencyKey),
    migrated: !existingKey,
  };
};

export const isCheckoutUuid = value => UUID_PATTERN.test(String(value || ''));
