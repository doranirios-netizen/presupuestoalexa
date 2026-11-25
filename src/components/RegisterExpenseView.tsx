import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  BUDGET_META,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExpenseMovement,
  formatCOP,
  parseSpanishDate,
} from '../data/budgetData';
import { CATEGORY_VISUALS } from '../utils/categoryVisuals';

interface RegisterExpenseViewProps {
  availableBalance: number;
  initialMovement?: ExpenseMovement | null;
  backLabel?: string;
  onSaveExpense: (movement: ExpenseMovement) => void;
  onCancel: () => void;
}

const QUICK_AMOUNTS = [15_000, 25_000, 50_000, 100_000];

export function RegisterExpenseView({
  availableBalance,
  initialMovement = null,
  backLabel = 'Volver al Dashboard',
  onSaveExpense,
  onCancel,
}: RegisterExpenseViewProps) {
  const isEditing = Boolean(initialMovement);

  const [amountInput, setAmountInput] = useState(() =>
    initialMovement ? String(initialMovement.amount) : ''
  );
  const [description, setDescription] = useState(
    () => initialMovement?.description ?? ''
  );
  const [category, setCategory] = useState<ExpenseCategory | null>(() =>
    initialMovement && initialMovement.type === 'expense'
      ? (initialMovement.category as ExpenseCategory)
      : null
  );
  const [dateISO, setDateISO] = useState(
    () => initialMovement?.dateISO ?? BUDGET_META.todayISO
  );
  const [timeLabel, setTimeLabel] = useState(() => {
    if (initialMovement?.timeLabel) return initialMovement.timeLabel;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState(() => initialMovement?.notes ?? '');
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    category?: string;
    dateISO?: string;
    timeLabel?: string;
  }>({});

  // Parse digits cleanly for COP
  const numericAmount = Number(amountInput.replace(/\D/g, ''));
  const baseBalanceBeforeThisExpense = isEditing
    ? availableBalance + (initialMovement?.amount ?? 0)
    : availableBalance;
  const projectedBalance =
    numericAmount > 0
      ? baseBalanceBeforeThisExpense - numericAmount
      : baseBalanceBeforeThisExpense;

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    setAmountInput(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!amountInput.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Ingresa un valor numérico válido mayor que cero ($0 COP).';
    }
    if (description.trim().length === 0) {
      nextErrors.description = 'Ingresa el nombre o descripción del gasto.';
    } else if (description.trim().length < 2) {
      nextErrors.description = 'La descripción debe tener al menos 2 caracteres.';
    }
    if (!category) {
      nextErrors.category = 'Selecciona una categoría.';
    }
    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      nextErrors.dateISO = 'Selecciona una fecha válida.';
    }
    if (!timeLabel || !/^\d{2}:\d{2}$/.test(timeLabel)) {
      nextErrors.timeLabel = 'Ingresa una hora válida (HH:MM).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const parsedDate = parseSpanishDate(dateISO);

    const savedMovement: ExpenseMovement = {
      id: initialMovement?.id ?? `mov-${Date.now()}`,
      type: 'expense',
      day: parsedDate.day,
      dateISO,
      dateLabel: parsedDate.dateLabel,
      fullDateLabel: parsedDate.fullDateLabel,
      weekdayShort: parsedDate.weekdayShort,
      timeLabel,
      description: description.trim(),
      category: category!,
      amount: numericAmount,
      notes:
        notes.trim().length > 0
          ? notes.trim()
          : `Gasto registrado en ${category} el ${parsedDate.dateLabel}.`,
    };

    onSaveExpense(savedMovement);
  };

  const hasValidationErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{backLabel}</span>
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          {isEditing ? 'Editar gasto' : 'Registrar nuevo gasto'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isEditing
            ? 'Modifica los datos del gasto seleccionado y guarda los cambios para recalcular tu saldo.'
            : 'Completa los datos básicos para actualizar tu saldo disponible al instante.'}
        </p>
      </div>

      {/* Fast Registration / Edit Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-7 space-y-6"
      >
        {hasValidationErrors && (
          <div
            role="alert"
            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <span>
              Revisa los campos obligatorios marcados antes de guardar los cambios.
            </span>
          </div>
        )}

        {/* 1. Monto */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <label
              htmlFor="expense-amount"
              className="text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              ¿Cuánto pagaste? (COP)
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Saldo tras el gasto:{' '}
              <strong
                className={
                  projectedBalance < 0
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-[#146C43] dark:text-emerald-400'
                }
              >
                {formatCOP(projectedBalance)}
              </strong>
            </span>
          </div>

          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-display)] text-xl font-bold text-slate-400 dark:text-slate-500 pointer-events-none"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={
                numericAmount > 0
                  ? new Intl.NumberFormat('es-CO').format(numericAmount)
                  : ''
              }
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              className={`w-full rounded-2xl border bg-white dark:bg-slate-950 pl-9 pr-16 py-3.5 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 ${
                errors.amount
                  ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
              COP
            </span>
          </div>

          {/* 1-tap quick amount helpers */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Montos rápidos:</span>
            {QUICK_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmountInput(String(preset));
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-[#146C43] dark:hover:text-emerald-300 text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums transition-colors cursor-pointer"
              >
                {formatCOP(preset)}
              </button>
            ))}
          </div>

          {errors.amount && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.amount}</span>
            </p>
          )}
        </div>

        {/* 2. Categoría (1-tap grid) */}
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2.5">Categoría</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {EXPENSE_CATEGORIES.map((cat) => {
              const { Icon, iconBg } = CATEGORY_VISUALS[cat];
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                    isSelected
                      ? 'border-[#146C43] dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="text-xs sm:text-sm font-medium truncate">{cat}</span>
                  </span>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 text-[#146C43] dark:text-emerald-400 shrink-0"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.category}</span>
            </p>
          )}
        </div>

        {/* 3. Descripción, Fecha y Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <label
              htmlFor="expense-description"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              Concepto o descripción
            </label>
            <input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="Ej. Almuerzo, pasajes, mercado..."
              aria-invalid={Boolean(errors.description)}
              className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                errors.description
                  ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20'
              }`}
            />
            {errors.description && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="expense-date"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              Fecha
            </label>
            <input
              id="expense-date"
              type="date"
              value={dateISO}
              onChange={(e) => {
                setDateISO(e.target.value);
                if (errors.dateISO) {
                  setErrors((prev) => ({ ...prev, dateISO: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.dateISO)}
              className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 ${
                errors.dateISO
                  ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20'
              }`}
            />
            {errors.dateISO && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.dateISO}</span>
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="expense-time"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              Hora
            </label>
            <input
              id="expense-time"
              type="time"
              value={timeLabel}
              onChange={(e) => {
                setTimeLabel(e.target.value);
                if (errors.timeLabel) {
                  setErrors((prev) => ({ ...prev, timeLabel: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.timeLabel)}
              className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 ${
                errors.timeLabel
                  ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20'
              }`}
            />
            {errors.timeLabel && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.timeLabel}</span>
              </p>
            )}
          </div>
        </div>

        {/* 4. Nota opcional */}
        <div>
          <label
            htmlFor="expense-notes"
            className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
          >
            Nota adicional <span className="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
          </label>
          <input
            id="expense-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle breve para consultar luego en Movimientos"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#146C43] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#146C43]/20 dark:focus:ring-emerald-500/20"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-300/90 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {isEditing ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </div>
  );
}
