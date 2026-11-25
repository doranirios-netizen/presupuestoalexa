import { formatCOP, formatPercent } from '../data/budgetData';

interface BudgetProgressGaugeProps {
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
}

export function BudgetProgressGauge({
  monthlyBudget,
  totalSpent,
  availableBalance,
}: BudgetProgressGaugeProps) {
  const actualSpentPercent = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;
  const clampedSpentPercent = Math.min(100, Math.max(0, actualSpentPercent));
  const availablePercent = Math.max(0, 100 - actualSpentPercent);
  const isNegativeBalance = availableBalance < 0;

  // Semicircular arc geometry (radius = 94, center = (135, 128))
  const cx = 135;
  const cy = 128;
  const r = 94;
  const circumferenceHalf = Math.PI * r;
  const spentArcLength = (clampedSpentPercent / 100) * circumferenceHalf;

  return (
    <section
      aria-labelledby="progreso-presupuesto-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-6 flex flex-col justify-between h-full transition-colors"
    >
      <div>
        <h2
          id="progreso-presupuesto-heading"
          className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        >
          Progreso del presupuesto
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Porcentaje gastado vs. porcentaje disponible
        </p>
      </div>

      {/* Semicircular Arc Gauge */}
      <div className="my-4 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[270px]">
          <svg
            viewBox="0 0 270 150"
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label={`Presupuesto gastado: ${formatPercent(actualSpentPercent)}. ${
              isNegativeBalance ? 'Balance negativo' : 'Balance positivo'
            }.`}
          >
            <defs>
              <pattern
                id="gaugeDiagonalHatch"
                width="7"
                height="7"
                patternTransform="rotate(42 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <rect width="7" height="7" className="fill-slate-100 dark:fill-slate-800" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="7"
                  className="stroke-slate-300 dark:stroke-slate-600"
                  strokeWidth="2.5"
                />
              </pattern>
              <linearGradient id="spentArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E945B" />
                <stop offset="100%" stopColor="#0E4D2F" />
              </linearGradient>
              <linearGradient id="overBudgetArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E11D48" />
                <stop offset="100%" stopColor="#9F1239" />
              </linearGradient>
            </defs>

            {/* Full Semicircle Track */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="url(#gaugeDiagonalHatch)"
              strokeWidth="26"
              strokeLinecap="round"
            />

            {/* Spent Arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke={
                isNegativeBalance
                  ? 'url(#overBudgetArcGradient)'
                  : 'url(#spentArcGradient)'
              }
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray={`${spentArcLength} ${circumferenceHalf}`}
            />
          </svg>

          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center text-center">
            <span
              className={`font-[family-name:var(--font-display)] text-3xl sm:text-[34px] font-bold tracking-tight tabular-nums leading-none ${
                isNegativeBalance
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatPercent(actualSpentPercent)}
            </span>
            <span
              className={`mt-1.5 text-xs font-medium ${
                isNegativeBalance
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-[#146C43] dark:text-emerald-400'
              }`}
            >
              {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Explicit Legend with Percentages & Values */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${
              isNegativeBalance ? 'bg-rose-600' : 'bg-[#146C43]'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
              Gastado ({formatPercent(actualSpentPercent)})
            </p>
            <p className="text-slate-500 dark:text-slate-400 tabular-nums truncate">
              {formatCOP(totalSpent)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p
              className={`font-medium tabular-nums ${
                isNegativeBalance
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {isNegativeBalance
                ? `Excedido (${formatPercent(actualSpentPercent - 100)})`
                : `Disponible (${formatPercent(availablePercent)})`}
            </p>
            <p className="text-slate-500 dark:text-slate-400 tabular-nums truncate">
              {formatCOP(availableBalance)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
