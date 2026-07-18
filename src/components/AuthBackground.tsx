export default function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--background)]">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl dark:bg-blue-500/20" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-500/20" />
      <div className="absolute bottom-[-6rem] left-1/3 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" />
    </div>
  );
}
