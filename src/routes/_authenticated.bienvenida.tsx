import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Store,
  Plug,
  Landmark,
  CreditCard,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/bienvenida")({
  head: () => ({
    meta: [
      { title: "Bienvenida — DªTªBLe" },
      {
        name: "description",
        content:
          "Tu mapa de lanzamiento en DªTªBLe: 5 pasos simples para pasar de vitrina a tienda vendiendo producto real en 24 a 48 horas.",
      },
    ],
  }),
  component: Bienvenida,
});

type Step = {
  n: number;
  icon: typeof Store;
  title: string;
  time: string;
  who: "tú" | "nosotros" | "juntos";
  desc: string;
  needs?: string[];
  cta?: { label: string; to: string };
};

const STEPS: Step[] = [
  {
    n: 1,
    icon: Sparkles,
    title: "Elige tu plan (o aplica un cupón demo)",
    time: "1 min",
    who: "tú",
    desc:
      "Starter o Pro. Si estás probando, aplica un folio demo y arrancas gratis por tiempo limitado.",
    cta: { label: "Ver planes", to: "/planes" },
  },
  {
    n: 2,
    icon: Store,
    title: "Arma tu vitrina — 4 ventanillas",
    time: "10 min",
    who: "tú",
    desc:
      "Rubro, kit, fachada y pagos. Al terminar, tu vitrina queda publicada hoy con productos demo o tarjetas de regalo digitales.",
    cta: { label: "Crear tienda", to: "/crear" },
  },
  {
    n: 3,
    icon: Plug,
    title: "Conecta tu cuenta con el proveedor",
    time: "10–20 min · asincrónico",
    who: "juntos",
    desc:
      "Para vender producto físico real necesitas cuenta con el proveedor bajo demanda (por ejemplo Printify). Te guiamos paso a paso; si ya la tienes, mejor.",
    needs: ["Correo del proveedor", "Confirmación por email"],
    cta: { label: "Ir a mi cuenta", to: "/cuenta" },
  },
  {
    n: 4,
    icon: Landmark,
    title: "Deja tus datos para recibir tus ventas",
    time: "3 min",
    who: "tú",
    desc:
      "CLABE de 18 dígitos, nombre del beneficiario y (opcional) RFC si quieres factura. Sin esto tu vitrina queda viva, pero no podemos depositarte.",
    needs: ["CLABE", "Beneficiario", "RFC opcional"],
    cta: { label: "Capturar datos bancarios", to: "/cuenta" },
  },
  {
    n: 5,
    icon: CreditCard,
    title: "Activamos tus pagos y verificamos",
    time: "24–48 h hábiles",
    who: "nosotros",
    desc:
      "Conectamos la pasarela, mapeamos productos reales del proveedor con precios y variantes, y hacemos una compra de prueba interna.",
  },
  {
    n: 6,
    icon: Rocket,
    title: "Tu tienda queda vendiendo producto real",
    time: "Al terminar el paso 5",
    who: "nosotros",
    desc:
      "Te avisamos por correo. A partir de ese momento cada venta se cobra, el proveedor produce y envía, y tu comisión aparece en el panel.",
    cta: { label: "Ir al panel", to: "/dashboard" },
  },
];

function whoBadge(who: Step["who"]) {
  const map = {
    tú: { label: "Tú", cls: "bg-primary text-primary-foreground" },
    nosotros: { label: "Nosotros", cls: "bg-secondary text-secondary-foreground" },
    juntos: { label: "Juntos", cls: "bg-accent text-accent-foreground" },
  } as const;
  const m = map[who];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function Bienvenida() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="font-display text-lg font-extrabold">
            DªTªBLe
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ir al panel →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        {/* Bienvenida corta */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="size-3.5" /> Bienvenida
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            Qué bueno tenerte. Vamos a lanzar tu tienda.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Este es tu mapa. Son <strong className="text-foreground">6 pasos cortos</strong>. Los que
            dicen <em>Tú</em> los haces en minutos; los que dicen <em>Nosotros</em> corren por
            nuestra cuenta. En 24 a 48 horas hábiles estás vendiendo producto real.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shine-on-hover shadow-cta">
              <Link to="/planes">
                Empezar por el paso 1 <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Saltar al panel</Link>
            </Button>
          </div>
        </section>

        {/* Mapa de ejecución */}
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Mapa de lanzamiento
              </div>
              <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
                De registro a primera venta real
              </h2>
            </div>
            <div className="hidden shrink-0 gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" /> Tú
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-accent" /> Juntos
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-secondary" /> Nosotros
              </span>
            </div>
          </div>

          <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-6 md:pl-8">
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                <span className="absolute -left-[34px] grid size-8 place-items-center rounded-full border-2 border-primary bg-background font-display text-sm font-extrabold text-primary md:-left-[42px]">
                  {s.n}
                </span>
                <div className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:shadow-pop md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                        <s.icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-bold leading-tight">
                          {s.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>⏱ {s.time}</span>
                          <span>·</span>
                          {whoBadge(s.who)}
                        </div>
                      </div>
                    </div>
                    {s.cta && (
                      <Button asChild size="sm" variant="secondary" className="shrink-0">
                        <Link to={s.cta.to}>
                          {s.cta.label} <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
                  {s.needs && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {s.needs.map((n) => (
                        <li
                          key={n}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground"
                        >
                          <CheckCircle2 className="size-3 text-primary" /> {n}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Cierre honesto */}
        <section className="mt-14 rounded-2xl border-2 border-primary/40 bg-primary-soft p-6 md:p-8">
          <h3 className="font-display text-xl font-bold">
            Un dato honesto antes de empezar
          </h3>
          <p className="mt-2 text-sm text-foreground/80 md:text-base">
            No prometemos "listo en 2 minutos". Tu <strong>vitrina</strong> sí — hoy, con productos
            demo o tarjetas de regalo digitales. Para vender producto físico real necesitamos que tú
            aportes correo, CLABE y — si quieres factura — RFC, y que autorices la conexión con el
            proveedor. Con eso en la mano, en 24 a 48 h hábiles tu tienda está vendiendo de verdad.
          </p>
        </section>
      </main>
    </div>
  );
}
