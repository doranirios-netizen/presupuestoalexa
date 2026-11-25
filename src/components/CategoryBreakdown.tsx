import {
  ExpenseCategory,
  ExpenseMovement,
  formatCOP,
  formatPercent,
} from '../data/budgetData';
import { CATEGORY_VISUALS } from '../utils/categoryVisuals';

interface CategoryBreakdownProps {
  movements: ExpenseMovement[];
  totalSpent: number;
  searchQuery: string;
}

export function CategoryBreakdown({
  movements,
  totalSpent,
  searchQuery,
}: CategoryBreakdownProps) {
  const totalsByCategory = movements
    .filter((item) => item.type === 'expense')
    .reduce<Record<ExpenseCategory, number>>(
      (acc, item) => {
        const cat = item.category as ExpenseCategory;
        acc[cat] = (acc[cat] || 0) + item.amount;
        return acc;
      },
      {
        Alimentación: 0,
        'Servicios públicos': 0,
        'Ropa y compras personales': 0,
        'Entretenimiento y ocio': 0,
        Transporte: 0,
      }
    );

  const sortedCategories = (Object.keys(totalsByCategory) as ExpenseCategory[])
    .map((category) => ({
      category,
      amount: totalsByCategory[category],
      share: totalSpent > 0 ? (totalsByCategory[category] / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <section
      aria-labelledby="gasto-categoria-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-6 flex flex-col justify-between h-full transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <div>
          <h2
            id="gasto-categoria-heading"
            className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Gasto por categoría
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Distribución del gasto registrado en el mes
          </p>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
          5 categorías
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {sortedCategories.map(({ category, amount, share }) => {
          const { Icon, iconBg, barColor } = CATEGORY_VISUALS[category];
          const isHighlighted =
            normalizedQuery.length > 0 && category.toLowerCase().includes(normalizedQuery);
          const isDimmed =
            normalizedQuery.length > 0 && !category.toLowerCase().includes(normalizedQuery);

          return (
            <li
              key={category}
              className={`py-2.5 flex items-center justify-between gap-3 transition-opacity ${
                isDimmed ? 'opacity-45' : 'opacity-100'
              } ${
                isHighlighted
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/35 -mx-2 px-2 rounded-xl'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {category}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {formatPercent(share)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap shrink-0">
                {formatCOP(amount)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
