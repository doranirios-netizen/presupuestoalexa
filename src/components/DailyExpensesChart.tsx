import { useMemo, useState } from 'react';
import { DailyExpense, formatCOP, formatShortCOP, parseSpanishDate } from '../data/budgetData';

export type ChartMode = 'daily' | 'cumulative';

interface DailyExpensesChartProps {
  dailyExpenses: DailyExpense[];
  totalDaysInMonth: number;
  monthlyBudget: number;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
}

export function DailyExpensesChart({
  dailyExpenses,
  totalDaysInMonth,
  monthlyBudget,
  mode,
  onModeChange,
}: DailyExpensesChartProps) {
  const { averageDaily, peakDay, cumulativeSeries, maxDailyValue } = useMemo(() => {
    const sum = dailyExpenses.reduce((acc, item) => acc + item.amount, 0);
    const avg = dailyExpenses.length > 0 ? sum / dailyExpenses.length : 0;
    const peak = dailyExpenses.reduce(
      (max, item) => (item.amount > max.amount ? item : max),
      dailyExpenses[0]
    );

    let runningTotal = 0;
    const cumulative = dailyExpenses.map((item) => {
      runningTotal += item.amount;
      return {
        ...item,
        cumulativeAmount: runningTotal,
      };
    });

    const maxDaily = Math.max(...dailyExpenses.map((d) => d.amount), 200_000);

    return {
      averageDaily: avg,
      peakDay: peak,
      cumulativeSeries: cumulative,
      maxDailyValue: maxDaily,
    };
  }, [dailyExpenses]);

  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Full 30-day lookup so hovering any day (including future days 25..30) gives date & amount
  const hoveredRecord = useMemo(() => {
    if (hoveredDay === null) return null;
    const recorded = cumulativeSeries.find((d) => d.day === hoveredDay);
    if (recorded) return recorded;

    const paddedDay = String(hoveredDay).padStart(2, '0');
    const dateInfo = parseSpanishDate(`2026-11-${paddedDay}`);
    const lastCumulative =
      cumulativeSeries.length > 0
        ? cumulativeSeries[cumulativeSeries.length - 1].cumulativeAmount
        : 0;

    return {
      day: hoveredDay,
      dateLabel: dateInfo.dateLabel,
      weekdayShort: dateInfo.weekdayShort,
      amount: 0,
      cumulativeAmount: lastCumulative,
      primaryCategory: 'Alimentación' as const,
      note: 'Día sin gastos registrados aún',
    };
  }, [hoveredDay, cumulativeSeries]);

  const summaryRecord =
    hoveredRecord ??
    cumulativeSeries.find((d) => d.day === peakDay.day) ??
    cumulativeSeries[0];

  // SVG coordinate system
  const svgWidth = 680;
  const svgHeight = 278;
  const padLeft = 48;
  const padRight = 14;
  const padTop = 54;
  const padBottom = 48;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Capsule bar geometry across 30 days
  const slotWidth = plotWidth / totalDaysInMonth;
  const barWidth = Math.max(9, Math.min(13, slotWidth * 0.62));
  const barRadius = barWidth / 2;

  const latestCumulative =
    cumulativeSeries.length > 0
      ? cumulativeSeries[cumulativeSeries.length - 1].cumulativeAmount
      : 0;
  const cumulativeMax = Math.max(monthlyBudget, latestCumulative, 3_200_000);
  const yMax = mode === 'daily' ? maxDailyValue : cumulativeMax;
  const yTicks =
    mode === 'daily'
      ? [0, Math.round(maxDailyValue / 2), maxDailyValue]
      : [0, Math.round(cumulativeMax / 2), cumulativeMax];

  const getY = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), yMax);
    return padTop + plotHeight - (clamped / yMax) * plotHeight;
  };

  const getXCenter = (day: number) => {
    return padLeft + (day - 0.5) * slotWidth;
  };

  // Cumulative line & area paths
  const cumulativePoints = cumulativeSeries.map((item) => ({
    x: getXCenter(item.day),
    y: getY(item.cumulativeAmount),
    day: item.day,
  }));

  const linePath = cumulativePoints
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    cumulativePoints.length > 0
      ? `${linePath} L ${cumulativePoints[cumulativePoints.length - 1].x.toFixed(1)} ${(
          padTop + plotHeight
        ).toFixed(1)} L ${cumulativePoints[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`
      : '';

  const budgetLineY = getY(monthlyBudget);
  const allDays = Array.from({ length: totalDaysInMonth }, (_, idx) => idx + 1);

  // Floating tooltip geometry (appears when hovering/focusing a bar or point)
  const tooltipXRaw = hoveredRecord ? getXCenter(hoveredRecord.day) : 0;
  const tooltipW = 152;
  const tooltipH = 42;
  const tooltipX = Math.min(
    Math.max(tooltipXRaw - tooltipW / 2, padLeft),
    svgWidth - padRight - tooltipW
  );
  const tooltipTargetY = hoveredRecord
    ? mode === 'daily'
      ? hoveredRecord.day > dailyExpenses.length
        ? padTop + plotHeight * 0.44
        : getY(hoveredRecord.amount)
      : getY(hoveredRecord.cumulativeAmount)
    : padTop;
  const tooltipY = Math.max(4, tooltipTargetY - tooltipH - 10);

  return (
    <section
      aria-labelledby="grafico-gastos-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-6 flex flex-col justify-between h-full transition-colors"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="grafico-gastos-heading"
              className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Gastos diarios del mes
            </h2>
            {summaryRecord && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {summaryRecord.weekdayShort} {summaryRecord.dateLabel}
                </span>{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCOP(
                    mode === 'daily'
                      ? summaryRecord.amount
                      : summaryRecord.cumulativeAmount
                  )}
                </span>{' '}
                <span aria-hidden="true">·</span> {summaryRecord.note}
              </p>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Modo del gráfico"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'daily'}
              onClick={() => onModeChange('daily')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                mode === 'daily'
                  ? 'bg-[#146C43] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Diario
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'cumulative'}
              onClick={() => onModeChange('cumulative')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                mode === 'cumulative'
                  ? 'bg-[#146C43] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Acumulado
            </button>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="mt-3 w-full">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none overflow-visible"
          role="img"
          aria-label={
            mode === 'daily'
              ? 'Gráfico de barras de gastos diarios en noviembre de 2026'
              : 'Gráfico acumulado de gastos mensuales frente al presupuesto'
          }
          onMouseLeave={() => setHoveredDay(null)}
        >
          <defs>
            <pattern
              id="chartDiagonalHatch"
              width="6"
              height="6"
              patternTransform="rotate(40 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="6" height="6" className="fill-slate-50 dark:fill-slate-800" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                className="stroke-slate-300 dark:stroke-slate-600"
                strokeWidth="2.2"
              />
            </pattern>
            <linearGradient id="cumulativeAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#146C43" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#146C43" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Subtle Y-Axis Ticks */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className={
                    tick === 0
                      ? 'stroke-slate-300 dark:stroke-slate-700'
                      : 'stroke-slate-100 dark:stroke-slate-800'
                  }
                  strokeWidth={tick === 0 ? '1.25' : '1'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10.5px] font-medium tabular-nums"
                >
                  {formatShortCOP(tick)}
                </text>
              </g>
            );
          })}

          {mode === 'daily' ? (
            <>
              {/* Remaining days 25..30 rendered as diagonal-hatched capsules */}
              {Array.from(
                { length: totalDaysInMonth - dailyExpenses.length },
                (_, idx) => dailyExpenses.length + idx + 1
              ).map((futureDay) => {
                const x = getXCenter(futureDay) - barWidth / 2;
                const futureHeight = plotHeight * 0.56;
                const y = padTop + plotHeight - futureHeight;
                const isHovered = hoveredDay === futureDay;

                return (
                  <g key={futureDay}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={futureHeight}
                      rx={barRadius}
                      fill="url(#chartDiagonalHatch)"
                      className={
                        isHovered
                          ? 'stroke-[#146C43] dark:stroke-emerald-400'
                          : 'stroke-slate-200 dark:stroke-slate-700'
                      }
                      strokeWidth={isHovered ? '1.25' : '0.75'}
                    />
                    <rect
                      x={getXCenter(futureDay) - slotWidth / 2}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${futureDay} nov 2026: $0 COP`}
                      onMouseEnter={() => setHoveredDay(futureDay)}
                      onFocus={() => setHoveredDay(futureDay)}
                      onClick={() =>
                        setHoveredDay((prev) => (prev === futureDay ? null : futureDay))
                      }
                    />
                  </g>
                );
              })}

              {/* Recorded Days 1..24 Capsule Bars */}
              {cumulativeSeries.map((item) => {
                const rawHeight = padTop + plotHeight - getY(item.amount);
                const barHeight = Math.max(barWidth * 1.4, rawHeight);
                const x = getXCenter(item.day) - barWidth / 2;
                const y = padTop + plotHeight - barHeight;
                const isHovered = hoveredDay === item.day;
                const isHighSpend = item.amount >= averageDaily;

                let fill = '#34B377';
                if (isHovered) {
                  fill = '#0D4A2D';
                } else if (isHighSpend) {
                  fill = '#146C43';
                } else if (item.amount < 40_000) {
                  fill = 'url(#chartDiagonalHatch)';
                }

                return (
                  <g key={item.day}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={barRadius}
                      fill={fill}
                      stroke={item.amount < 40_000 && !isHovered ? '#CBD5E1' : 'none'}
                      strokeWidth={item.amount < 40_000 && !isHovered ? '0.8' : '0'}
                      className="transition-colors duration-150"
                    />
                    <rect
                      x={getXCenter(item.day) - slotWidth / 2}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${item.dateLabel}: ${formatCOP(item.amount)}`}
                      onMouseEnter={() => setHoveredDay(item.day)}
                      onFocus={() => setHoveredDay(item.day)}
                      onClick={() =>
                        setHoveredDay((prev) => (prev === item.day ? null : item.day))
                      }
                    />
                  </g>
                );
              })}
            </>
          ) : (
            <>
              {/* Monthly Budget Ceiling Line */}
              <line
                x1={padLeft}
                y1={budgetLineY}
                x2={svgWidth - padRight}
                y2={budgetLineY}
                className="stroke-slate-900 dark:stroke-slate-300"
                strokeWidth="1.25"
                strokeDasharray="4 4"
              />
              <text
                x={svgWidth - padRight}
                y={budgetLineY - 6}
                textAnchor="end"
                className="fill-slate-600 dark:fill-slate-300 text-[10.5px] font-medium tabular-nums"
              >
                Tope: {formatCOP(monthlyBudget)}
              </text>

              {areaPath && <path d={areaPath} fill="url(#cumulativeAreaFill)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#146C43"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {cumulativeSeries.map((item) => {
                const cx = getXCenter(item.day);
                const cy = getY(item.cumulativeAmount);
                const isHovered = hoveredDay === item.day;

                return (
                  <g key={item.day}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3}
                      fill={isHovered ? '#0D4A2D' : '#FFFFFF'}
                      stroke="#146C43"
                      strokeWidth="2"
                    />
                    <rect
                      x={cx - slotWidth / 2}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${item.dateLabel}: acumulado ${formatCOP(item.cumulativeAmount)}`}
                      onMouseEnter={() => setHoveredDay(item.day)}
                      onFocus={() => setHoveredDay(item.day)}
                      onClick={() =>
                        setHoveredDay((prev) => (prev === item.day ? null : item.day))
                      }
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* Visible X-Axis Day Ticks (1..30) + Clear Axis Label */}
          {allDays.map((day) => {
            const x = getXCenter(day);
            const isFuture = day > dailyExpenses.length;
            const isHovered = hoveredDay === day;

            return (
              <g key={day}>
                <line
                  x1={x}
                  y1={padTop + plotHeight}
                  x2={x}
                  y2={padTop + plotHeight + 4}
                  className={
                    isHovered
                      ? 'stroke-[#146C43] dark:stroke-emerald-400'
                      : 'stroke-slate-300 dark:stroke-slate-700'
                  }
                  strokeWidth={isHovered ? '1.5' : '1'}
                />
                <text
                  x={x}
                  y={padTop + plotHeight + 17}
                  textAnchor="middle"
                  className={`text-[10px] tabular-nums transition-colors ${
                    isHovered
                      ? 'fill-[#146C43] dark:fill-emerald-400 font-bold'
                      : isFuture
                      ? 'fill-slate-400 dark:fill-slate-500 font-normal'
                      : 'fill-slate-700 dark:fill-slate-300 font-medium'
                  }`}
                >
                  {day}
                </text>
              </g>
            );
          })}

          {/* Explicit X-Axis Title */}
          <text
            x={padLeft + plotWidth / 2}
            y={svgHeight - 6}
            textAnchor="middle"
            className="fill-slate-600 dark:fill-slate-400 text-[11px] font-medium"
          >
            Días del mes (noviembre 2026)
          </text>

          {/* Hover Tooltip: Fecha + Monto */}
          {hoveredRecord && (
            <g className="pointer-events-none">
              <line
                x1={tooltipXRaw}
                y1={tooltipY + tooltipH}
                x2={tooltipXRaw}
                y2={tooltipTargetY}
                stroke="#146C43"
                strokeWidth="1.25"
                strokeDasharray="2.5 2.5"
              />
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipW}
                height={tooltipH}
                rx={10}
                className="fill-slate-900 dark:fill-slate-950 stroke-transparent dark:stroke-slate-700"
                strokeWidth="1"
              />
              <text
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 16}
                textAnchor="middle"
                className="fill-emerald-300 text-[10px] font-medium"
              >
                {hoveredRecord.weekdayShort}, {hoveredRecord.dateLabel}
              </text>
              <text
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 32}
                textAnchor="middle"
                className="fill-white text-[12px] font-bold tabular-nums"
              >
                {formatCOP(
                  mode === 'daily' ? hoveredRecord.amount : hoveredRecord.cumulativeAmount
                )}
              </text>
              <circle
                cx={tooltipXRaw}
                cy={tooltipTargetY}
                r={3.5}
                fill="#FFFFFF"
                stroke="#146C43"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
