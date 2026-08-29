import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, Palette, ShoppingBag, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const ENTRY_URL = "https://store-sculpt-go.lovable.app/";
const ENTRY_TITLE = "DªTªBLe Stores — Diseña tu tienda y empieza a vender";
const ENTRY_DESC =
  "Entra o crea tu tienda: define su identidad y apariencia, elige y personaliza tus productos y publícala con enlace propio.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: ENTRY_TITLE },
      { name: "description", content: ENTRY_DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: ENTRY_TITLE },
      { property: "og:description", content: ENTRY_DESC },
      { property: "og:url", content: ENTRY_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ENTRY_TITLE },
      { name: "twitter:description", content: ENTRY_DESC },
    ],
    links: [{ rel: "canonical", href: ENTRY_URL }],
  }),
  component: EntryPage,
});

function Logo() {
  return (
    <span className="font-display text-2xl font-extrabold tracking-tight text-foreground" aria-label="DªTªBLe">
      D<span className="text-primary">ª</span>T<span className="text-primary">ª</span>BLe
    </span>
  );
}

function EntryPage() {
  const t = useT();

  const steps = [
    {
      icon: Palette,
      title: t("DISEÑA MI TIENDA", "DESIGN MY STORE"),
      desc: t("Nombre, logo, portada y estilo visual de tu tienda.", "Name, logo, cover and visual style of your store."),
    },
    {
      icon: Wand2,
      title: t("IDENTIDAD Y APARIENCIA", "IDENTITY & APPEARANCE"),
      desc: t("Ajusta colores, textos e información básica en minutos.", "Adjust colors, texts and basic info in minutes."),
    },
    {
      icon: ShoppingBag,
      title: t("CREAR / ELEGIR PRODUCTOS", "CREATE / CHOOSE PRODUCTS"),
      desc: t("Elige qué vender, sube tu diseño, pon precio y publica.", "Choose what to sell, upload your design, set a price and publish."),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo />
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">
              <LogIn className="mr-1 size-4" /> {t("Entrar", "Log in")}
            </Link>
          </Button>
        </div>
      </header>

      <main className="hero-surface relative overflow-hidden">
        <div className="grid-noise absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t("Diseña tu tienda y", "Design your store and")}{" "}
            <span className="bg-linear-to-r from-primary to-action bg-clip-text text-transparent">
              {t("empieza a vender", "start selling")}
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            {t(
              "Entra a tu cuenta o crea tu tienda ahora: identidad, apariencia y productos en un solo recorrido.",
              "Log in or create your store now: identity, appearance and products in a single flow.",
            )}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="shine-on-hover shadow-cta">
              <Link to="/crear">
                {t("Crear mi tienda", "Create my store")} <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">{t("Ya tengo cuenta — Entrar", "I already have an account — Log in")}</Link>
            </Button>
          </div>

          <ol className="mt-12 grid gap-4 text-left sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                <s.icon className="size-5 text-primary" />
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("Paso", "Step")} {i + 1}
                </div>
                <h2 className="mt-1 font-display text-base font-bold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/info" className="hover:text-foreground">
              {t("Cómo funciona", "How it works")}
            </Link>
            <Link to="/planes" className="hover:text-foreground">
              {t("Precios", "Pricing")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
