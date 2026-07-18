"use client";

import { useEffect, useRef, useState } from "react";

interface Mensaje {
  id: number;
  user_id: number;
  username: string;
  role: string;
  mensaje: string;
  created_at: string;
}

const POLL_MS = 2500;

export default function TicketChat({
  ticketId,
  currentUserId,
  initialMessages,
  closed,
}: {
  ticketId: number;
  currentUserId: number;
  initialMessages: Mensaje[];
  closed: boolean;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(initialMessages.at(-1)?.id ?? 0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/mensajes?after=${lastIdRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const nuevos: Mensaje[] = data.mensajes ?? [];
        if (nuevos.length > 0 && !cancelled) {
          lastIdRef.current = nuevos.at(-1)!.id;
          setMensajes((prev) => [...prev, ...nuevos]);
        }
      } catch {
        // ignore transient network errors, next poll retries
      }
    }

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: trimmed }),
      });
      if (res.ok) {
        setText("");
        const data = await fetch(`/api/tickets/${ticketId}/mensajes?after=${lastIdRef.current}`).then((r) =>
          r.json()
        );
        const nuevos: Mensaje[] = data.mensajes ?? [];
        if (nuevos.length > 0) {
          lastIdRef.current = nuevos.at(-1)!.id;
          setMensajes((prev) => [...prev, ...nuevos]);
        }
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card flex h-[32rem] flex-col rounded-2xl">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {mensajes.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500">Sin mensajes todavía.</p>
        )}
        {mensajes.map((m) => {
          const mine = m.user_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "glass-button-accent text-white"
                    : "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                <div className={`mb-0.5 text-xs ${mine ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}>
                  {m.username} {m.role !== "cliente" && "· staff"}
                </div>
                <div className="whitespace-pre-wrap">{m.mensaje}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={closed || sending}
          placeholder={closed ? "Este ticket está cerrado" : "Escribe un mensaje..."}
          className="flex-1 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:disabled:bg-white/[0.02]"
        />
        <button
          type="submit"
          disabled={closed || sending || !text.trim()}
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
