import { formatCOP } from '../data/budgetData';

interface FormulaCardProps {
  baseMonthlyBudget: number;
  totalIncome: number;
  totalSpent: number;
  availableBalance: number;
  remainingDays: number;
}

export function FormulaCard({
  baseMonthlyBudget,
  totalIncome,
  totalSpent,
  availableBalance,
  remainingDays,
}: FormulaCardProps) {
  const isNegativeBalance = availableBalance < 0;
  const dailyAllowance = remainingDays > 0 ? Math.max(0, availableBalance / remainingDays) : 0;

  return (
    <section
      aria-labelledby="balance-formula-heading"
      className={`relative overflow-hidden rounded-[22px] p-5 sm:p-6 text-white flex flex-col justify-between h-full transition-colors dark:ring-1 dark:ring-white/10 ${
        isNegativeBalance ? 'bg-[#5B111C]' : 'bg-[#09321F]'
      }`}
    >
      {/* Subtle Organic Wave Pattern */}
      <svg
        viewBox="0 0 320 260"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={isNegativeBalance ? '#BE123C' : '#197A4B'}
              stopOpacity="0.45"
            />
            <stop
              offset="100%"
              stopColor={isNegativeBalance ? '#4C0519' : '#082A1A'}
              stopOpacity="0.1"
            />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={isNegativeBalance ? '#E11D48' : '#26A667'}
              stopOpacity="0.32"
            />
            <stop
              offset="100%"
              stopColor={isNegativeBalance ? '#881337' : '#0C3F28'}
              stopOpacity="0.05"
            />
          </linearGradient>
        </defs>
        <path
          d="M0 155 C 75 110, 150 205, 240 135 C 280 105, 305 120, 320 110 L 320 260 L 0 260 Z"
          fill="url(#waveGrad1)"
        />
        <path
          d="M0 190 C 90 230, 180 130, 320 175 L 320 260 L 0 260 Z"
          fill="url(#waveGrad2)"
        />
        <circle
          cx="275"
          cy="48"
          r="70"
          fill={isNegativeBalance ? '#E11D48' : '#1F8A56'}
          fillOpacity="0.18"
        />
      </svg>

      <div className="relative z-10">
        <h2
          id="balance-formula-heading"
          className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold tracking-tight text-white"
        >
          Cálculo del saldo
        </h2>
        <p
          className={`mt-1 text-xs ${
            isNegativeBalance ? 'text-rose-200/95' : 'text-emerald-200/90'
          }`}
        >
          {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'} ·{' '}
          {totalIncome > 0 ? 'Presupuesto + Ingresos − Gastos' : 'Presupuesto − Gastos'}
        </p>
      </div>

      <div className="relative z-10 my-5">
        <p className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-bold tracking-tight text-white tabular-nums leading-tight">
          {formatCOP(availableBalance)}
        </p>
        <p
          className={`mt-1 text-xs tabular-nums ${
            isNegativeBalance ? 'text-rose-100/90' : 'text-emerald-100/80'
          }`}
        >
          {isNegativeBalance
            ? `Sobrepasaste el presupuesto por ${formatCOP(Math.abs(availableBalance))}`
            : `Cupo sugerido por día (${remainingDays} días): ${formatCOP(dailyAllowance)}`}
        </p>
      </div>

      <div className="relative z-10 pt-3.5 border-t border-white/15 space-y-1.5 text-xs">
        <div
          className={`flex items-center justify-between ${
            isNegativeBalance ? 'text-rose-100/90' : 'text-emerald-100/90'
          }`}
        >
          <span>Presupuesto base</span>
          <span className="font-semibold text-white tabular-nums">
            {formatCOP(baseMonthlyBudget)}
          </span>
        </div>
        {totalIncome > 0 && (
          <div
            className={`flex items-center justify-between ${
              isNegativeBalance ? 'text-rose-100/90' : 'text-emerald-100/90'
            }`}
          >
            <span>Ingresos del mes</span>
            <span className="font-semibold text-emerald-200 tabular-nums">
              + {formatCOP(totalIncome)}
            </span>
          </div>
        )}
        <div
          className={`flex items-center justify-between ${
            isNegativeBalance ? 'text-rose-100/90' : 'text-emerald-100/90'
          }`}
        >
          <span>Gastos registrados</span>
          <span className="font-semibold text-white tabular-nums">− {formatCOP(totalSpent)}</span>
        </div>
      </div>
    </section>
  );
}
