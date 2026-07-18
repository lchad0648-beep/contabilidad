"use client";

import { useEffect, useState } from "react";

interface CalendarioItem {
  cliente: string;
  monto: number;
  prestamo_id: number;
  cuota_id: number;
}

interface CalendarioDia {
  fecha: string;
  total: number;
  items: CalendarioItem[];
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function LoanCalendar({ initialYear, initialMonth }: { initialYear: number; initialMonth: number }) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth); // 1-12
  const [dias, setDias] = useState<Record<string, CalendarioDia>>({});
  const [loading, setLoading] = useState(false);
  const [popover, setPopover] = useState<{ x: number; y: number; dia: CalendarioDia } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/prestamos/calendario?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, CalendarioDia> = {};
        for (const d of data.dias ?? []) map[d.fecha] = d;
        setDias(map);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  function changeMonth(delta: number) {
    setPopover(null);
    let m = month + delta;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
  }

  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = domingo
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="glass-card relative rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-full p-1.5 text-lg text-slate-500 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {MESES[month - 1]} {year}
        </h3>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-full p-1.5 text-lg text-slate-500 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={`empty-${i}`} />;
          const fecha = `${year}-${pad(month)}-${pad(d)}`;
          const dia = dias[fecha];
          const isToday = fecha === todayStr;
          return (
            <button
              key={fecha}
              disabled={!dia}
              onClick={(e) => {
                if (!dia) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setPopover({ x: rect.left + rect.width / 2, y: rect.bottom, dia });
              }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition ${
                dia
                  ? "cursor-pointer bg-blue-500/10 font-semibold text-blue-700 hover:scale-105 hover:bg-blue-500/20 dark:text-blue-300"
                  : "text-slate-400 dark:text-slate-600"
              } ${isToday ? "ring-2 ring-blue-500" : ""}`}
            >
              {d}
              {dia && (
                <span className="mt-0.5 text-[9px] font-normal text-blue-600 dark:text-blue-300">
                  ${dia.total.toLocaleString("es")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-3 text-center text-xs text-slate-400">Cargando…</p>}

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="glass-popover fixed z-50 w-64 -translate-x-1/2 rounded-xl p-4 text-sm shadow-2xl animate-pop-in"
            style={{ left: popover.x, top: popover.y + 8 }}
          >
            <p className="mb-2 font-semibold text-slate-800 dark:text-slate-100">{popover.dia.fecha}</p>
            <ul className="space-y-1.5">
              {popover.dia.items.map((item) => (
                <li key={item.cuota_id} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">{item.cliente}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    ${item.monto.toLocaleString("es")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-black/10 pt-2 text-right text-xs font-semibold text-slate-700 dark:border-white/10 dark:text-slate-200">
              Total: ${popover.dia.total.toLocaleString("es")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
