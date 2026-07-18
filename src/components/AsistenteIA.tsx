"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
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

    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: historial, pagina: pathname }),
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
    } catch {
      setMensajes((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Ocurrió un error de conexión con el asistente." };
        return next;
      });
    } finally {
      setSending(false);
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
                Pregúntame cómo usar la app, sobre algún módulo o pide una sugerencia.
              </p>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "glass-button-accent text-white"
                      : "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-slate-100"
                  }`}
                >
                  {m.content || (sending && i === mensajes.length - 1 ? "…" : "")}
                </div>
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
