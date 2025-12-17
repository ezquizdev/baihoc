export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-16">
      <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
        BaiHoc
      </span>
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Ready for the next generation of learning.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          We&apos;re building an online learning platform focused on quizzes,
          challenges, and an AI study companion. This placeholder page is part
          of the initialization phase—real features ship next.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-medium text-slate-900">Current Status</h2>
        <p className="mt-2 text-sm text-slate-600">
          The platform scaffolding is in place. Follow the development plan to
          implement auth, student dashboards, AI experiences, and teacher tools.
        </p>
      </div>
    </div>
  );
}
