import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  BUDGET_META,
  ExpenseMovement,
  formatCOP,
  INCOME_CATEGORIES,
  IncomeCategory,
  parseSpanishDate,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../data/budgetData';

interface RegisterIncomeViewProps {
  availableBalance: number;
  onSaveIncome: (income: ExpenseMovement) => void;
  onCancel: () => void;
}

export function RegisterIncomeView({
  availableBalance,
  onSaveIncome,
  onCancel,
}: RegisterIncomeViewProps) {
  const [amountRaw, setAmountRaw] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncomeCategory | ''>('');
  const [dateISO, setDateISO] = useState(BUDGET_META.todayISO);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    category?: string;
    dateISO?: string;
    paymentMethod?: string;
  }>({});

  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const numericAmount = Number(amountRaw.replace(/\D/g, ''));
  const projectedBalance =
    numericAmount > 0 ? availableBalance + numericAmount : availableBalance;

  const handleAmountChange = (value: string) => {
    // Reject negative signs explicitly or non-digits while keeping automatic COP formatting
    if (value.includes('-')) {
      setErrors((prev) => ({
        ...prev,
        amount: 'No se permiten valores negativos. Ingresa un monto mayor a $0 COP.',
      }));
      return;
    }
    const digits = value.replace(/\D/g, '');
    setAmountRaw(digits);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSavedSuccess) return;

    const nextErrors: typeof errors = {};
    if (!numericAmount || numericAmount <= 0) {
      nextErrors.amount = 'Ingresa un valor mayor a $0 COP para registrar el ingreso.';
    }
    if (description.trim().length < 2) {
      nextErrors.description = 'Escribe una descripción breve del ingreso (ej. Salario, Freelance).';
    }
    if (!category) {
      nextErrors.category = 'Selecciona una categoría de ingreso.';
    }
    if (!dateISO) {
      nextErrors.dateISO = 'Selecciona la fecha en que recibiste el ingreso.';
    }
    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Selecciona el medio de pago donde recibiste el dinero.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const parsedDate = parseSpanishDate(dateISO);
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newIncome: ExpenseMovement = {
      id: `inc-${Date.now()}`,
      type: 'income',
      day: parsedDate.day,
      dateISO,
      dateLabel: parsedDate.dateLabel,
      fullDateLabel: parsedDate.fullDateLabel,
      weekdayShort: parsedDate.weekdayShort,
      timeLabel,
      description: description.trim(),
      category: category as IncomeCategory,
      paymentMethod: paymentMethod as PaymentMethod,
      amount: numericAmount,
      notes:
        notes.trim().length > 0
          ? notes.trim()
          : `Ingreso registrado en ${category} mediante ${paymentMethod}.`,
    };

    setIsSavedSuccess(true);
    redirectTimerRef.current = window.setTimeout(() => {
      onSaveIncome(newIncome);
    }, 950);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Volver al Dashboard</span>
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          Registrar Nuevo Ingreso
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Registra cualquier ingreso recibido durante el mes para aumentar tu presupuesto disponible.
        </p>
      </div>

      {/* Animated Save Confirmation State */}
      <AnimatePresence mode="wait">
        {isSavedSuccess ? (
          <motion.div
            key="save-success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded-[22px] p-8 sm:p-10 text-center shadow-sm space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900 dark:text-slate-100">
              ✅ Ingreso registrado correctamente.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              +{formatCOP(numericAmount)} sumado a tu presupuesto disponible. Volviendo al Dashboard…
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="income-form"
            onSubmit={handleSubmit}
            noValidate
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-7 shadow-xs space-y-5"
          >
            {/* 1. Valor del ingreso */}
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <label
                  htmlFor="income-amount"
                  className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  Valor del ingreso <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Nuevo saldo disponible:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">{formatCOP(projectedBalance)}</strong>
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
                  id="income-amount"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={
                    numericAmount > 0
                      ? new Intl.NumberFormat('es-CO').format(numericAmount)
                      : ''
                  }
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="850.000"
                  aria-invalid={Boolean(errors.amount)}
                  className={`w-full rounded-2xl border bg-white dark:bg-slate-950 pl-9 pr-16 py-3.5 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-colors ${
                    errors.amount
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
                  COP
                </span>
              </div>

              {errors.amount && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.amount}</span>
                </p>
              )}
            </div>

            {/* 2. Descripción */}
            <div>
              <label
                htmlFor="income-description"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Descripción <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="income-description"
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder="Ej. Salario, Freelance, Venta de computador, Bonificación, Reembolso"
                aria-invalid={Boolean(errors.description)}
                className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors ${
                  errors.description
                    ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20'
                }`}
              />
              {errors.description && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>

            {/* 3. Categoría, Fecha y Medio de pago */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="income-category"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                >
                  Categoría <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="income-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as IncomeCategory);
                    if (errors.category) {
                      setErrors((prev) => ({ ...prev, category: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.category)}
                  className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors cursor-pointer ${
                    errors.category
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20'
                  }`}
                >
                  <option value="">Selecciona una opción</option>
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.category}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="income-date"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                >
                  Fecha del ingreso <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  id="income-date"
                  type="date"
                  value={dateISO}
                  onChange={(e) => {
                    setDateISO(e.target.value);
                    if (errors.dateISO) {
                      setErrors((prev) => ({ ...prev, dateISO: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.dateISO)}
                  className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 transition-colors ${
                    errors.dateISO
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20'
                  }`}
                />
                {errors.dateISO && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.dateISO}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="income-payment-method"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                >
                  Medio de pago <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  id="income-payment-method"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value as PaymentMethod);
                    if (errors.paymentMethod) {
                      setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.paymentMethod)}
                  className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors cursor-pointer ${
                    errors.paymentMethod
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20'
                  }`}
                >
                  <option value="">Selecciona una opción</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{errors.paymentMethod}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 4. Observaciones */}
            <div>
              <label
                htmlFor="income-notes"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
              >
                Observaciones <span className="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
              </label>
              <textarea
                id="income-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega detalles adicionales sobre este ingreso..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5B3DF5] dark:focus:border-[#7C63FA] focus:ring-2 focus:ring-[#5B3DF5]/20 dark:focus:ring-[#7C63FA]/20 resize-y transition-colors"
              />
            </div>

            {/* Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-white text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
              >
                Guardar ingreso
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
