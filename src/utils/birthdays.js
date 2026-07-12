// src/utils/birthdays.js

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Every client with a birth_date, annotated with days until their next birthday,
// sorted from soonest to furthest. Wraps to next year once this year's date has passed.
export const getBirthdaysWithCountdown = (clients) => {
  const today = startOfToday();

  return (clients || [])
    .filter((c) => c.birth_date)
    .map((c) => {
      const bday = new Date(c.birth_date + 'T00:00:00');
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

      let targetDate = thisYearBday;
      if (thisYearBday < today) {
        targetDate = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
      }

      const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

      return {
        ...c,
        daysLeft: diffDays,
        isToday: diffDays === 0,
        isTomorrow: diffDays === 1,
        targetDate,
        turningAge: targetDate.getFullYear() - bday.getFullYear(),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

export const getUpcomingBirthdays = (clients, limit = 5) => {
  const list = getBirthdaysWithCountdown(clients);
  return limit ? list.slice(0, limit) : list;
};

// Widget rule: show today's birthdays plus tomorrow's; if nobody has a birthday
// tomorrow, fall back to whichever upcoming birthday is nearest.
export const getWidgetBirthdays = (clients) => {
  const list = getBirthdaysWithCountdown(clients);
  const today = list.filter((c) => c.isToday);
  const tomorrow = list.filter((c) => c.isTomorrow);

  if (tomorrow.length > 0) return [...today, ...tomorrow];

  const nearest = list.find((c) => c.daysLeft > 0);
  return nearest ? [...today, nearest] : today;
};

// Widget sections, cascading so the card never sits empty:
// Hoy → Mañana → Esta semana. If none of those have anyone, fall back to
// Este mes → Próximo mes → whoever's next, however far off that is.
export const getWidgetSections = (clients, maxTotal = 4) => {
  const list = getBirthdaysWithCountdown(clients);
  if (list.length === 0) return [];

  const today = list.filter((c) => c.daysLeft === 0);
  const tomorrow = list.filter((c) => c.daysLeft === 1);
  const week = list.filter((c) => c.daysLeft >= 2 && c.daysLeft <= 7);

  let sections = [
    { label: 'Hoy', items: today },
    { label: 'Mañana', items: tomorrow },
    { label: 'Esta semana', items: week },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    const todayDate = startOfToday();
    const thisMonthIdx = todayDate.getMonth();
    const nextMonthIdx = (thisMonthIdx + 1) % 12;

    const thisMonth = list.filter((c) => c.targetDate.getMonth() === thisMonthIdx && c.daysLeft > 7);
    const nextMonth = list.filter((c) => c.targetDate.getMonth() === nextMonthIdx);

    if (thisMonth.length > 0) {
      sections = [{ label: 'Este mes', items: thisMonth }];
    } else if (nextMonth.length > 0) {
      sections = [{ label: 'Próximo mes', items: nextMonth }];
    } else {
      sections = [{ label: 'Próximos cumpleaños', items: list }];
    }
  }

  // Cap the total shown so the widget stays compact, dropping the tail of
  // whichever section runs over and marking it as "+N more".
  let remaining = maxTotal;
  return sections
    .map((s) => {
      if (remaining <= 0) return null;
      const items = s.items.slice(0, remaining);
      remaining -= items.length;
      return { ...s, items, moreCount: s.items.length - items.length };
    })
    .filter(Boolean);
};

export const filterBirthdaysByPeriod = (list, period) => {
  switch (period) {
    case 'today':
      return list.filter((c) => c.daysLeft === 0);
    case 'week':
      return list.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7);
    case 'month':
      return list.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 31);
    case 'year':
    default:
      return list;
  }
};

// Groups an already-sorted (by daysLeft) list by calendar month of the upcoming
// birthday, so months come out ordered starting from the current month.
export const groupBirthdaysByMonth = (list) => {
  const groups = new Map();

  list.forEach((c) => {
    const idx = c.targetDate.getMonth();
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx).push(c);
  });

  return Array.from(groups.entries())
    .sort((a, b) => a[1][0].targetDate - b[1][0].targetDate)
    .map(([idx, list]) => ({ month: MONTH_NAMES[idx], monthIndex: idx, clients: list }));
};

export const formatBirthdayDate = (date) => (
  date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
);

// Playful, clearly-fake clients used only for previewing the birthdays UI.
// Never persisted — generated fresh from today's date so "today"/"tomorrow"
// always have someone in them, and spread across the year for the month view.
const DEMO_CATS = [
  { name: 'Michi Fernández', offset: 0, age: 27 },
  { name: 'Luna Bigotes', offset: 1, age: 31 },
  { name: 'Salem Ronroneo', offset: 4, age: 24 },
  { name: 'Nala Garabato', offset: 12, age: 29 },
  { name: 'Coco Whiskers', offset: 26, age: 35 },
  { name: 'Mimí Colitas', offset: 55, age: 22 },
  { name: 'Kitty Maullido', offset: 95, age: 40 },
  { name: 'Pelusa Felina', offset: 150, age: 26 },
  { name: 'Simona Zarpitas', offset: 210, age: 33 },
  { name: 'Tota Ronroneo', offset: 270, age: 28 },
  { name: 'Gatita Marrana', offset: 320, age: 30 },
];

export const getDemoBirthdayClients = () => {
  const today = startOfToday();
  return DEMO_CATS.map((c, i) => {
    const target = new Date(today);
    target.setDate(target.getDate() + c.offset);
    const birthYear = target.getFullYear() - c.age;
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return {
      id: `demo-${i}`,
      name: c.name,
      phone: '',
      birth_date: `${birthYear}-${mm}-${dd}`,
      isDemo: true,
    };
  });
};
