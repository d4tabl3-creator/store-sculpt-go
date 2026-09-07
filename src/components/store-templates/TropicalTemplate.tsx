import type { StoreTemplateProps } from "./index";

const BASE = "#FFFBF5";

export function TropicalTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const color = store.primary_color;
  return (
    <div className="min-h-screen" style={{ background: BASE }}>
      <header className="sticky top-0 z-40 border-b-2 bg-white" style={{ borderColor: color }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-lg font-black" style={{ color }}>{store.name}</div>
            <div className="text-xs" style={{ color, opacity: 0.6 }}>{store.niche}</div>
          </div>
          <div style={{ color }}>{cartButton}</div>
        </div>
      </header>

      <div style={{ background: color, clipPath: "ellipse(120% 100% at 50% 0%)" }}>
        <section className="flex min-h-[40vh] items-center justify-center px-6 py-14 text-center">
          <div>
            <h1 className="text-5xl font-black leading-tight text-white sm:text-7xl" style={{ wordBreak: "break-word" }}>
              {store.name}
            </h1>
            <p className="mt-3 text-sm font-medium text-white/80">{store.niche}</p>
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-xl px-4 py-10 sm:max-w-4xl">
        <div className="grid grid-cols-2 gap-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-3xl bg-white"
              style={{ boxShadow: `0 4px 20px ${color}30` }}
            >
              {p.image_url && (
                <div className="bg-white p-3">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="aspect-square w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <h2 className="mt-1 px-3 text-sm font-bold" style={{ color: "#1A1A1A" }}>{p.name}</h2>
              <p className="mt-0.5 px-3 text-lg font-black" style={{ color }}>
                ${(p.price_cents / 100).toFixed(2)}
              </p>
              <button
                onClick={() => onAdd(p)}
                className="mx-3 mb-3 mt-2 w-[calc(100%-1.5rem)] rounded-2xl py-2.5 font-bold text-white"
                style={{ background: color }}
              >
                Agregar
              </button>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t-2 bg-white py-8 text-center text-xs text-gray-400" style={{ borderColor: color }}>
        Hecho con <span className="font-bold" style={{ color }}>Dªtªblɛ</span>
      </footer>
    </div>
  );
}
