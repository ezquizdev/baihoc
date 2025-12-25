export default function AttemptResultsLoading() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#2868e6]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                Đang tải kết quả...
              </div>
              <div className="text-sm text-slate-600">
                Vui lòng chờ trong giây lát.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

