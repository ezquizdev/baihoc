export default function AttemptResultsLoading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <output
        className="flex items-center gap-3 text-[var(--muted)] font-semibold"
        aria-live="polite"
      >
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--primary)]"
          aria-hidden="true"
        />
        Đang tải...
      </output>
    </div>
  );
}
