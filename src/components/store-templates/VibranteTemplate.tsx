import type { StoreTemplateProps } from "./index";

export function VibranteTemplate({ store, products, onAdd, cartButton }: StoreTemplateProps) {
  const color = store.primary_color;
  return (
    <div className="min-h-screen bg-white text-[#111111]">
      <header className="sticky top-0 z-40" style={{ background: color }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <span
              className="grid size-10 place-items-center rounded-full bg-white font-black"
              style={{ color }}
            >
              {store.name.slice(0, 1)}
            </span>
            <span className="ml-3 text-lg font-black text-white">{store.name}</span>
          </div>
          <div className="text-white">{cartButton}</div>
        </div>
      </header>

      <section
        className="flex max-h-[70vh] min-h-[50vw] flex-col justify-center px-6 pb-8"
        style={{ background: color }}
      >
        <h1
          className="text-[clamp(3.5rem,15vw,10rem)] font-black leading-[0.9] text-white"
          style={{ wordBreak: "break-word" }}
        >
          {store.name}
        </h1>
        <p className="mt-4 text-sm font-medium uppercase tracking-widest text-white/70">{store.niche}</p>
      </section>

      <main className="bg-white px-6 py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 lg:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="h-1.5 w-full" style={{ background: color }} />
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <h2 className="text-sm font-bold leading-tight text-gray-900">{p.name}</h2>
                <p className="mt-1 text-xl font-black" style={{ color }}>
                  ${(p.price_cents / 100).toFixed(2)}
                </p>
                <button
                  onClick={() => onAdd(p)}
                  className="mt-3 w-full rounded-lg py-2.5 font-bold text-white"
                  style={{ background: color }}
                >
                  Agregar
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white py-8 text-center text-xs text-gray-400">
        Hecho con <span className="font-bold" style={{ color }}>Dªtªblɛ</span>
      </footer>
    </div>
  );
}
