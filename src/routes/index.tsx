import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Layers,
  LineChart,
  MessageCircle,
  Package,
  Palette,
  Rocket,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HOME_URL = "https://store-sculpt-go.lovable.app/";
const HOME_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7a5cde6c-c205-4518-a846-8c583529d0db/id-preview-cf54571e--6109d9a1-8043-4081-8fd7-c0751533960a.lovable.app-1782854219214.png";
const HOME_DESC = "Construimos para ti activos digitales diseñados para generar ingresos: tienda automatizada, proveedor conectado y pagos activos. Sin renta, sin inventario, sin código.";

const HOME_FAQS = [
  { q: "¿En cuánto tiempo tengo mi tienda vendiendo?", a: "Tu vitrina — con productos demo o tarjetas de regalo digitales — queda publicada el mismo día en menos de 10 minutos. Para vender productos físicos reales enlazamos tu cuenta con el proveedor bajo demanda (por ejemplo Printify o similar), activamos tus pagos y verificamos tus datos: eso normalmente toma 24 a 48 horas hábiles y necesita que tú nos compartas correo, CLABE y (si aplica) RFC." },
  { q: "¿Necesito saber programar o diseñar?", a: "No. Eliges entre opciones. Nosotros nos encargamos de proveedores, pagos, envíos, diseño y la inteligencia detrás." },
  { q: "¿Qué pasa con los productos? ¿Yo los tengo?", a: "No es necesario. Trabajamos con proveedores bajo demanda y productores locales. Cuando alguien compra, ellos producen y envían directo al cliente." },
  { q: "¿Cuánto se queda DªTªBLe de cada venta?", a: "20% si publicas gratis, 10% si activas un plan mensual (Starter o Pro). El resto es tuyo. Sin letras chiquitas." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí, sin penalización. Tu tienda se mantiene en pausa por 30 días por si quieres volver." },
  { q: "Soy artesano y solo quiero que vendan mi producto, ¿puedo?", a: "Sí. Tenemos un área específica para productores que solo aportan producto, sin abrir tienda propia." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DªTªBLe — Activos digitales diseñados para generar ingresos" },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: "DªTªBLe — Activos digitales diseñados para generar ingresos" },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: HOME_URL },
      { property: "og:image", content: HOME_OG_IMAGE },
      { name: "twitter:title", content: "DªTªBLe — Activos digitales diseñados para generar ingresos" },
      { name: "twitter:description", content: HOME_DESC },
      { name: "twitter:image", content: HOME_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: HOME_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "DªTªBLe",
          url: HOME_URL,
          description: HOME_DESC,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOME_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

/* ---------- Brand mark ---------- */

function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-xl font-extrabold tracking-tight ${className}`}
      aria-label="DªTªBLe"
    >
      D<span className="text-primary">ª</span>T<span className="text-primary">ª</span>BLe
    </span>
  );
}

/* ---------- Nav ---------- */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
          <a href="#para-quien" className="hover:text-foreground">Para quién</a>
          <a href="#ia" className="hover:text-foreground">IA</a>
          <a href="#precios" className="hover:text-foreground">Precios</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="shine-on-hover">
            <Link to="/crear">
              Crear mi tienda <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="grid-noise absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 md:grid-cols-2 md:items-center md:pt-24 md:pb-28">
        <div>
          <Badge className="mb-5 inline-flex items-center gap-1.5 rounded-md border-2 border-primary bg-black px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-primary shadow-[3px_3px_0_0_rgba(0,0,0,0.9)]">
            <Sparkles className="size-3.5" /> Activo digital productivo
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Construimos para ti{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              activos digitales
            </span>{" "}
            diseñados para generar ingresos.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Sin renta, sin inventario, sin comprar mercancía por adelantado. Un{" "}
            <strong className="text-foreground">activo digital productivo</strong> escala a la velocidad del internet:
            crece con tu esfuerzo y sigue trabajando cuando tú no estás. Tú traes la marca; nosotros ponemos
            proveedor, pagos e infraestructura.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shine-on-hover shadow-cta">
              <Link to="/crear">
                Quiero el mío <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Ver cómo lo armamos</a>
            </Button>
          </div>
          <ul className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "0 renta · 0 inventario · 0 código",
              "Diseñado para generar ingresos, no likes",
              "Crecimiento exponencial, no lineal",
              "Tú pones la marca; nosotros la maquinaria",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

function HeroMock() {
  const steps = [
    { icon: Boxes, label: "Rubro", value: "Ropa Deportiva" },
    { icon: Package, label: "Kit", value: "Yoga Básico" },
    { icon: Palette, label: "Fachada", value: "Skin · Aurora" },
    { icon: CreditCard, label: "Pagos", value: "Pago + Envío" },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-pop">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-accent" />
            <span className="size-2.5 rounded-full bg-success" />
            <span className="ml-2 font-mono">tutienda.datable.com.mx</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">EN VIVO</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl border border-border/60 bg-background/60 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="grid size-5 place-items-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                {s.label}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <s.icon className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{s.value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground">
          <div>
            <div className="text-[11px] uppercase tracking-wider opacity-80">Tu tienda</div>
            <div className="font-display text-base font-bold">¡Lista en 1:42 min!</div>
          </div>
          <Rocket className="size-6" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Cómo funciona — 4 ventanillas ---------- */

const VENTANILLAS = [
  {
    n: 1,
    icon: Boxes,
    title: "¿Qué vas a vender?",
    sub: "El rubro",
    desc: "Elige entre 10 macro-rubros. Nuestra IA cruza tendencias y márgenes promedio para sugerirte el camino.",
    chips: ["Moda", "Belleza", "Comida", "Deportiva", "Hogar"],
  },
  {
    n: 2,
    icon: Package,
    title: "Elige tu combo",
    sub: "Kit de lanzamiento",
    desc: "Productos pre-negociados con proveedores reales. Tú ajustas precio y subes una foto — la IA mejora el resto.",
    chips: ["10 productos", "3 proveedores", "Margen sugerido"],
  },
  {
    n: 3,
    icon: Palette,
    title: "¿Cómo te ves?",
    sub: "Fachada y marca",
    desc: "Sube tu logo: lo vectorizamos y generamos tu paleta. Eliges una de 3 pieles y ya tienes identidad.",
    chips: ["3 templates", "Logo auto", "Paleta IA"],
  },
  {
    n: 4,
    icon: CreditCard,
    title: "¿Cómo cobras y envías?",
    sub: "Pagos y logística",
    desc: "Pasarela de pago y envíos resueltos con una sola pregunta. Tú eliges, nosotros conectamos todo por debajo.",
    chips: ["Tarjeta", "Transferencia", "Paquetería", "Recoge en tienda"],
  },
];

function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Cómo funciona"
          title="4 ventanillas. Vitrina digital automatizada hoy, ventas reales en 24–48 h."
          desc="Un flujo guiado, ventanilla por ventanilla. Tú aportas datos básicos (correo, CLABE, cuenta con el proveedor); nosotros integramos todo."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {VENTANILLAS.map((v) => (
            <div
              key={v.n}
              className="group relative rounded-2xl border border-border/60 bg-background p-6 transition-all hover:shadow-pop hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
                  {v.n}
                </span>
                <v.icon className="size-5 text-primary opacity-70 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-5">
                <div className="text-xs font-medium uppercase tracking-wider text-primary">{v.sub}</div>
                <h3 className="mt-1 font-display text-lg font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {v.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Para quién ---------- */

function ParaQuien() {
  const groups = [
    {
      icon: Rocket,
      title: "Emprendedores sin capital",
      items: [
        "Te estás quedando sin trabajo y necesitas un ingreso ya.",
        "Siempre quisiste emprender pero no sabes por dónde empezar.",
        "No tienes para pagar diseñadores ni programadores.",
        "Quieres un ingreso extra desde casa.",
      ],
    },
    {
      icon: Store,
      title: "Artesanos y productores",
      items: [
        "Haces bolsas, joyería, café, comida — pero no sabes nada digital.",
        "Tienes producto y logística, pero no tienes canal digital.",
        "Quieres que otros vendan tu producto en sus tiendas.",
        "Necesitas envíos resueltos sin contratar paqueterías.",
      ],
    },
  ];
  return (
    <section id="para-quien" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Para quién es"
          title="Para ti, que quieres vender — no estudiar tecnología."
          desc="DªTªBLe es un ecosistema híbrido: una mitad para quien quiere una tienda, la otra para quien tiene producto."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-border/60 bg-card p-7 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft">
                  <g.icon className="size-5 text-primary" />
                </span>
                <h3 className="font-display text-xl font-bold text-foreground">{g.title}</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {g.items.map((it) => (
                  <li key={it} className="flex gap-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Entrega instantánea ---------- */

function MomentoMcDonalds() {
  const beats = [
    {
      icon: Layers,
      title: "El Orquestador",
      desc: "Se levanta una instancia aislada de tu tienda en nuestra nube.",
    },
    {
      icon: Wand2,
      title: "El Cargador IA",
      desc: "Nuestros bots traen stock, imágenes y descripciones de tus proveedores.",
    },
    {
      icon: Settings2,
      title: "El Configurador",
      desc: "Activamos tu pasarela de pago y conectamos las APIs de envíos.",
    },
    {
      icon: Rocket,
      title: "El Builder",
      desc: "Compilamos el front-end con tu skin, tu logo y tu paleta.",
    },
  ];
  return (
    <section className="border-t border-border/60 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Entrega en dos tiempos
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            Hoy: tu vitrina. En 24–48 h: vendes de verdad.
          </h2>
          <p className="mt-4 text-base opacity-80">
            No te vendemos humo de "listo en 2 minutos". Publicamos tu vitrina el mismo día con productos
            demo o tarjetas de regalo digitales. Después, con los datos que tú aportas, enlazamos tu cuenta
            de proveedor, activamos tus pagos y dejamos el catálogo real vendiendo en 24 a 48 horas hábiles.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-4">
          {beats.map((b, i) => (
            <li key={b.title} className="relative">
              <div className="rounded-2xl bg-background/5 p-5 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <b.icon className="size-5 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{b.title}</h3>
                <p className="mt-1.5 text-sm opacity-75">{b.desc}</p>
              </div>
              {i < beats.length - 1 && (
                <ChevronRight className="absolute top-1/2 -right-3 hidden size-5 -translate-y-1/2 text-accent md:block" />
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-2xl border border-white/10 bg-background/5 p-6 md:flex md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Recibes en tu correo</div>
            <p className="mt-2 font-display text-lg font-bold">
              tutienda.datable.com.mx + Panel de admin con 3 botones gigantes.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
            {["Vender", "Ver pedidos", "Editar"].map((b) => (
              <span
                key={b}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- IA Fantasma ---------- */

function IAFantasma() {
  const ias = [
    {
      icon: LineChart,
      title: "Stock predictivo",
      desc: "Te avisa qué producto se va a acabar en 3 días y le pide más a tu proveedor por ti.",
    },
    {
      icon: Zap,
      title: "Precios dinámicos",
      desc: "Vigila a la competencia y te sugiere bajar precio, subirlo o activar envío gratis.",
    },
    {
      icon: MessageCircle,
      title: "Atención al cliente",
      desc: "Chatbot que responde el 80% de las dudas: '¿dónde está mi pedido?', cambios, devoluciones.",
    },
  ];
  return (
    <section id="ia" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="IA fantasma"
          title="Tu gerente de tienda — sin nómina."
          desc="DªTªBLe no es solo software. En segundo plano, una IA toma decisiones por ti las 24 horas."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ias.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border border-border/60 bg-card p-7 transition-all hover:shadow-pop hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <it.icon className="size-5 text-primary-foreground" />
                </span>
                <Brain className="size-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Comparativa ---------- */

function Comparativa() {
  const rows = [
    ["Flujo guiado ventanilla por ventanilla", true, false, false],
    ["Vitrina publicada el mismo día", true, false, false],
    ["Sin conocimientos técnicos", true, false, false],
    ["Proveedores ya integrados", true, false, false],
    ["Logística ya negociada", true, false, false],
    ["Pagos listos al instante", true, "partial", false],
    ["Panel admin con 3 botones", true, false, false],
    ["IA que decide por ti", true, false, false],
  ] as const;
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Comparativa"
          title="DªTªBLe vs. todo lo demás."
          desc="Otras herramientas te dan piezas. Nosotros te entregamos el negocio terminado."
        />
        <div className="mt-10 overflow-x-auto rounded-2xl border border-border/60 bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-5 py-4 font-semibold text-foreground">Característica</th>
                <th className="px-5 py-4 text-center font-display font-bold text-primary">DªTªBLe</th>
                <th className="px-5 py-4 text-center font-medium text-muted-foreground">Constructores DIY</th>
                <th className="px-5 py-4 text-center font-medium text-muted-foreground">Tienda tradicional</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, a, b, c]) => (
                <tr key={label as string} className="border-b border-border/40 last:border-0">
                  <td className="px-5 py-4 text-foreground">{label}</td>
                  <Cell v={a} />
                  <Cell v={b} />
                  <Cell v={c} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({ v }: { v: boolean | "partial" }) {
  return (
    <td className="px-5 py-4 text-center">
      {v === true ? (
        <Check className="mx-auto size-5 text-primary" />
      ) : v === "partial" ? (
        <span className="text-xs font-medium text-accent">Parcial</span>
      ) : (
        <X className="mx-auto size-4 text-muted-foreground opacity-50" />
      )}
    </td>
  );
}

/* ---------- Precios ---------- */

function Precios() {
  const plans = [
    {
      name: "Gratis",
      price: "$0",
      commission: "20%",
      desc: "Publica y cobra sin mensualidad. Nosotros cobramos 20% por venta.",
      features: [
        "1 tienda publicada",
        "Checkout con Stripe activo",
        "Panel de pedidos",
        "Vista previa privada mientras armas",
        "Sin tarjeta para empezar",
      ],
      cta: "Empezar gratis",
      featured: false,
      free: true,
    },
    {
      name: "Starter",
      price: "$299",
      commission: "10%",
      desc: "Baja la comisión a la mitad. Ideal si ya vendes.",
      features: [
        "1 tienda publicada",
        "10% de comisión (en lugar de 20%)",
        "Checkout con Stripe activo",
        "Panel de pedidos + pagos automáticos",
        "Cancela cuando quieras",
      ],
      cta: "Activar Starter",
      featured: false,
      free: false,
    },
    {
      name: "Pro",
      price: "$499",
      commission: "10%",
      desc: "Varias tiendas + soporte prioritario.",
      features: [
        "Tiendas ilimitadas",
        "Todo lo de Starter",
        "Dominio propio (próximamente)",
        "Soporte prioritario",
      ],
      cta: "Quiero Pro",
      featured: true,
      free: false,
    },
  ];
  return (
    <section id="precios" className="border-t border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Precios"
          title="Publica gratis. Paga menos comisión si suscribes."
          desc="Sin mensualidad: 20% por venta. Con plan: 10% por venta. Tú eliges cuándo te conviene bajar la comisión."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "relative rounded-3xl border p-7 transition-all " +
                (p.featured
                  ? "border-primary bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-pop"
                  : "border-border/60 bg-card")
              }
            >
              {p.featured && (
                <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                  Más elegido
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                <span
                  className={
                    "text-xs font-medium " +
                    (p.featured ? "opacity-80" : "text-muted-foreground")
                  }
                >
                  {p.commission} por venta
                </span>
              </div>
              <p className={"mt-1 text-sm " + (p.featured ? "opacity-80" : "text-muted-foreground")}>
                {p.desc}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold">{p.price}</span>
                <span className={p.featured ? "opacity-80" : "text-muted-foreground"}>
                  MXN / mes
                </span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={
                        "mt-0.5 size-4 shrink-0 " +
                        (p.featured ? "text-accent" : "text-primary")
                      }
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={p.featured ? "secondary" : "default"}
                className="mt-7 w-full"
              >
                <Link to="/planes">{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Marketplace de proveedores ---------- */

function Marketplace() {
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <Badge className="bg-accent-soft text-accent-foreground border-0">
              <Truck className="mr-1 size-3" /> Ecosistema híbrido
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
              ¿Tienes producto pero no canal? Súbelo a nuestro ecosistema.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Si produces algo con tus manos — bolsas, café, joyería, comida, ropa — y ya tienes
              logística cubierta, sube tu catálogo a DªTªBLe. Otros usuarios lo van a montar en sus
              tiendas y tú solo te encargas de producir.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-foreground">
              {[
                "Sin abrir tu propia tienda",
                "Split de pagos automático",
                "Envíos integrados con paquetería",
                "Tú produces. Otros venden.",
              ].map((it) => (
                <li key={it} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" /> {it}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="outline" className="mt-7">
              <Link to="/auth">
                Quiero ser proveedor <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-accent/20 to-primary/20 blur-2xl" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Bolsas tejidas", city: "Costa", tag: "Artesanal" },
                { name: "Café de altura", city: "Sierra", tag: "Gourmet" },
                { name: "Joyería de plata", city: "Centro", tag: "Plata 925" },
                { name: "Destilado agave", city: "Sur", tag: "Selección" },
              ].map((p, i) => (
                <div
                  key={p.name}
                  className={
                    "rounded-2xl border border-border/60 bg-card p-5 shadow-soft " +
                    (i % 2 === 1 ? "translate-y-4" : "")
                  }
                >
                  <div className="grid h-20 place-items-center rounded-lg bg-gradient-to-br from-primary-soft to-accent-soft">
                    <ShoppingBag className="size-7 text-primary" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.city} · {p.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQS = [
  {
    q: "¿En cuánto tiempo tengo mi tienda vendiendo?",
    a: "Tu vitrina digital automatizada — con productos demo o tarjetas de regalo digitales — queda publicada el mismo día en menos de 10 minutos. Para vender productos físicos reales enlazamos tu cuenta con el proveedor bajo demanda (por ejemplo Printify o similar), activamos tus pagos y verificamos tus datos: eso normalmente toma 24 a 48 horas hábiles y necesita que tú nos compartas correo, CLABE y (si aplica) RFC.",
  },
  {
    q: "¿Qué necesitas de mí para conectar al proveedor?",
    a: "Correo electrónico para abrir tu cuenta con el proveedor bajo demanda (te guiamos paso a paso; si ya la tienes, mejor). CLABE para depositarte tus ventas. Opcional: RFC y régimen fiscal si quieres factura. Sin eso podemos dejar tu vitrina viva con tarjetas de regalo, pero no despachar producto físico.",
  },
  {
    q: "¿Necesito saber programar o diseñar?",
    a: "No. Eliges entre opciones. Nosotros nos encargamos de proveedores, pagos, envíos, diseño y la inteligencia detrás.",
  },
  {
    q: "¿Qué pasa con los productos? ¿Yo los tengo?",
    a: "No es necesario. Trabajamos con proveedores bajo demanda y productores locales. Cuando alguien compra, ellos producen y envían directo al cliente.",
  },
  {
    q: "¿Cuánto se queda DªTªBLe de cada venta?",
    a: "1.5% en el plan Básico, 0.5% en Pro. El resto del margen es tuyo. Sin letras chiquitas.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin penalización. Tu tienda se mantiene en pausa por 30 días por si quieres volver.",
  },
  {
    q: "Soy artesano y solo quiero que vendan mi producto, ¿puedo?",
    a: "Sí. Tenemos un área específica para productores que solo aportan producto, sin abrir tienda propia.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Preguntas frecuentes"
          title="Lo que todos preguntan."
          desc=""
        />
        <div className="mt-10 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <button
                key={f.q}
                onClick={() => setOpen(isOpen ? null : i)}
                className="block w-full px-5 py-5 text-left transition-colors hover:bg-primary-soft/40"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-display text-base font-semibold text-foreground">{f.q}</span>
                  <ChevronRight
                    className={
                      "size-4 shrink-0 text-primary transition-transform " +
                      (isOpen ? "rotate-90" : "")
                    }
                  />
                </div>
                {isOpen && (
                  <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA final ---------- */

function CTAFinal() {
  return (
    <section id="cta" className="relative overflow-hidden border-t border-border/60 bg-primary text-primary-foreground">
      <div className="grid-noise absolute inset-0 opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
        <Sparkles className="mx-auto mb-5 size-7" />
        <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
          Tu tienda te está esperando.
        </h2>
        <p className="mt-4 text-base opacity-90 md:text-lg">
          Vitrina digital automatizada hoy. Ventas reales en 24–48 h. Cero excusas para no empezar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="shine-on-hover">
            <Link to="/">
              Crear mi tienda <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href="#precios">Ver precios</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Franchise-as-a-Service. Vitrina digital automatizada hoy, tienda vendiendo en 24–48 h. Hecho con ♥ en México.
            </p>
          </div>
          <FooterCol
            title="Producto"
            links={[
              { label: "Cómo funciona", href: "#como-funciona" },
              { label: "Precios", href: "#precios" },
              { label: "IA", href: "#ia" },
              { label: "Proveedores", href: "#para-quien" },
            ]}
          />
          <FooterCol
            title="Empresa"
            links={[
              { label: "FAQ", href: "#faq" },
              { label: "Términos", href: "#" },
              { label: "Privacidad", href: "#" },
              { label: "Contacto", href: "#" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} DªTªBLe. Todos los derechos reservados.</span>
          <span>Hecho en México</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-display text-sm font-bold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-foreground">{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Shared ---------- */

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {desc && <p className="mt-4 text-base text-muted-foreground">{desc}</p>}
    </div>
  );
}

/* ---------- Page ---------- */

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <ComoFunciona />
        <ParaQuien />
        <MomentoMcDonalds />
        <IAFantasma />
        <Comparativa />
        <Precios />
        <Marketplace />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
