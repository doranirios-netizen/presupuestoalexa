import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { BUDGET_META, ExpenseMovement, formatCOP } from '../data/budgetData';
import { getMovementVisual } from '../utils/categoryVisuals';

interface RecentMovementsProps {
  movements: ExpenseMovement[];
  searchQuery: string;
  onClearSearch: () => void;
  onSelectMovement: (movementId: string) => void;
  onEditMovement: (movement: ExpenseMovement) => void;
  onDeleteMovement: (movement: ExpenseMovement) => void;
  onViewAllMovements: () => void;
}

export function RecentMovements({
  movements,
  searchQuery,
  onClearSearch,
  onSelectMovement,
  onEditMovement,
  onDeleteMovement,
  onViewAllMovements,
}: RecentMovementsProps) {
  const latestFive = movements.slice(0, 5);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleMovements = normalizedQuery
    ? latestFive.filter(
        (m) =>
          m.description.toLowerCase().includes(normalizedQuery) ||
          m.category.toLowerCase().includes(normalizedQuery) ||
          m.dateLabel.toLowerCase().includes(normalizedQuery) ||
          (m.type === 'income' ? 'ingreso' : 'gasto').includes(normalizedQuery)
      )
    : latestFive;

  return (
    <section
      aria-labelledby="ultimos-movimientos-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-6 flex flex-col justify-between h-full transition-colors"
    >
      <div>
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h2
              id="ultimos-movimientos-heading"
              className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Últimos movimientos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              5 movimientos más recientes
            </p>
          </div>
          {normalizedQuery ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="text-xs font-medium text-[#146C43] dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Limpiar filtro
            </button>
          ) : (
            <button
              type="button"
              onClick={onViewAllMovements}
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Ver todos ({movements.length})
            </button>
          )}
        </div>

        {visibleMovements.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleMovements.map((movement) => {
              const isIncome = movement.type === 'income';
              const { Icon, iconBg } = getMovementVisual(
                movement.type,
                movement.category
              );
              const dateText =
                movement.dateISO === BUDGET_META.todayISO
                  ? 'Hoy'
                  : movement.dateLabel;

              return (
                <li
                  key={movement.id}
                  className="py-1.5 flex items-center justify-between gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectMovement(movement.id)}
                    className="flex-1 min-w-0 py-1.5 px-1.5 -ml-1.5 rounded-xl flex items-center justify-between gap-2 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                        aria-hidden="true"
                      >
                        {isIncome ? (
                          <span className="text-base leading-none" role="img" aria-label="Ingreso">
                            💰
                          </span>
                        ) : (
                          <Icon className="w-[17px] h-[17px]" strokeWidth={2} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-[#146C43] dark:group-hover:text-emerald-400 transition-colors">
                          {movement.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span className="tabular-nums">{dateText}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className={isIncome ? 'font-medium text-emerald-700 dark:text-emerald-400' : ''}>
                            {isIncome ? 'Ingreso' : movement.category}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <p
                        className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                          isIncome
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isIncome ? `+${formatCOP(movement.amount)}` : formatCOP(movement.amount)}
                      </p>
                      <ChevronRight
                        className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isIncome && (
                      <button
                        type="button"
                        onClick={() => onEditMovement(movement)}
                        title={`Editar ${movement.description}`}
                        aria-label={`Editar ${movement.description}`}
                        className="w-7 h-7 rounded-full text-slate-400 dark:text-slate-500 hover:text-[#146C43] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMovement(movement)}
                      title={`Eliminar ${movement.description}`}
                      aria-label={`Eliminar ${movement.description}`}
                      className="w-7 h-7 rounded-full text-slate-400 dark:text-slate-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No hay movimientos recientes que coincidan con “{searchQuery}”.
            </p>
            <button
              type="button"
              onClick={onClearSearch}
              className="mt-3 px-4 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Mostrar los 5 movimientos
            </button>
          </div>
        )}
      </div>

      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Movimientos recientes mostrados</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {visibleMovements.length} de {movements.length}
        </span>
      </div>
    </section>
  );
}
