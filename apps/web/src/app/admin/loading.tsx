export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      <div className="h-64 rounded-2xl border border-slate-200 bg-slate-50" />
    </div>
  );
}
