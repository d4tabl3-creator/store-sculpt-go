import type { StoreTemplateProps } from "./index";

const BASE = "#080808";
const INK = "#F0EEE9";

export function OscuraTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  return (
    <div className="min-h-screen" style={{ background: BASE, color: INK }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: BASE, borderBottom: "1px solid rgba(240,238,233,0.08)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-sm font-light uppercase tracking-[0.3em]" style={{ color: INK }}>
            {store.name}
          </span>
          <div style={{ color: INK }}>{cartButton}</div>
        </div>
      </header>

      <section className="flex min-h-[55vh] flex-col justify-end px-4 pb-12" style={{ background: BASE }}>
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-xs uppercase tracking-[0.5em]" style={{ color: store.primary_color }}>
            {store.niche}
          </p>
          <div className="my-4 h-px w-[60px]" style={{ background: store.primary_color }} />
          <h1
            className="text-[clamp(3rem,12vw,9rem)] font-black uppercase leading-none tracking-tight"
            style={{ color: INK, overflowWrap: "break-word" }}
          >
            {store.name}
          </h1>
        </div>
      </section>

      <main className="px-4 py-16" style={{ background: BASE }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
          {products.map((p) => (
            <article key={p.id}>
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
              )}
              <h2 className="mt-3 text-sm font-light uppercase tracking-[0.15em]" style={{ color: INK }}>
                {p.name}
              </h2>
              <p className="mt-1 text-lg font-bold" style={{ color: store.primary_color }}>
                ${(p.price_cents / 100).toFixed(2)}
              </p>
              <button
                onClick={() => onAdd(p)}
                className="mt-2 border px-4 py-2 text-xs uppercase tracking-widest transition-colors hover:bg-[#F0EEE9] hover:text-[#080808]"
                style={{ borderColor: "rgba(240,238,233,0.3)", color: INK, background: "transparent" }}
              >
                Agregar
              </button>
            </article>
          ))}
        </div>
      </main>

      <footer
        className="px-4 py-10 text-center text-xs"
        style={{ background: BASE, borderTop: "1px solid rgba(240,238,233,0.08)", color: "rgba(240,238,233,0.4)" }}
      >
        Hecho con <span className="font-bold" style={{ color: store.primary_color }}>Dªtªblɛ</span>
      </footer>
    </div>
  );
}
