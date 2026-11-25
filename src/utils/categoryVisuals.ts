import {
  Banknote,
  Bus,
  Clapperboard,
  Lightbulb,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import {
  ExpenseCategory,
  IncomeCategory,
  MovementType,
} from '../data/budgetData';

export const CATEGORY_VISUALS: Record<
  ExpenseCategory,
  { Icon: typeof Utensils; iconBg: string; barColor: string }
> = {
  Alimentación: {
    Icon: Utensils,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-[#146C43] dark:text-emerald-400',
    barColor: 'bg-[#146C43] dark:bg-emerald-500',
  },
  Transporte: {
    Icon: Bus,
    iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400',
    barColor: 'bg-slate-500 dark:bg-sky-500',
  },
  'Servicios públicos': {
    Icon: Lightbulb,
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
    barColor: 'bg-[#1E945B] dark:bg-amber-400',
  },
  'Ropa y compras personales': {
    Icon: ShoppingBag,
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    barColor: 'bg-slate-700 dark:bg-slate-400',
  },
  'Entretenimiento y ocio': {
    Icon: Clapperboard,
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400',
    barColor: 'bg-emerald-500 dark:bg-rose-400',
  },
};

export function getMovementVisual(
  type: MovementType,
  category: ExpenseCategory | IncomeCategory
) {
  if (type === 'income') {
    return {
      Icon: Banknote,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400',
    };
  }
  const expenseMeta = CATEGORY_VISUALS[category as ExpenseCategory];
  return (
    expenseMeta ?? {
      Icon: ShoppingBag,
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    }
  );
}
