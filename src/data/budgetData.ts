export type ScreenView =
  | 'dashboard'
  | 'movements'
  | 'detail'
  | 'register'
  | 'edit'
  | 'register-income';

export type MovementType = 'expense' | 'income';

export type ExpenseCategory =
  | 'Alimentación'
  | 'Transporte'
  | 'Servicios públicos'
  | 'Ropa y compras personales'
  | 'Entretenimiento y ocio';

export type IncomeCategory =
  | 'Salario'
  | 'Trabajo independiente'
  | 'Negocio'
  | 'Inversiones'
  | 'Regalo'
  | 'Bonificación'
  | 'Reembolso'
  | 'Otro';

export type PaymentMethod =
  | 'Efectivo'
  | 'Cuenta bancaria'
  | 'Nequi'
  | 'Daviplata'
  | 'Tarjeta'
  | 'Otro';

export interface ExpenseMovement {
  id: string;
  type: MovementType;
  day: number;
  dateISO: string;
  dateLabel: string;
  fullDateLabel: string;
  weekdayShort: string;
  timeLabel: string;
  description: string;
  category: ExpenseCategory | IncomeCategory;
  paymentMethod?: PaymentMethod;
  amount: number;
  notes: string;
}

export interface DailyExpense {
  day: number;
  dateLabel: string;
  weekdayShort: string;
  amount: number;
  primaryCategory: ExpenseCategory;
  note: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Alimentación',
  'Transporte',
  'Servicios públicos',
  'Ropa y compras personales',
  'Entretenimiento y ocio',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta',
  'Otro',
];

export const BUDGET_META = {
  monthLabel: 'Noviembre 2026',
  monthPrefix: '2026-11',
  totalDaysInMonth: 30,
  currentDay: 24,
  todayISO: '2026-11-24',
  monthlyBudget: 3_200_000,
};

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_FULL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MONTHS_FULL = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function parseSpanishDate(dateISO: string): {
  day: number;
  dateLabel: string;
  fullDateLabel: string;
  weekdayShort: string;
} {
  const [year, month, dayNum] = dateISO.split('-').map(Number);
  const safeYear = year || 2026;
  const safeMonthIdx = (month || 11) - 1;
  const safeDay = dayNum || 1;
  const dateObj = new Date(safeYear, safeMonthIdx, safeDay);
  const weekdayIdx = dateObj.getDay();

  return {
    day: safeDay,
    dateLabel: `${safeDay} ${MONTHS_SHORT[safeMonthIdx] ?? 'nov'} ${safeYear}`,
    fullDateLabel: `${WEEKDAYS_FULL[weekdayIdx]}, ${safeDay} de ${
      MONTHS_FULL[safeMonthIdx] ?? 'noviembre'
    } de ${safeYear}`,
    weekdayShort: WEEKDAYS_SHORT[weekdayIdx],
  };
}

export function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  const absFormatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));
  return rounded < 0 ? `-$${absFormatted} COP` : `$${absFormatted} COP`;
}

export function formatShortCOP(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions.toFixed(1).replace('.', ',')}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`;
  }
  return `$${amount}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function buildDailyExpenses(
  movements: ExpenseMovement[],
  currentDay: number
): DailyExpense[] {
  const expensesOnly = movements.filter((m) => m.type === 'expense');
  const maxRecordedDay = Math.max(
    currentDay,
    ...expensesOnly
      .filter((m) => m.dateISO.startsWith(`${BUDGET_META.monthPrefix}-`))
      .map((m) => m.day)
  );

  const byDay = new Map<number, ExpenseMovement[]>();
  for (const m of expensesOnly) {
    if (!m.dateISO.startsWith(`${BUDGET_META.monthPrefix}-`)) continue;
    const list = byDay.get(m.day) ?? [];
    list.push(m);
    byDay.set(m.day, list);
  }

  const series: DailyExpense[] = [];
  for (let day = 1; day <= maxRecordedDay; day++) {
    const dayMovements = byDay.get(day) ?? [];
    const totalAmount = dayMovements.reduce((sum, m) => sum + m.amount, 0);
    const paddedDay = String(day).padStart(2, '0');
    const dateInfo = parseSpanishDate(`2026-11-${paddedDay}`);
    const latestInDay = dayMovements[0];

    series.push({
      day,
      dateLabel: dateInfo.dateLabel,
      weekdayShort: dateInfo.weekdayShort,
      amount: totalAmount,
      primaryCategory:
        latestInDay && latestInDay.type === 'expense'
          ? (latestInDay.category as ExpenseCategory)
          : 'Alimentación',
      note:
        dayMovements.length > 1
          ? `${dayMovements.length} gastos registrados`
          : latestInDay
          ? latestInDay.description
          : 'Sin gastos registrados',
    });
  }

  return series;
}

