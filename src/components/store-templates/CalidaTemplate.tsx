import type { StoreTemplateProps } from "./index";

const LINEN = "#F4EEE4";
const FOREST = "#1C3828";
const INK = "#1A1A1A";
const SOFT = "#6B7A6E";

export function CalidaTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const color = store.primary_color;
  return (
    <div className="min-h-screen" style={{ background: LINEN }}>
      <header className="sticky top-0 z-40" style={{ background: FOREST }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-baseline">
            <span
              className="grid size-9 shrink-0 self-center place-items-center rounded-full font-bold text-white"
              style={{ background: color }}
            >
              {store.name.slice(0, 1)}
            </span>
            <span className="ml-3 text-base font-semibold text-white">{store.name}</span>
            <span className="ml-1 text-xs text-white/50">{store.niche}</span>
          </div>
          <div className="text-white">{cartButton}</div>
        </div>
      </header>

      <section className="px-6 py-16 text-center" style={{ background: LINEN }}>
        <p className="mb-4 text-xs uppercase tracking-[0.4em]" style={{ color: "rgba(28,56,40,0.6)" }}>
          {store.niche}
        </p>
        <hr className="mx-auto mb-4 w-12 border-t-2" style={{ borderColor: color }} />
        <h1 className="text-4xl font-bold sm:text-5xl" style={{ color: INK, fontFamily: "Georgia, serif" }}>
          {store.name}
        </h1>
        <hr className="mx-auto mt-4 w-12 border-t-2" style={{ borderColor: color }} />
        <p className="mt-4 text-sm" style={{ color: SOFT }}>
          Envío a todo México · Pago seguro
        </p>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-12" style={{ background: LINEN }}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-lg border-l-4 bg-white shadow-sm"
              style={{ borderLeftColor: color }}
            >
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <h2 className="text-sm font-semibold" style={{ color: INK }}>{p.name}</h2>
                {p.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: SOFT }}>{p.description}</p>
                )}
                <p className="mt-2 text-lg font-bold" style={{ color: FOREST }}>
                  ${(p.price_cents / 100).toFixed(2)}
                </p>
                <button
                  onClick={() => onAdd(p)}
                  className="mt-3 w-full rounded-md py-2 text-sm text-white transition-opacity hover:opacity-80"
                  style={{ background: FOREST }}
                >
                  Agregar
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-white/50" style={{ background: FOREST }}>
        Hecho con <span className="font-bold" style={{ color }}>Dªtªblɛ</span>
      </footer>
    </div>
  );
}
