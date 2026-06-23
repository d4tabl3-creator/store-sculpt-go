import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Layers,
  Palette,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tiendas — Marketplace de plantillas de tienda online" },
      {
        name: "description",
        content:
          "Elige una plantilla de tienda lista para vender. Proveedores, logística y bloques verificados — publica tu negocio en minutos.",
      },
      { property: "og:title", content: "Tiendas — Plantillas de tienda listas para vender" },
      {
        property: "og:description",
        content:
          "Plantillas con proveedores y envíos ya integrados. Edita, publica y empieza a vender.",
      },
    ],
  }),
  component: Index,
});

type Category =
  | "Todas"
  | "Moda"
  | "Comida"
  | "Electrónica"
  | "Servicios"
  | "Digital";

type Template = {
  id: string;
  name: string;
  tagline: string;
  category: Exclude<Category, "Todas">;
  emoji: string;
  gradient: string;
  suppliers: string[];
  shipping: string;
  price: string;
  popular?: boolean;
  rating: number;
  installs: string;
};

const CATEGORIES: Category[] = [
  "Todas",
  "Moda",
  "Comida",
  "Electrónica",
  "Servicios",
  "Digital",
];

const TEMPLATES: Template[] = [
  {
    id: "boutique-mx",
    name: "Boutique Moda MX",
    tagline: "Catálogo de ropa con tallas, colores y carrito ágil.",
    category: "Moda",
    emoji: "👗",
    gradient: "from-[oklch(0.55_0.18_268)] to-[oklch(0.42_0.2_268)]",
    suppliers: ["AliExpress", "Printful", "CJ Drop"],
    shipping: "DHL · FedEx · 99Minutos",
    price: "$0 / setup",
    popular: true,
    rating: 4.9,
    installs: "2.4k",
  },
  {
    id: "cocina-express",
    name: "Cocina Express",
    tagline: "Menú digital, pedidos a domicilio y reservas en línea.",
    category: "Comida",
    emoji: "🍜",
    gradient: "from-[oklch(0.7_0.18_45)] to-[oklch(0.55_0.2_30)]",
    suppliers: ["POS Square", "Toast", "Local"],
    shipping: "Rappi · Uber Eats · DiDi Food",
    price: "$0 / setup",
    rating: 4.8,
    installs: "1.8k",
  },
  {
    id: "gadget-hub",
    name: "Gadget Hub",
    tagline: "Dropshipping de electrónica con specs comparables.",
    category: "Electrónica",
    emoji: "🎧",
    gradient: "from-[oklch(0.45_0.18_240)] to-[oklch(0.3_0.12_260)]",
    suppliers: ["Alibaba", "Spocket", "CJ Drop"],
    shipping: "DHL Express · 4PX",
    price: "$0 / setup",
    popular: true,
    rating: 4.7,
    installs: "3.1k",
  },
  {
    id: "studio-reservas",
    name: "Studio Reservas",
    tagline: "Citas, clases y pagos para profesionales y studios.",
    category: "Servicios",
    emoji: "💆",
    gradient: "from-[oklch(0.7_0.13_330)] to-[oklch(0.5_0.15_310)]",
    suppliers: ["Calendly", "Google Cal", "Stripe"],
    shipping: "Servicio presencial / online",
    price: "$0 / setup",
    rating: 4.9,
    installs: "1.2k",
  },
  {
    id: "academy-digital",
    name: "Academy Digital",
    tagline: "Vende cursos, descargas y suscripciones premium.",
    category: "Digital",
    emoji: "🎓",
    gradient: "from-[oklch(0.55_0.16_200)] to-[oklch(0.4_0.14_230)]",
    suppliers: ["Vimeo", "Mux", "Lemon Squeezy"],
    shipping: "Entrega instantánea",
    price: "$0 / setup",
    rating: 4.8,
    installs: "960",
  },
  {
    id: "artesano-co",
    name: "Artesano & Co",
    tagline: "Storefront editorial para piezas hechas a mano.",
    category: "Moda",
    emoji: "🧵",
    gradient: "from-[oklch(0.6_0.14_50)] to-[oklch(0.4_0.1_40)]",
    suppliers: ["Inventario propio", "Etsy sync"],
    shipping: "Estafeta · FedEx · Local",
    price: "$0 / setup",
    rating: 4.9,
    installs: "540",
  },
  {
    id: "fit-meals",
    name: "Fit Meals",
    tagline: "Suscripción semanal de comida saludable.",
    category: "Comida",
    emoji: "🥗",
    gradient: "from-[oklch(0.7_0.16_140)] to-[oklch(0.5_0.15_150)]",
    suppliers: ["Cocina propia", "Stripe Billing"],
    shipping: "Ruta propia · iVoy",
    price: "$0 / setup",
    rating: 4.7,
    installs: "780",
  },
  {
    id: "smart-home",
    name: "Smart Home",
    tagline: "Domótica e IoT con guías de instalación.",
    category: "Electrónica",
    emoji: "🏠",
    gradient: "from-[oklch(0.5_0.15_220)] to-[oklch(0.35_0.13_250)]",
    suppliers: ["Alibaba", "Tuya"],
    shipping: "DHL · 99Minutos",
    price: "$0 / setup",
    rating: 4.6,
    installs: "1.1k",
  },
  {
    id: "agencia-pro",
    name: "Agencia Pro",
    tagline: "Servicios B2B con propuestas y facturación.",
    category: "Servicios",
    emoji: "🧑‍💼",
    gradient: "from-[oklch(0.4_0.18_268)] to-[oklch(0.25_0.12_268)]",
    suppliers: ["Stripe", "DocuSign", "HubSpot"],
    shipping: "Servicio remoto",
    price: "$0 / setup",
    rating: 4.8,
    installs: "430",
  },
];

