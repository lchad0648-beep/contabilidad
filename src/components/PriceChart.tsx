import { CSSProperties } from "react";
import { scaleTime, scaleLinear, line as d3line, area as d3area, max, min, curveMonotoneX } from "d3";

export interface PricePoint {
  date: Date;
  value: number;
}

/**
 * Gráfico de línea con relleno degradado, estilo rosencharts
 * (https://github.com/Filsommer/rosencharts) — mismo enfoque de D3 puro +
 * SVG que ellos, adaptado para precios/saldos en vez de ventas genéricas.
 * Verde si la variación neta es positiva, rojo si es negativa (como un
 * ticker de bolsa real).
 */
export default function PriceChart({
  data,
  height = 220,
  valuePrefix = "$",
  gradientId,
}: {
  data: PricePoint[];
  height?: number;
  valuePrefix?: string;
  gradientId: string;
}) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400 dark:text-slate-500"
        style={{ height }}
      >
        Todavía no hay suficientes datos para graficar.
      </div>
    );
  }

  const positivo = data[data.length - 1].value >= data[0].value;
  const colorClass = positivo ? "text-emerald-500" : "text-red-500";

  const xScale = scaleTime()
    .domain([data[0].date, data[data.length - 1].date])
    .range([0, 100]);

  const valores = data.map((d) => d.value);
  const yMin = Math.min(0, min(valores) ?? 0);
  const yMax = max(valores) ?? 0;
  const pad = (yMax - yMin) * 0.1 || 1;
  const yScale = scaleLinear()
    .domain([yMin - pad, yMax + pad])
    .range([100, 0]);

  const line = d3line<PricePoint>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.value))
    .curve(curveMonotoneX);

  const area = d3area<PricePoint>()
    .x((d) => xScale(d.date))
    .y0(yScale(yMin - pad))
    .y1((d) => yScale(d.value))
    .curve(curveMonotoneX);

  const lineD = line(data);
  const areaD = area(data);
  if (!lineD || !areaD) return null;

  const ticks = yScale.ticks(5);

  return (
    <div
      className={`relative w-full ${colorClass}`}
      style={
        {
          height,
          "--marginTop": "8px",
          "--marginRight": "8px",
          "--marginBottom": "22px",
          "--marginLeft": "48px",
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible"
      >
        {ticks.map((value, i) => (
          <div
            key={i}
            style={{ top: `${yScale(value)}%`, left: "0%" }}
            className="absolute w-full -translate-y-1/2 pr-2 text-right text-xs tabular-nums text-gray-500 dark:text-slate-400"
          >
            {valuePrefix}
            {value.toLocaleString("es", { maximumFractionDigits: value < 10 ? 2 : 0 })}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[calc(100%-var(--marginLeft)-var(--marginRight))] translate-x-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>

          {ticks.map((value, i) => (
            <line
              key={i}
              x1={0}
              x2={100}
              y1={yScale(value)}
              y2={yScale(value)}
              className="text-zinc-300 dark:text-zinc-700"
              stroke="currentColor"
              strokeDasharray="4,4"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
          <path d={lineD} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="translate-y-2">
          {data.map((d, i) => {
            const isFirst = i === 0;
            const isLast = i === data.length - 1;
            if (!isFirst && !isLast) return null;
            return (
              <div
                key={i}
                style={{
                  left: `${xScale(d.date)}%`,
                  top: "100%",
                  transform: `translateX(${isFirst ? "0%" : "-100%"})`,
                }}
                className="absolute text-xs text-zinc-500 dark:text-zinc-400"
              >
                {d.date.toLocaleDateString("es", { day: "numeric", month: "short" })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
