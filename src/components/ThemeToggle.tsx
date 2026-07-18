"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage puede no estar disponible; el toggle sigue funcionando en memoria
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      className="flex h-9 w-9 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-black/5 active:scale-95 dark:hover:bg-white/10"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
