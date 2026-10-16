export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="h-12 max-w-xl rounded bg-slate-200" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-48 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
