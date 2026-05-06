import { content } from "@/lib/content";

export function EventDetails() {
  return (
    <aside
      className="rounded-md border border-border bg-card p-6 md:p-8"
      aria-label="Event details"
    >
      <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">EVENT DETAILS</p>

      <dl className="mt-5 grid gap-4">
        {content.details.map((item) => (
          <div key={item.label} className="grid gap-1">
            <dt className="font-mono text-[10px] font-medium tracking-[0.2em] text-cream-40">
              {item.label}
            </dt>
            <dd className="font-sans text-sm text-cream md:text-base">{item.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
