import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { formatCOP, formatPercent, ScreenView } from '../data/budgetData';

interface MonthlySummaryProps {
  monthLabel: string;
  currentDay: number;
  totalDaysInMonth: number;
  baseMonthlyBudget: number;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  averageDaily: number;
  onUpdateBaseBudget: (nextBudget: number) => void;
  onNavigateScreen: (screen: ScreenView) => void;
}

export function MonthlySummary({
  monthLabel,
  currentDay,
  totalDaysInMonth,
  baseMonthlyBudget,
  totalIncome,
  effectiveBudget,
  totalSpent,
  availableBalance,
  averageDaily,
  onUpdateBaseBudget,
  onNavigateScreen,
}: MonthlySummaryProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(baseMonthlyBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditingBudget) {
      setBudgetInput(String(baseMonthlyBudget));
    }
  }, [baseMonthlyBudget, isEditingBudget]);

  const spentPercent = effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0;
  const isNegativeBalance = availableBalance < 0;
  const availablePercent = Math.max(0, 100 - spentPercent);

  const numericDraft = Number(budgetInput.replace(/\D/g, ''));

  const handleOpenEdit = () => {
    setBudgetInput(String(baseMonthlyBudget));
    setBudgetError(null);
    setIsEditingBudget(true);
  };

  const handleCancelEdit = () => {
    setBudgetInput(String(baseMonthlyBudget));
    setBudgetError(null);
    setIsEditingBudget(false);
  };

  const handleSaveBudget = (e: FormEvent) => {
    e.preventDefault();
    if (!numericDraft || numericDraft < 1_000) {
      setBudgetError('Ingresa un presupuesto válido (mínimo $1.000 COP).');
      return;
    }
    onUpdateBaseBudget(numericDraft);
    setBudgetError(null);
    setIsEditingBudget(false);
  };

  return (
    <section aria-label="Resumen financiero del mes">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Saldo disponible & Estado de cuenta */}
        <div
          className={`rounded-[22px] p-5 sm:p-6 text-white flex flex-col justify-between min-h-[164px] transition-colors ${
            isNegativeBalance
              ? 'bg-gradient-to-br from-rose-900 via-rose-800 to-rose-700'
              : 'bg-gradient-to-br from-[#0D4A2D] via-[#146C43] to-[#1F9159]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-white/95">Disponible para gastar</h2>
            <button
              type="button"
              onClick={() => onNavigateScreen('movements')}
              aria-label="Ver movimientos del mes"
              className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shrink-0 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-[27px] font-bold tracking-tight text-white tabular-nums leading-tight">
            {formatCOP(availableBalance)}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                isNegativeBalance ? 'text-rose-100' : 'text-emerald-100'
              }`}
            >
              {isNegativeBalance ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}</span>
            </span>

            <span className="text-white/85 tabular-nums whitespace-nowrap">
              {isNegativeBalance
                ? 'Excedido'
                : `${formatPercent(availablePercent)} libre`}
            </span>
          </div>
        </div>

        {/* Card 2: Presupuesto disponible (Base + Ingresos, base editable inline) */}
        <div
          className={`rounded-[22px] p-5 sm:p-6 bg-white dark:bg-slate-900 border flex flex-col justify-between min-h-[164px] transition-colors ${
            isEditingBudget
              ? 'border-[#146C43] dark:border-emerald-500 ring-2 ring-[#146C43]/15 dark:ring-emerald-500/20'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {totalIncome > 0 ? 'Presupuesto total' : 'Presupuesto mensual'}
            </h2>
            {!isEditingBudget && (
              <button
                type="button"
                onClick={handleOpenEdit}
                aria-label="Editar presupuesto base mensual"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <Pencil className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {isEditingBudget ? (
            <form onSubmit={handleSaveBudget} className="mt-2.5 space-y-2.5">
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 pointer-events-none"
                  aria-hidden="true"
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  aria-label="Nuevo presupuesto base mensual en pesos colombianos"
                  value={
                    numericDraft > 0
                      ? new Intl.NumberFormat('es-CO').format(numericDraft)
                      : ''
                  }
                  onChange={(e) => {
                    setBudgetInput(e.target.value.replace(/\D/g, ''));
                    if (budgetError) setBudgetError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-7 pr-11 py-1.5 font-[family-name:var(--font-display)] text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-[#146C43] dark:focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
                  COP
                </span>
              </div>

              {budgetError && (
                <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                  {budgetError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Aplicar</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  aria-label="Cancelar edición de presupuesto"
                  className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenEdit}
                title="Haz clic para editar el presupuesto base mensual"
                className="mt-3 text-left font-[family-name:var(--font-display)] text-2xl sm:text-[27px] font-bold tracking-tight text-slate-900 dark:text-slate-100 hover:text-[#146C43] dark:hover:text-emerald-400 transition-colors tabular-nums leading-tight cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded-lg"
              >
                {formatCOP(effectiveBudget)}
              </button>

              <p className="mt-3 text-xs text-[#146C43] dark:text-emerald-400 font-medium tabular-nums truncate">
                {totalIncome > 0
                  ? `Base ${formatCOP(baseMonthlyBudget)} + Ingresos ${formatCOP(totalIncome)}`
                  : `Asignado para ${monthLabel.toLowerCase()}`}
              </p>
            </>
          )}
        </div>

        {/* Card 3: Total gastado & % gastado */}
        <div className="rounded-[22px] p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between min-h-[164px] transition-colors">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Total gastado
            </h2>
            <button
              type="button"
              onClick={() => onNavigateScreen('movements')}
              aria-label="Ir a la lista cronológica de movimientos"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.9} />
            </button>
          </div>

          <p className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-[27px] font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
            {formatCOP(totalSpent)}
          </p>

          <p
            className={`mt-3 text-xs font-medium tabular-nums ${
              isNegativeBalance
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-[#146C43] dark:text-emerald-400'
            }`}
          >
            {formatPercent(spentPercent)} gastado del presupuesto
          </p>
        </div>

        {/* Card 4: Estado de cuenta */}
        <div
          className={`rounded-[22px] p-5 sm:p-6 border flex flex-col justify-between min-h-[164px] transition-colors ${
            isNegativeBalance
              ? 'bg-rose-50/70 dark:bg-rose-950/35 border-rose-200 dark:border-rose-900/70'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Estado de cuenta
            </h2>
            <button
              type="button"
              onClick={() => onNavigateScreen('register')}
              aria-label="Registrar nuevo gasto"
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.9} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {isNegativeBalance ? (
              <AlertTriangle
                className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0"
                strokeWidth={2.1}
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="w-6 h-6 text-[#146C43] dark:text-emerald-400 shrink-0"
                strokeWidth={2.1}
                aria-hidden="true"
              />
            )}
            <p
              className={`font-[family-name:var(--font-display)] text-xl sm:text-[23px] font-bold tracking-tight leading-tight ${
                isNegativeBalance
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-[#146C43] dark:text-emerald-400'
              }`}
            >
              {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Promedio diario: {formatCOP(averageDaily)} · Día {currentDay}/{totalDaysInMonth}
          </p>
        </div>
      </div>
    </section>
  );
}
