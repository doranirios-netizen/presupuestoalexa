import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react';
import { ExpenseMovement, formatCOP, formatPercent } from '../data/budgetData';
import { getMovementVisual } from '../utils/categoryVisuals';

interface MovementDetailViewProps {
  movement: ExpenseMovement | null;
  monthlyBudget: number;
  categoryTotal: number;
  onBack: () => void;
  onEdit: (movement: ExpenseMovement) => void;
  onDelete: (movement: ExpenseMovement) => void;
}

export function MovementDetailView({
  movement,
  monthlyBudget,
  categoryTotal,
  onBack,
  onEdit,
  onDelete,
}: MovementDetailViewProps) {
  if (!movement) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] px-6 py-16 text-center transition-colors">
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Selecciona un gasto en Movimientos para ver el detalle
          </p>
        </div>
      </div>
    );
  }

  const isIncome = movement.type === 'income';
  const { Icon, iconBg } = getMovementVisual(movement.type, movement.category);
  const budgetShare = monthlyBudget > 0 ? (movement.amount / monthlyBudget) * 100 : 0;
  const categoryShare = categoryTotal > 0 ? (movement.amount / categoryTotal) * 100 : 0;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volver</span>
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {isIncome ? 'Detalle del ingreso' : 'Detalle del gasto'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Información completa del movimiento registrado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Volver
          </button>
          {!isIncome && (
            <button
              type="button"
              onClick={() => onEdit(movement)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#146C43] hover:bg-[#0F5132] text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Editar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(movement)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/70 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* Main Detail Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] overflow-hidden transition-colors">
        {/* Hero Amount Header */}
        <div
          className={`p-6 sm:p-8 text-white ${
            isIncome
              ? 'bg-gradient-to-br from-[#3D25B5] via-[#5B3DF5] to-[#7459FF]'
              : 'bg-gradient-to-br from-[#0D4A2D] via-[#146C43] to-[#1F9159]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              {isIncome ? (
                <span className="text-xl leading-none" role="img" aria-label="Ingreso">
                  💰
                </span>
              ) : (
                <Icon className="w-5 h-5" strokeWidth={2} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/85">
                {isIncome ? `Ingreso · ${movement.category}` : movement.category}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold text-white truncate">
                {movement.description}
              </h2>
            </div>
          </div>

          <p className="mt-6 font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
            {isIncome ? `+${formatCOP(movement.amount)}` : formatCOP(movement.amount)}
          </p>
          <p className="mt-1.5 text-xs text-white/85 tabular-nums">
            {isIncome
              ? `Incrementó tu presupuesto disponible a ${formatCOP(monthlyBudget)}`
              : `Representa el ${formatPercent(budgetShare)} de tu presupuesto disponible (${formatCOP(
                  monthlyBudget
                )})`}
          </p>
        </div>

        {/* All Data Fields */}
        <dl className="divide-y divide-slate-100 dark:divide-slate-800 px-6 sm:px-8">
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Tag className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Categoría</span>
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <span
                className={`w-6 h-6 rounded-lg inline-flex items-center justify-center ${iconBg}`}
                aria-hidden="true"
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <span>{movement.category}</span>
            </dd>
          </div>

          {movement.paymentMethod && (
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span>Medio de pago</span>
              </dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {movement.paymentMethod}
              </dd>
            </div>
          )}

          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>{isIncome ? 'Fecha del ingreso' : 'Fecha del gasto'}</span>
            </dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
              {movement.fullDateLabel}
            </dd>
          </div>

          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Hora registrada</span>
            </dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
              {movement.timeLabel}
            </dd>
          </div>

          <div className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Observaciones</span>
            </dt>
            <dd className="text-sm text-slate-700 dark:text-slate-300 sm:text-right max-w-md leading-relaxed">
              {movement.notes}
            </dd>
          </div>

          {!isIncome && (
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Peso en {movement.category.toLowerCase()}
              </dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                {formatPercent(categoryShare)} de {formatCOP(categoryTotal)}
              </dd>
            </div>
          )}

          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Referencia</dt>
            <dd className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {movement.id.toUpperCase()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
