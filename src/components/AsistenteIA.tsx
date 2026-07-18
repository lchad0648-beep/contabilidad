"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type AccionTipo =
  | "crear_ticket"
  | "solicitar_prestamo"
  | "crud_crear"
  | "crud_actualizar"
  | "crud_eliminar"
  | "solicitar_borrado"
  | "responder_ticket"
  | "asignar_ticket"
  | "cambiar_estado_ticket"
  | "aprobar_prestamo"
  | "rechazar_prestamo"
  | "reasignar_prestamo"
  | "marcar_cuota_pagada"
  | "aprobar_usuario"
  | "rechazar_usuario";
type AccionEstado = "pendiente" | "ejecutando" | "confirmada" | "rechazada" | "error";

interface Accion {
  tipo: AccionTipo | string;
  payload: Record<string, unknown>;
  estado?: AccionEstado;
  resultado?: string;
  url?: string;
}

interface Mensaje {
  role: "user" | "assistant";
  content: string;
  accion?: Accion;
}

const ACCION_REGEX = /<accion\s+tipo="([a-zA-Z_]+)">([\s\S]*?)<\/accion>\s*$/;

function extraerAccion(texto: string): { cleanText: string; accion: Accion | null } {
  const match = texto.match(ACCION_REGEX);
  if (!match) return { cleanText: texto, accion: null };
  try {
    const payload = JSON.parse(match[2]);
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("payload inválido");
    }
    return {
      cleanText: texto.slice(0, match.index).trim(),
      accion: { tipo: match[1], payload, estado: "pendiente" },
    };
  } catch {
    return { cleanText: texto, accion: null };
  }
}

