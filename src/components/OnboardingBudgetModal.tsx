import { AlertCircle, Wallet } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { formatCOP } from '../data/budgetData';

interface OnboardingBudgetModalProps {
  userName: string;
  isSaving: boolean;
  onSaveInitialBudget: (amount: number) => void;
}

const PRESET_BUDGETS = [1_500_000, 2_500_000, 3_200_000, 5_000_000];

export function OnboardingBudgetModal({
  userName,
  isSaving,
  onSaveInitialBudget,
}: OnboardingBudgetModalProps) {
  const [amountInput, setAmountInput] = useState('3200000');
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amountInput.replace(/\D/g, ''));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setError('Ingresa un presupuesto mensual válido mayor que $0 COP.');
      return;
    }
    setError(null);
    onSaveInitialBudget(numericAmount);
  };

  return (
    <div
      className="py-6 sm:py-10 flex justify-center"
      role="region"
      aria-labelledby="onboarding-budget-title"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 sm:p-8 shadow-sm space-y-6 transition-colors"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#146C43] dark:text-emerald-400 flex items-center justify-center mb-1"
            aria-hidden="true"
          >
            <Wallet className="w-6 h-6" strokeWidth={1.9} />
          </div>
          <h1
            id="onboarding-budget-title"
            className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            ¡Hola, {userName}! ¿Cuál es tu presupuesto mensual?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            Tu cuenta empieza desde cero. Define tu presupuesto inicial en pesos colombianos (COP); luego podrás editarlo cuando lo necesites.
          </p>
        </div>

        <div>
          <label
            htmlFor="initial-budget-input"
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2"
          >
            Presupuesto mensual inicial (COP)
          </label>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-display)] text-xl font-bold text-slate-400 dark:text-slate-500 pointer-events-none"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="initial-budget-input"
              type="text"
              inputMode="numeric"
              autoFocus
              value={
                numericAmount > 0
                  ? new Intl.NumberFormat('es-CO').format(numericAmount)
                  : ''
              }
              onChange={(e) => {
                setAmountInput(e.target.value.replace(/\D/g, ''));
                if (error) setError(null);
              }}
              placeholder="3.200.000"
              aria-invalid={Boolean(error)}
              className={`w-full rounded-2xl border bg-white dark:bg-slate-950 pl-9 pr-16 py-3.5 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                error
                  ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
              COP
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Sugeridos:</span>
            {PRESET_BUDGETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmountInput(String(preset));
                  setError(null);
                }}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-[#146C43] dark:hover:text-emerald-300 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums transition-colors cursor-pointer"
              >
                {formatCOP(preset)}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full h-11 rounded-full bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {isSaving ? 'Guardando presupuesto...' : 'Guardar presupuesto y comenzar'}
        </button>
      </form>
    </div>
  );
}
