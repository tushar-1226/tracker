/** Instant feedback while a page's data loads (matters most on phones). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-10">
        <div className="h-4 w-40 rounded-full bg-subtle" />
        <div className="mt-3 h-12 w-2/3 rounded-2xl bg-subtle md:h-16" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`h-40 bg-subtle/15 ${i === 1 ? "md:col-span-2" : ""}`} />
        ))}
      </div>
    </div>
  );
}