function Index() {
  const [active, setActive] = useState<Category>("Todas");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchCat = active === "Todas" || t.category === active;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [active, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <TrustStrip />
      <main id="catalogo" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <CatalogHeader
          query={query}
          setQuery={setQuery}
          active={active}
          setActive={setActive}
          count={filtered.length}
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No encontramos plantillas para esa búsqueda.
            </p>
          </div>
        )}
      </main>
      <HowItWorks />
      <Guarantee />
      <Footer />
    </div>
  );
}

/* ───────────── Header ───────────── */

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Tiendas<span className="text-accent">.</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#catalogo" className="hover:text-foreground">Plantillas</a>
          <a href="#como" className="hover:text-foreground">Cómo funciona</a>
          <a href="#garantia" className="hover:text-foreground">Garantía</a>
          <a href="#precios" className="hover:text-foreground">Precios</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
            Entrar
          </button>
          <a
            href="#catalogo"
            className="shine-on-hover inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] transition-transform hover:-translate-y-0.5"
          >
            Empezar gratis
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ───────────── Hero ───────────── */

function Hero() {
  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="grid-noise absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Plantillas con proveedores ya conectados
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              La tienda <span className="relative inline-block">
                <span className="relative z-10">de tiendas</span>
                <span className="absolute bottom-1 left-0 right-0 -z-0 h-3 bg-accent/70" aria-hidden />
              </span>{" "}
              listas para vender.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Elige una plantilla por tipo de negocio. Los productos, pagos y
              envíos vienen pre-conectados. Edita los bloques, publica tu marca
              y empieza a vender — sin código, sin sorpresas.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#catalogo"
                className="shine-on-hover inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] transition-transform hover:-translate-y-0.5"
              >
                Ver plantillas
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#como"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:border-primary/40"
              >
                Cómo funciona
              </a>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
              <Stat k="12k+" v="Tiendas activas" />
              <Stat k="48" v="Proveedores" />
              <Stat k="99.9%" v="Uptime" />
            </dl>
          </div>

          <div className="lg:col-span-5">
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-display text-2xl font-bold text-foreground">{k}</dt>
      <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{v}</dd>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/5 blur-2xl" aria-hidden />
      <div className="relative rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-1.5 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          <span className="ml-2 truncate text-[11px] text-muted-foreground">
            tutienda.tiendas.app
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.32_0.18_268)] p-5 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">
                Plantilla activa
              </p>
              <p className="mt-1 font-display text-xl font-bold">Boutique Moda MX</p>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              Live
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {["Hero", "Catálogo", "Carrito", "Checkout", "Envíos", "Pagos"].map((b) => (
              <div
                key={b}
                className="rounded-lg bg-white/10 px-2 py-3 text-center text-[11px] font-medium backdrop-blur"
              >
                <CheckCircle2 className="mx-auto mb-1 h-3.5 w-3.5 text-accent" />
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniCard icon={<Truck className="h-4 w-4" />} label="Envío" value="DHL · 99Minutos" />
          <MiniCard icon={<Zap className="h-4 w-4" />} label="Proveedor" value="AliExpress + CJ" />
        </div>
      </div>

      <div className="absolute -right-3 -top-3 hidden rotate-3 rounded-xl border border-border bg-accent px-3 py-2 text-xs font-bold text-accent-foreground shadow-[var(--shadow-cta)] sm:block">
        ✓ Bloques verificados
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ───────────── Trust strip ───────────── */

function TrustStrip() {
  const partners = [
    "Stripe", "AliExpress", "DHL", "Rappi", "Printful", "FedEx", "Uber Eats", "Shopify Sync",
  ];
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Integraciones nativas
          </span>
          {partners.map((p) => (
            <span
              key={p}
              className="font-display text-sm font-bold tracking-tight text-foreground/70"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Catalog ───────────── */

function CatalogHeader({
  query,
  setQuery,
  active,
  setActive,
  count,
}: {
  query: string;
  setQuery: (v: string) => void;
  active: Category;
  setActive: (c: Category) => void;
  count: number;
}) {
  return (
    <div className="pt-20">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Catálogo
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Elige tu tipo de negocio
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {count} plantillas listas con proveedores y envíos ya configurados.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar plantillas…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const isActive = c === active;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={
                "rounded-full border px-4 py-2 text-sm font-medium transition-all " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
              }
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TemplateCard({ t }: { t: Template }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      {/* Preview */}
      <div className={`relative h-44 bg-gradient-to-br ${t.gradient} p-5`}>
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            {t.category}
          </span>
          {t.popular && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              Popular
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-5 flex items-end gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
            {t.emoji}
          </span>
          <div className="pb-1 text-white">
            <p className="font-display text-lg font-bold leading-tight">{t.name}</p>
            <p className="text-xs text-white/80">{t.installs} instalaciones</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm text-muted-foreground">{t.tagline}</p>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
            <BadgeCheck className="h-3.5 w-3.5" />
            Bloques verificados
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {t.rating}
          </span>
        </div>

        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Proveedores:</span>{" "}
              {t.suppliers.join(" · ")}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">Logística:</span>{" "}
              {t.shipping}
            </span>
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Desde
            </p>
            <p className="font-display text-base font-bold">{t.price}</p>
          </div>
          <button className="shine-on-hover inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5">
            Usar plantilla
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ───────────── How it works ───────────── */

function HowItWorks() {
  const steps = [
    {
      icon: <Layers className="h-5 w-5" />,
      title: "Elige tu plantilla",
      body:
        "Filtra por tipo de negocio. Cada plantilla ya tiene proveedores, productos demo y envíos conectados.",
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Personaliza los bloques",
      body:
        "Edita logo, colores, textos y catálogo desde un editor visual. Lo que ves es lo que se publica.",
    },
    {
      icon: <Rocket className="h-5 w-5" />,
      title: "Publica y vende",
      body:
        "Conecta tu dominio o usa uno gratis. Pagos, inventario y envíos funcionan desde el día uno.",
    },
  ];
  return (
    <section id="como" className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Cómo funciona
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            De plantilla a tienda real en 3 pasos
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  {s.icon}
                </span>
                <span className="font-display text-5xl font-extrabold text-primary/10">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Guarantee ───────────── */

function Guarantee() {
  const blocks = [
    "Catálogo de productos",
    "Carrito y checkout",
    "Pagos (Stripe / OXXO / SPEI)",
    "Envíos y tracking",
    "Cupones y descuentos",
    "Email transaccional",
    "Panel de pedidos",
    "Analítica de ventas",
  ];
  return (
    <section id="garantia" className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="grid-noise absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Garantía Tiendas
          </span>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Cada bloque <span className="text-accent">funciona</span> antes de que lo toques.
          </h2>
          <p className="mt-5 max-w-lg text-primary-foreground/80">
            Probamos cada plantilla de punta a punta: del catálogo al pago, del envío
            al correo de confirmación. Si un bloque falla, lo reemplazamos sin costo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalogo"
              className="shine-on-hover inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-cta)] transition-transform hover:-translate-y-0.5"
            >
              Elegir plantilla
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {blocks.map((b) => (
            <div
              key={b}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Footer ───────────── */

function Footer() {
  return (
    <footer id="precios" className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Boxes className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">
                Tiendas<span className="text-accent">.</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              El marketplace de plantillas de tienda con proveedores y envíos
              ya conectados. Empieza gratis, paga cuando vendas.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Producto
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#catalogo" className="hover:text-foreground">Plantillas</a></li>
              <li><a href="#como" className="hover:text-foreground">Cómo funciona</a></li>
              <li><a href="#garantia" className="hover:text-foreground">Garantía</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Compañía
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Sobre nosotros</a></li>
              <li><a href="#" className="hover:text-foreground">Proveedores</a></li>
              <li><a href="#" className="hover:text-foreground">Contacto</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Tiendas. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Hecho con <span className="text-accent">★</span> para emprendedores.
          </p>
        </div>
      </div>
    </footer>
  );
}