export const INITIAL_MOVEMENTS: ExpenseMovement[] = [
  {
    id: 'mov-24',
    type: 'expense',
    day: 24,
    dateISO: '2026-11-24',
    dateLabel: '24 nov 2026',
    fullDateLabel: 'Martes, 24 de noviembre de 2026',
    weekdayShort: 'Mar',
    timeLabel: '16:15',
    description: 'Mercado semanal de frutas y despensa',
    category: 'Alimentación',
    amount: 84_500,
    notes: 'Compra de frutas frescas, verduras, huevos y café molido en supermercado de barrio.',
  },
  {
    id: 'mov-23',
    type: 'expense',
    day: 23,
    dateISO: '2026-11-23',
    dateLabel: '23 nov 2026',
    fullDateLabel: 'Lunes, 23 de noviembre de 2026',
    weekdayShort: 'Lun',
    timeLabel: '08:20',
    description: 'Recarga tarjeta de transporte público',
    category: 'Transporte',
    amount: 38_500,
    notes: 'Saldo para trayectos laborales de la semana en transporte masivo.',
  },
  {
    id: 'mov-22',
    type: 'expense',
    day: 22,
    dateISO: '2026-11-22',
    dateLabel: '22 nov 2026',
    fullDateLabel: 'Domingo, 22 de noviembre de 2026',
    weekdayShort: 'Dom',
    timeLabel: '19:10',
    description: 'Boletas de cine y snacks',
    category: 'Entretenimiento y ocio',
    amount: 74_000,
    notes: 'Dos entradas función nocturna y combo mediano de crispetas.',
  },
  {
    id: 'mov-21',
    type: 'expense',
    day: 21,
    dateISO: '2026-11-21',
    dateLabel: '21 nov 2026',
    fullDateLabel: 'Sábado, 21 de noviembre de 2026',
    weekdayShort: 'Sáb',
    timeLabel: '15:40',
    description: 'Camisa básica de algodón',
    category: 'Ropa y compras personales',
    amount: 125_000,
    notes: 'Prenda casual para oficina adquirida en centro comercial.',
  },
  {
    id: 'mov-20',
    type: 'expense',
    day: 20,
    dateISO: '2026-11-20',
    dateLabel: '20 nov 2026',
    fullDateLabel: 'Viernes, 20 de noviembre de 2026',
    weekdayShort: 'Vie',
    timeLabel: '10:05',
    description: 'Factura mensual de energía eléctrica',
    category: 'Servicios públicos',
    amount: 148_000,
    notes: 'Pago oportuno del periodo facturado de energía residencial.',
  },
  {
    id: 'mov-19',
    type: 'expense',
    day: 19,
    dateISO: '2026-11-19',
    dateLabel: '19 nov 2026',
    fullDateLabel: 'Jueves, 19 de noviembre de 2026',
    weekdayShort: 'Jue',
    timeLabel: '17:30',
    description: 'Libro y café de la tarde',
    category: 'Entretenimiento y ocio',
    amount: 34_000,
    notes: 'Novela de bolsillo y espresso doble en librería local.',
  },
  {
    id: 'mov-18',
    type: 'expense',
    day: 18,
    dateISO: '2026-11-18',
    dateLabel: '18 nov 2026',
    fullDateLabel: 'Miércoles, 18 de noviembre de 2026',
    weekdayShort: 'Mié',
    timeLabel: '18:50',
    description: 'Compra de abarrotes y café',
    category: 'Alimentación',
    amount: 63_000,
    notes: 'Granos, aceite, pan artesanal y lácteos para la semana.',
  },
  {
    id: 'mov-17',
    type: 'expense',
    day: 17,
    dateISO: '2026-11-17',
    dateLabel: '17 nov 2026',
    fullDateLabel: 'Martes, 17 de noviembre de 2026',
    weekdayShort: 'Mar',
    timeLabel: '13:15',
    description: 'Movilidad urbana y refrigerio',
    category: 'Transporte',
    amount: 22_000,
    notes: 'Carrera corta por lluvia y bebida en ruta.',
  },
  {
    id: 'mov-16',
    type: 'expense',
    day: 16,
    dateISO: '2026-11-16',
    dateLabel: '16 nov 2026',
    fullDateLabel: 'Lunes, 16 de noviembre de 2026',
    weekdayShort: 'Lun',
    timeLabel: '09:30',
    description: 'Factura de gas natural domiciliario',
    category: 'Servicios públicos',
    amount: 112_000,
    notes: 'Pago mensual del servicio de gas residencial.',
  },
  {
    id: 'mov-15',
    type: 'expense',
    day: 15,
    dateISO: '2026-11-15',
    dateLabel: '15 nov 2026',
    fullDateLabel: 'Domingo, 15 de noviembre de 2026',
    weekdayShort: 'Dom',
    timeLabel: '13:45',
    description: 'Café de especialidad y almuerzo',
    category: 'Alimentación',
    amount: 54_000,
    notes: 'Almuerzo de domingo en restaurante del sector.',
  },
  {
    id: 'mov-14',
    type: 'expense',
    day: 14,
    dateISO: '2026-11-14',
    dateLabel: '14 nov 2026',
    fullDateLabel: 'Sábado, 14 de noviembre de 2026',
    weekdayShort: 'Sáb',
    timeLabel: '16:20',
    description: 'Calzado deportivo en tienda local',
    category: 'Ropa y compras personales',
    amount: 185_000,
    notes: 'Tenis para caminar en promoción de temporada.',
  },
  {
    id: 'mov-13',
    type: 'expense',
    day: 13,
    dateISO: '2026-11-13',
    dateLabel: '13 nov 2026',
    fullDateLabel: 'Viernes, 13 de noviembre de 2026',
    weekdayShort: 'Vie',
    timeLabel: '20:30',
    description: 'Salida a cenar con amigos',
    category: 'Entretenimiento y ocio',
    amount: 89_000,
    notes: 'Plato fuerte y bebida compartida en restaurante.',
  },
  {
    id: 'mov-12',
    type: 'expense',
    day: 12,
    dateISO: '2026-11-12',
    dateLabel: '12 nov 2026',
    fullDateLabel: 'Jueves, 12 de noviembre de 2026',
    weekdayShort: 'Jue',
    timeLabel: '12:40',
    description: 'Transporte y trayecto al centro',
    category: 'Transporte',
    amount: 31_000,
    notes: 'Ida y regreso en transporte urbano para diligencia personal.',
  },
  {
    id: 'mov-11',
    type: 'expense',
    day: 11,
    dateISO: '2026-11-11',
    dateLabel: '11 nov 2026',
    fullDateLabel: 'Miércoles, 11 de noviembre de 2026',
    weekdayShort: 'Mié',
    timeLabel: '18:05',
    description: 'Artículos de cuidado personal',
    category: 'Ropa y compras personales',
    amount: 47_000,
    notes: 'Bloqueador solar y productos de higiene personal en farmacia.',
  },
  {
    id: 'mov-10',
    type: 'expense',
    day: 10,
    dateISO: '2026-11-10',
    dateLabel: '10 nov 2026',
    fullDateLabel: 'Martes, 10 de noviembre de 2026',
    weekdayShort: 'Mar',
    timeLabel: '07:50',
    description: 'Trayectos diarios en bus urbano',
    category: 'Transporte',
    amount: 18_500,
    notes: 'Pasajes de ida y vuelta jornada laboral.',
  },
  {
    id: 'mov-9',
    type: 'expense',
    day: 9,
    dateISO: '2026-11-09',
    dateLabel: '9 nov 2026',
    fullDateLabel: 'Lunes, 9 de noviembre de 2026',
    weekdayShort: 'Lun',
    timeLabel: '11:15',
    description: 'Factura de acueducto y alcantarillado',
    category: 'Servicios públicos',
    amount: 95_000,
    notes: 'Recibo bimestral prorrateado del servicio de agua.',
  },
  {
    id: 'mov-8',
    type: 'expense',
    day: 8,
    dateISO: '2026-11-08',
    dateLabel: '8 nov 2026',
    fullDateLabel: 'Domingo, 8 de noviembre de 2026',
    weekdayShort: 'Dom',
    timeLabel: '09:40',
    description: 'Panadería y almuerzo dominical',
    category: 'Alimentación',
    amount: 42_000,
    notes: 'Pan de bono, chocolate y menú del día.',
  },
  {
    id: 'mov-7',
    type: 'expense',
    day: 7,
    dateISO: '2026-11-07',
    dateLabel: '7 nov 2026',
    fullDateLabel: 'Sábado, 7 de noviembre de 2026',
    weekdayShort: 'Sáb',
    timeLabel: '10:50',
    description: 'Mercado semanal completo',
    category: 'Alimentación',
    amount: 164_000,
    notes: 'Proteínas, granos, frutas y verduras en supermercado.',
  },
  {
    id: 'mov-6',
    type: 'expense',
    day: 6,
    dateISO: '2026-11-06',
    dateLabel: '6 nov 2026',
    fullDateLabel: 'Viernes, 6 de noviembre de 2026',
    weekdayShort: 'Vie',
    timeLabel: '21:00',
    description: 'Cena y evento cultural',
    category: 'Entretenimiento y ocio',
    amount: 115_000,
    notes: 'Boleta de teatro y cena ligera al salir.',
  },
  {
    id: 'mov-5',
    type: 'expense',
    day: 5,
    dateISO: '2026-11-05',
    dateLabel: '5 nov 2026',
    fullDateLabel: 'Jueves, 5 de noviembre de 2026',
    weekdayShort: 'Jue',
    timeLabel: '12:55',
    description: 'Almuerzo ejecutivo',
    category: 'Alimentación',
    amount: 19_000,
    notes: 'Menú corriente cerca de la oficina.',
  },
  {
    id: 'mov-4',
    type: 'expense',
    day: 4,
    dateISO: '2026-11-04',
    dateLabel: '4 nov 2026',
    fullDateLabel: 'Miércoles, 4 de noviembre de 2026',
    weekdayShort: 'Mié',
    timeLabel: '17:20',
    description: 'Compra de verduras y proteínas',
    category: 'Alimentación',
    amount: 56_000,
    notes: 'Reposición de alimentos frescos a mitad de semana.',
  },
  {
    id: 'mov-3',
    type: 'expense',
    day: 3,
    dateISO: '2026-11-03',
    dateLabel: '3 nov 2026',
    fullDateLabel: 'Martes, 3 de noviembre de 2026',
    weekdayShort: 'Mar',
    timeLabel: '08:10',
    description: 'Pasajes y traslado matutino',
    category: 'Transporte',
    amount: 24_500,
    notes: 'Movilidad hacia reunión temprana y regreso.',
  },
  {
    id: 'mov-2',
    type: 'expense',
    day: 2,
    dateISO: '2026-11-02',
    dateLabel: '2 nov 2026',
    fullDateLabel: 'Lunes, 2 de noviembre de 2026',
    weekdayShort: 'Lun',
    timeLabel: '10:00',
    description: 'Factura servicio de internet hogar',
    category: 'Servicios públicos',
    amount: 142_000,
    notes: 'Plan mensual de fibra óptica residencial.',
  },
  {
    id: 'mov-1',
    type: 'expense',
    day: 1,
    dateISO: '2026-11-01',
    dateLabel: '1 nov 2026',
    fullDateLabel: 'Domingo, 1 de noviembre de 2026',
    weekdayShort: 'Dom',
    timeLabel: '13:30',
    description: 'Almuerzo y frutas de plaza',
    category: 'Alimentación',
    amount: 68_000,
    notes: 'Primer mercado del mes en plaza local.',
  },
];
