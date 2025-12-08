export default function QuizAttemptStartLoading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <output
        className="flex items-center gap-3 text-slate-600 font-semibold"
        aria-live="polite"
      >
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#2868e6]"
          aria-hidden="true"
        />
        Đang tải...
      </output>
    </div>
  );
}
