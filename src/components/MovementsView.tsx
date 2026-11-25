import { ArrowLeft, ChevronRight, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  BUDGET_META,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExpenseMovement,
  formatCOP,
  MovementType,
} from '../data/budgetData';
import { getMovementVisual } from '../utils/categoryVisuals';

interface MovementsViewProps {
  movements: ExpenseMovement[];
  hasExpenses: boolean;
  monthLabel: string;
  searchQuery: string;
  onClearSearch: () => void;
  onSelectMovement: (movementId: string) => void;
  onEditMovement: (movement: ExpenseMovement) => void;
  onDeleteMovement: (movement: ExpenseMovement) => void;
  onOpenRegister: () => void;
  onOpenRegisterIncome: () => void;
  onBackToDashboard: () => void;
}

export function MovementsView({
  movements,
  hasExpenses,
  monthLabel,
  searchQuery,
  onClearSearch,
  onSelectMovement,
  onEditMovement,
  onDeleteMovement,
  onOpenRegister,
  onOpenRegisterIncome,
  onBackToDashboard,
}: MovementsViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | ExpenseCategory>('Todas');

  const filteredMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return movements.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesCategory =
        selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchesQuery =
        query.length === 0 ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.dateLabel.toLowerCase().includes(query) ||
        (item.type === 'income' ? 'ingreso' : 'gasto').includes(query);
      return matchesType && matchesCategory && matchesQuery;
    });
  }, [movements, typeFilter, selectedCategory, searchQuery]);

  const { filteredExpensesTotal, filteredIncomesTotal } = useMemo(() => {
    return filteredMovements.reduce(
      (acc, item) => {
        if (item.type === 'income') {
          acc.filteredIncomesTotal += item.amount;
        } else {
          acc.filteredExpensesTotal += item.amount;
        }
        return acc;
      },
      { filteredExpensesTotal: 0, filteredIncomesTotal: 0 }
    );
  }, [filteredMovements]);

  if (!hasExpenses && movements.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volver al Dashboard</span>
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Movimientos de {monthLabel.toLowerCase()}
          </h1>
        </div>

        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] px-6 py-14 sm:py-16 text-center flex flex-col items-center transition-colors">
          <div
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4"
            aria-hidden="true"
          >
            <ReceiptText className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tus gastos van a vivir aquí
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
            cada vez que pagues algo, lo registras y aparece en esta lista
          </p>
          <button
            type="button"
            onClick={onOpenRegister}
            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            <span>Registrar gasto</span>
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volver al Dashboard</span>
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Movimientos de {monthLabel.toLowerCase()}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Historial cronológico de gastos e ingresos del mes. Toca cualquier fila para ver el detalle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenRegisterIncome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            <span>Registrar ingreso</span>
          </button>
          <button
            type="button"
            onClick={onOpenRegister}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            <span>Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Filter Bar + List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-4 sm:p-5 space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Tabs */}
          <div
            role="tablist"
            aria-label="Filtrar por tipo de movimiento"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'expense', label: 'Gastos' },
                { id: 'income', label: 'Ingresos' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={typeFilter === tab.id}
                onClick={() => {
                  setTypeFilter(tab.id);
                  if (tab.id === 'income') {
                    setSelectedCategory('Todas');
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  typeFilter === tab.id
                    ? 'bg-[#146C43] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
            {filteredMovements.length} movimientos
            {filteredIncomesTotal > 0 && (
              <>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  +{formatCOP(filteredIncomesTotal)}
                </span>
              </>
            )}
            {filteredExpensesTotal > 0 && (
              <>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  -{formatCOP(filteredExpensesTotal)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Expense Category Chips */}
        {typeFilter !== 'income' && (
          <div
            role="tablist"
            aria-label="Filtrar gastos por categoría"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'Todas'}
              onClick={() => setSelectedCategory('Todas')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === 'Todas'
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              Todas las categorías
            </button>
            {EXPENSE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === category
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Chronological List */}
        {filteredMovements.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
            {filteredMovements.map((movement) => {
              const isIncome = movement.type === 'income';
              const { Icon, iconBg } = getMovementVisual(
                movement.type,
                movement.category
              );
              const dateText =
                movement.dateISO === BUDGET_META.todayISO
                  ? 'Hoy'
                  : `${movement.weekdayShort} ${movement.dateLabel}`;

              return (
                <li
                  key={movement.id}
                  className="py-2 flex items-center justify-between gap-2 sm:gap-4"
                >
                  <button
                    type="button"
                    onClick={() => onSelectMovement(movement.id)}
                    className="flex-1 min-w-0 py-1.5 px-2 -ml-2 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                        aria-hidden="true"
                      >
                        {isIncome ? (
                          <span className="text-lg leading-none" role="img" aria-label="Ingreso">
                            💰
                          </span>
                        ) : (
                          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-[#146C43] dark:group-hover:text-emerald-400 transition-colors">
                          {movement.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className={isIncome ? 'font-medium text-emerald-700 dark:text-emerald-400' : ''}>
                            {isIncome ? `Ingreso · ${movement.category}` : movement.category}
                          </span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="tabular-nums">{dateText}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="tabular-nums">{movement.timeLabel}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isIncome ? `+${formatCOP(movement.amount)}` : formatCOP(movement.amount)}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isIncome && (
                      <button
                        type="button"
                        onClick={() => onEditMovement(movement)}
                        title={`Editar ${movement.description}`}
                        aria-label={`Editar ${movement.description}`}
                        className="w-8 h-8 rounded-full text-slate-400 dark:text-slate-500 hover:text-[#146C43] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMovement(movement)}
                      title={`Eliminar ${movement.description}`}
                      aria-label={`Eliminar ${movement.description}`}
                      className="w-8 h-8 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-12 text-center border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No se encontraron movimientos con los filtros actuales.
            </p>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setSelectedCategory('Todas');
                onClearSearch();
              }}
              className="mt-3 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
