const isSameMonth = (value, referenceDate = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === referenceDate.getFullYear()
    && date.getMonth() === referenceDate.getMonth();
};

export const buildMonthlyStaffRanking = (appointments = [], referenceDate = new Date()) => {
  const totals = {};

  appointments
    .filter(appointment => isSameMonth(
      appointment.completed_at || appointment.scheduled_at || appointment.created_at,
      referenceDate
    ))
    .forEach(appointment => {
      const services = appointment.appointment_services?.length
        ? appointment.appointment_services
        : [{
            staff_id: appointment.staff_id,
            staff: appointment.staff,
            price_paid: appointment.total_price ?? appointment.services?.price
          }];

      services.forEach(service => {
        const staff = service.staff || (service.staff_id === appointment.staff_id ? appointment.staff : null);
        const staffId = service.staff_id || staff?.id;
        if (!staffId) return;
        if (!totals[staffId]) {
          totals[staffId] = {
            id: staffId,
            staff,
            earnings: 0,
            services: 0
          };
        }
        totals[staffId].earnings += Number(service.price_paid || 0);
        totals[staffId].services += 1;
      });
    });

  return Object.values(totals).sort((a, b) => b.earnings - a.earnings);
};

export const buildMonthlyClientRanking = (transactions = [], clients = [], referenceDate = new Date()) => {
  const clientsById = new Map(clients.map(client => [client.id, client]));
  const totals = {};

  transactions
    .filter(transaction =>
      transaction.type === 'income'
      && transaction.client_id
      && isSameMonth(transaction.created_at, referenceDate)
    )
    .forEach(transaction => {
      const clientId = transaction.client_id;
      if (!totals[clientId]) {
        totals[clientId] = {
          id: clientId,
          client: clientsById.get(clientId),
          spent: 0,
          purchases: 0
        };
      }
      totals[clientId].spent += Number(transaction.amount || 0);
      totals[clientId].purchases += 1;
    });

  return Object.values(totals)
    .filter(client => client.spent > 0)
    .sort((a, b) => b.spent - a.spent);
};