function formatDatos(datos: unknown): string {
  if (typeof datos !== "object" || datos === null) return "";
  return Object.entries(datos as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function refRegistro(p: Record<string, unknown>): string {
  return String(p.id ?? p.buscar ?? "?");
}

function refPrestamo(p: Record<string, unknown>): string {
  return p.prestamo_id != null ? `#${p.prestamo_id}` : String(p.cliente ?? "?");
}

function refTicket(p: Record<string, unknown>): string {
  return p.ticket_id != null ? `#${p.ticket_id}` : String(p.cliente ?? p.asunto ?? "?");
}

function describirAccion(accion: Accion): string {
  const p = accion.payload;
  switch (accion.tipo) {
    case "crear_ticket":
      return `Abrir un ticket de soporte:\n"${p.asunto}"\n${p.mensaje}`;
    case "solicitar_prestamo":
      return `Solicitar un préstamo de ${Number(p.monto).toLocaleString("es")} por: ${p.motivo}`;
    case "crud_crear":
      return `Crear un registro nuevo en "${p.modulo}":\n${formatDatos(p.datos)}`;
    case "crud_actualizar":
      return `Actualizar el registro ${refRegistro(p)} de "${p.modulo}":\n${formatDatos(p.datos)}`;
    case "crud_eliminar":
      return `⚠️ Eliminar (irreversible) el registro ${refRegistro(p)} de "${p.modulo}".`;
    case "solicitar_borrado":
      return `Enviar a un admin la solicitud de borrado del registro ${refRegistro(p)} de "${p.modulo}"${p.motivo ? `: ${p.motivo}` : ""}.`;
    case "responder_ticket":
      return `Responder en el ticket de ${refTicket(p)}:\n"${p.mensaje}"`;
    case "asignar_ticket":
      return `Asignar el ticket de ${refTicket(p)} a: ${p.a}`;
    case "cambiar_estado_ticket":
      return `Cambiar el estado del ticket de ${refTicket(p)} a "${p.estado}".`;
    case "aprobar_prestamo":
      return `Aprobar el préstamo de ${refPrestamo(p)}: plazo ${p.plazo_valor} ${p.plazo_unidad}, ${p.tipo_pago === "cuotas" ? `${p.num_cuotas} cuotas` : "pago único"}, tasa ${p.tasa_interes}%.`;
    case "rechazar_prestamo":
      return `⚠️ Rechazar (irreversible) el préstamo de ${refPrestamo(p)}.`;
    case "reasignar_prestamo":
      return `Reasignar el préstamo de ${refPrestamo(p)} a: ${p.staff_username}`;
    case "marcar_cuota_pagada":
      return `Marcar la cuota ${p.numero_cuota} del préstamo de ${refPrestamo(p)} como pagada.`;
    case "aprobar_usuario":
      return `Aprobar al usuario de staff: ${p.username}`;
    case "rechazar_usuario":
      return `⚠️ Rechazar (irreversible) al usuario de staff: ${p.username}`;
    default:
      return "Realizar una acción en la app.";
  }
}

export default function AsistenteIA() {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, open]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const historial = [...mensajes, { role: "user" as const, content: trimmed }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setText("");
    setSending(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: historial, pagina: pathname }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setMensajes((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: data?.error ?? "El asistente no está disponible en este momento.",
          };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        const snapshot = acumulado;
        setMensajes((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      }

      const { cleanText, accion } = extraerAccion(acumulado);
      setMensajes((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: cleanText, accion: accion ?? undefined };
        return next;
      });
    } catch (err) {
      const mensaje =
        err instanceof DOMException && err.name === "AbortError"
          ? "El asistente está tardando demasiado en responder. Intenta de nuevo en un momento."
          : "Ocurrió un error de conexión con el asistente.";
      setMensajes((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: mensaje };
        return next;
      });
    } finally {
      clearTimeout(timeoutId);
      setSending(false);
    }
  }

  function actualizarAccion(index: number, cambios: Partial<Accion>) {
    setMensajes((prev) => {
      const next = [...prev];
      const actual = next[index];
      if (!actual?.accion) return prev;
      next[index] = { ...actual, accion: { ...actual.accion, ...cambios } };
      return next;
    });
  }

  function rechazarAccion(index: number) {
    actualizarAccion(index, { estado: "rechazada", resultado: "Acción cancelada, no se hizo ningún cambio." });
  }

  async function confirmarAccion(index: number) {
    const accion = mensajes[index]?.accion;
    if (!accion) return;
    actualizarAccion(index, { estado: "ejecutando" });
    try {
      const res = await fetch("/api/asistente/ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: accion.tipo, payload: accion.payload }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        actualizarAccion(index, { estado: "confirmada", resultado: data.mensaje, url: data.url });
      } else {
        actualizarAccion(index, { estado: "error", resultado: data?.error ?? "No se pudo completar la acción." });
      }
    } catch {
      actualizarAccion(index, { estado: "error", resultado: "Error de conexión al ejecutar la acción." });
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente de IA"
        title="Asistente IA"
        className="glass-button-accent fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition hover:scale-110 active:scale-95"
      >
        {open ? "✕" : "✨"}
      </button>

      {open && (
        <div
          className="glass-popover animate-fade-in-up fixed bottom-24 right-6 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl"
          style={{ isolation: "isolate" }}
        >
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">✨ Asistente IA</p>
            <span className="text-xs text-slate-400 dark:text-slate-500">100% gratuito</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-slate-500">
                Pregúntame algo, o pídeme que abra un ticket, solicite un préstamo o (si eres staff) responda a un
                cliente.
              </p>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "glass-button-accent text-white"
                      : "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-slate-100"
                  }`}
                >
                  {m.content || (sending && i === mensajes.length - 1 ? "…" : "")}
                </div>

                {m.accion && (
                  <div className="mt-1.5 max-w-[85%] rounded-xl border border-black/10 bg-amber-500/10 p-3 text-xs dark:border-white/10 dark:bg-amber-400/10">
                    <p className="mb-2 whitespace-pre-wrap text-gray-700 dark:text-slate-200">
                      {describirAccion(m.accion)}
                    </p>

                    {(!m.accion.estado || m.accion.estado === "pendiente") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmarAccion(i)}
                          className="glass-button-accent rounded-full px-3 py-1 text-xs font-medium text-white"
                        >
                          Seguir adelante
                        </button>
                        <button
                          onClick={() => rechazarAccion(i)}
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-black/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}

                    {m.accion.estado === "ejecutando" && (
                      <p className="text-gray-500 dark:text-slate-400">Ejecutando…</p>
                    )}

                    {m.accion.estado === "confirmada" && (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        ✅ {m.accion.resultado}
                        {m.accion.url && (
                          <>
                            {" "}
                            <a href={m.accion.url} className="underline">
                              Ver
                            </a>
                          </>
                        )}
                      </p>
                    )}

                    {m.accion.estado === "rechazada" && (
                      <p className="text-gray-500 dark:text-slate-400">❎ {m.accion.resultado}</p>
                    )}

                    {m.accion.estado === "error" && (
                      <p className="text-red-600 dark:text-red-400">⚠️ {m.accion.resultado}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:disabled:bg-white/[0.02]"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
