import { content } from "@/lib/content";

export function AboutSection() {
  const { about } = content;
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-16 md:py-24">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{about.label}</p>
        <h2 className="mt-3 max-w-3xl whitespace-pre-line text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl lg:text-5xl">
          {about.title}
        </h2>
        <div className="mt-8 grid max-w-3xl gap-5 font-sans text-base text-cream-70 md:text-lg">
          {about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ForWhomSection() {
  const { forWhom } = content;
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-16 md:py-24">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{forWhom.label}</p>
        <h2 className="mt-3 text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          {forWhom.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {forWhom.items.map((item, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-6 md:p-7">
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-cream-40">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-heading text-lg font-semibold text-cream">{item.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-cream-70">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SpeakersSection() {
  const { speakers } = content;
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-16 md:py-24">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{speakers.label}</p>
        <h2 className="mt-3 whitespace-pre-line text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          {speakers.title}
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {speakers.list.map((s, i) => (
            <div
              key={i}
              className="flex flex-col rounded-md border border-border bg-card p-6 md:p-7"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 font-mono text-base font-bold tracking-wider text-gold">
                {s.initials}
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-cream">{s.name}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
                {s.role}
              </p>
              <p className="mt-3 font-sans text-sm leading-relaxed text-cream-70">{s.bio}</p>
            </div>
          ))}
        </div>

        {speakers.note && (
          <p className="mt-8 max-w-2xl font-sans text-sm text-cream-40">{speakers.note}</p>
        )}
      </div>
    </section>
  );
}

export function FormatSection() {
  const { format } = content;
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-16 md:py-24">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{format.label}</p>
        <h2 className="mt-3 whitespace-pre-line text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
          {format.title}
        </h2>

        <ol className="mt-10 max-w-2xl space-y-5">
          {format.schedule.map((item, i) => (
            <li key={i} className="grid grid-cols-[80px_1fr] gap-5 border-l-2 border-gold/30 pl-5">
              <span className="font-mono text-xs font-bold tracking-wider text-gold">
                {item.time}
              </span>
              <div>
                <p className="font-heading text-base font-semibold text-cream">{item.title}</p>
                {item.body && <p className="mt-1 font-sans text-sm text-cream-70">{item.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FaqSection() {
  const { faq } = content;
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-16 md:py-24">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{faq.label}</p>
        <dl className="mt-8 grid max-w-3xl gap-8 md:grid-cols-2">
          {faq.items.map((item, i) => (
            <div key={i}>
              <dt className="font-heading text-lg font-semibold text-cream">{item.q}</dt>
              <dd className="mt-2 font-sans text-sm leading-relaxed text-cream-70">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
