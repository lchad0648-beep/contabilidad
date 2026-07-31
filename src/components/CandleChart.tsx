import { CSSProperties } from "react";
import { scaleLinear, max, min } from "d3";
import { PricePoint } from "./PriceChart";

export interface VelaOHLC {
  fecha: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Agrupa una serie de precios en velas OHLC, repartiendo los puntos en `numVelas` grupos consecutivos. */
export function agruparEnVelas(data: PricePoint[], numVelas = 24): VelaOHLC[] {
  if (data.length === 0) return [];
  const tamano = Math.max(1, Math.ceil(data.length / numVelas));
  const velas: VelaOHLC[] = [];
  for (let i = 0; i < data.length; i += tamano) {
    const grupo = data.slice(i, i + tamano);
    const valores = grupo.map((p) => p.value);
    velas.push({
      fecha: grupo[Math.floor(grupo.length / 2)].date,
      open: grupo[0].value,
      close: grupo[grupo.length - 1].value,
      high: Math.max(...valores),
      low: Math.min(...valores),
    });
  }
  return velas;
}

/**
 * Gráfico de velas OHLC estilo rosencharts, en D3 puro + SVG (mismo enfoque
 * que PriceChart). El repo público de rosencharts (github.com/Filsommer/rosencharts)
 * no incluye un candle chart gratuito, así que este se construyó a mano
 * agrupando el historial de precios en velas.
 */
export default function CandleChart({
  data,
  height = 220,
  valuePrefix = "$",
  numVelas = 24,
}: {
  data: PricePoint[];
  height?: number;
  valuePrefix?: string;
  numVelas?: number;
}) {
  const velas = agruparEnVelas(data, numVelas);

  if (velas.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400 dark:text-slate-500"
        style={{ height }}
      >
        Todavía no hay suficientes datos para graficar.
      </div>
    );
  }

  const highs = velas.map((v) => v.high);
  const lows = velas.map((v) => v.low);
  const yMin = min(lows) ?? 0;
  const yMax = max(highs) ?? 0;
  const pad = (yMax - yMin) * 0.1 || 1;
  const yScale = scaleLinear()
    .domain([yMin - pad, yMax + pad])
    .range([100, 0]);

  const anchoVela = 100 / velas.length;
  const anchoCuerpo = anchoVela * 0.6;

  const ticks = yScale.ticks(5);

  return (
    <div
      className="relative w-full"
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
      <div className="absolute inset-0 h-[calc(100%-var(--marginTop)-var(--marginBottom))] w-[var(--marginLeft)] translate-y-[var(--marginTop)] overflow-visible">
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

          {velas.map((v, i) => {
            const centro = anchoVela * i + anchoVela / 2;
            const alza = v.close >= v.open;
            const colorClass = alza ? "text-emerald-500" : "text-red-500";
            const yCuerpoTop = yScale(Math.max(v.open, v.close));
            const yCuerpoBottom = yScale(Math.min(v.open, v.close));
            const alturaCuerpo = Math.max(yCuerpoBottom - yCuerpoTop, 0.6);
            return (
              <g key={i} className={colorClass}>
                <line
                  x1={centro}
                  x2={centro}
                  y1={yScale(v.high)}
                  y2={yScale(v.low)}
                  stroke="currentColor"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={centro - anchoCuerpo / 2}
                  y={yCuerpoTop}
                  width={anchoCuerpo}
                  height={alturaCuerpo}
                  fill="currentColor"
                  rx={0.5}
                />
              </g>
            );
          })}
        </svg>

        <div className="translate-y-2">
          {velas.map((v, i) => {
            const isFirst = i === 0;
            const isLast = i === velas.length - 1;
            if (!isFirst && !isLast) return null;
            const centro = anchoVela * i + anchoVela / 2;
            return (
              <div
                key={i}
                style={{
                  left: `${centro}%`,
                  top: "100%",
                  transform: `translateX(${isFirst ? "0%" : "-100%"})`,
                }}
                className="absolute text-xs text-zinc-500 dark:text-zinc-400"
              >
                {v.fecha.toLocaleDateString("es", { day: "numeric", month: "short" })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
