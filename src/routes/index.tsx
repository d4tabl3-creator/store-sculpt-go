import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HOME_URL = "https://store-sculpt-go.lovable.app/";
const HOME_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7a5cde6c-c205-4518-a846-8c583529d0db/id-preview-cf54571e--6109d9a1-8043-4081-8fd7-c0751533960a.lovable.app-1782854219214.png";
const HOME_TITLE = "DªTªBLe — Activos digitales productivos";
const HOME_DESC = "Recibe una tienda digital ya estructurada, con catálogo y reglas comerciales preparadas. Personalízala dentro de las opciones disponibles, define tu margen y vende.";

const HOME_FAQS = [
  {
    q: "¿Qué recibo exactamente?",
    a: "Una tienda digital ya estructurada: catálogo de productos disponibles, reglas comerciales preparadas, herramientas para administrar tus ventas y la operación conectada para que los pedidos lleguen a tus clientes.",
  },
  {
    q: "¿Tengo que contratar o gestionar algo por mi cuenta?",
    a: "No. Datable integra la operación necesaria para que puedas vender sin encargarte de la infraestructura que hay detrás.",
  },
  {
    q: "¿Quién se encarga de preparar y enviar los pedidos?",
    a: "Datable coordina la operación necesaria para que el pedido llegue hasta tu cliente. Tú te concentras en vender.",
  },
  {
    q: "¿Necesito saber programar o diseñar?",
    a: "No. Eliges una estructura disponible, la personalizas dentro de las opciones que ofrece y agregas tu identidad.",
  },
  {
    q: "¿Puedo cambiar los productos y los precios?",
    a: "Trabajas con el catálogo y las reglas que ya vienen preparadas. Dentro de las opciones disponibles puedes definir tu margen de ganancia.",
  },
  {
    q: "¿Cuánto se queda DªTªBLe de cada venta?",
    a: "20% si publicas sin plan mensual y 10% si activas un plan. El resto es tuyo.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, sin penalización. Tu tienda se mantiene en pausa por 30 días por si quieres volver.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: HOME_URL },
      { property: "og:image", content: HOME_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_TITLE },
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
          <a href="#que-es-activo" className="hover:text-foreground">Qué es</a>
          <a href="#para-quien" className="hover:text-foreground">Para quién</a>
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
      <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div>
          <Badge className="mb-5 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" /> Activo digital productivo
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Datable crea y entrega{" "}
            <span className="bg-linear-to-r from-primary to-action bg-clip-text text-transparent">
              activos digitales productivos
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Hoy ese activo es una tienda digital de productos personalizados, ya estructurada y lista
            para operar. Eliges una estructura disponible, la haces tuya dentro de sus opciones y la
            pones a vender.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shine-on-hover shadow-cta">
              <Link to="/crear">
                Crear mi tienda <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#precios">Ver precios</a>
            </Button>
          </div>
          <ul className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "No es una página en blanco",
              "Catálogo y estructura ya preparados",
              "Tu identidad aplicada a la tienda",
              "Tú vendes; Datable conecta la operación",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Qué es un activo digital productivo ---------- */

const ACTIVO_RECEIVES = [
  "Una tienda digital ya estructurada.",
  "Un catálogo de productos disponibles.",
  "Una estructura comercial preparada para vender.",
  "Personalización dentro de las opciones disponibles.",
  "Tu identidad aplicada a la tienda.",
  "Herramientas para administrar tu tienda y tus ventas.",
  "Una operación conectada para que tus pedidos lleguen a tus clientes sin que tengas que encargarte de la logística.",
];

const ACTIVO_WORKFLOW = [
  "Eliges un activo disponible.",
  "Lo personalizas dentro de las opciones disponibles.",
  "Haz que tu tienda lleve tu identidad.",
  "Tienes productos preparados para vender.",
  "Defines tu margen dentro de las opciones disponibles.",
  "Publicas y vendes.",
  "Datable coordina la operación necesaria para que el pedido llegue hasta tu cliente.",
];

function QueEsActivo() {
  return (
    <section id="que-es-activo" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <SectionHeader
          eyebrow="Una estructura lista para comenzar"
          title="Datable no te da una página en blanco."
          desc="Te entrega una estructura comercial ya preparada que puedes personalizar dentro de sus opciones."
        />

        <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">¿Qué recibes?</h3>
            <ul className="mt-5 space-y-3">
              {ACTIVO_RECEIVES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">¿Cómo funciona?</h3>
            <ol className="mt-5 space-y-3">
              {ACTIVO_WORKFLOW.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-action" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-8">
          <h3 className="font-display text-xl font-bold text-foreground">¿Qué es un activo digital productivo?</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Es una estructura digital que ya tiene organizado lo necesario para cumplir una función
            comercial. En la etapa actual, ese activo es una tienda digital preparada para vender
            productos personalizados: no tienes que construir desde cero el catálogo, la estructura
            comercial, la tecnología ni la operación. Recibes una estructura preparada y la haces tuya
            dentro de las opciones disponibles.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Para quién ---------- */

function ParaQuien() {
  const items = [
    "Quieres empezar a vender sin construir toda la infraestructura digital desde cero.",
    "No quieres encargarte de la parte técnica ni de la logística.",
    "Prefieres partir de una estructura que ya funciona y hacerla tuya.",
    "Quieres administrar tus ventas desde un solo lugar.",
  ];
  return (
    <section id="para-quien" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Para quién es"
          title="Para ti, que quieres vender — no construirlo todo."
          desc="Datable es para quien quiere comenzar con una estructura comercial ya preparada y concentrarse en vender."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <li
              key={it}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card p-5 text-sm text-foreground shadow-soft"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Datable está construyendo un ecosistema de activos y capacidades conectadas. Lo que puedes
          usar hoy es la tienda digital de productos personalizados.
        </p>
      </div>
    </section>
  );
}

/* ---------- Precios ---------- */

function Precios() {
  const plans = [
    {
      name: "Sin plan",
      price: "$0",
      commission: "20%",
      desc: "Publica tu tienda sin mensualidad. Datable cobra 20% por venta.",
      features: [
        "1 tienda publicada",
        "Cobros en línea activos",
        "Panel de pedidos",
        "Vista previa privada mientras la armas",
      ],
      cta: "Empezar sin plan",
      featured: false,
    },
    {
      name: "Starter",
      price: "$299",
      commission: "10%",
      desc: "Baja la comisión a la mitad.",
      features: [
        "1 tienda publicada",
        "10% de comisión por venta",
        "Cobros en línea activos",
        "Panel de pedidos",
        "Cancela cuando quieras",
      ],
      cta: "Activar Starter",
      featured: false,
    },
    {
      name: "Pro",
      price: "$499",
      commission: "10%",
      desc: "Varias tiendas y soporte prioritario.",
      features: [
        "Tiendas ilimitadas",
        "Todo lo de Starter",
        "Soporte prioritario",
      ],
      cta: "Quiero Pro",
      featured: true,
    },
  ];
  return (
    <section id="precios" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow="Precios"
          title="Publica sin mensualidad o paga menos comisión."
          desc="Sin plan: 20% por venta. Con plan: 10% por venta."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={
                "relative rounded-3xl border p-7 transition-all " +
                (p.featured
                  ? "border-primary bg-linear-to-br from-primary to-action text-primary-foreground shadow-pop"
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

/* ---------- FAQ ---------- */

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
          {HOME_FAQS.map((f, i) => {
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
          Crea tu tienda con Datable.
        </h2>
        <p className="mt-4 text-base opacity-90 md:text-lg">
          Recibe una estructura comercial preparada. Personalízala. Véndela.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="shine-on-hover">
            <Link to="/crear">
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
              Activos digitales productivos: estructuras comerciales preparadas para vender. Hecho con ♥ en México.
            </p>
          </div>
          <FooterCol
            title="Producto"
            links={[
              { label: "Qué es", href: "#que-es-activo" },
              { label: "Activos disponibles", href: "#plantillas" },
              { label: "Precios", href: "#precios" },
              { label: "Para quién", href: "#para-quien" },
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
        <QueEsActivo />
        <ParaQuien />
        <Precios />
        <FAQ />
        <CTAFinal />
      </main>
      <Footer />
    </div>
  );
}
