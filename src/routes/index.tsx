import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const HOME_URL = "https://store-sculpt-go.lovable.app/";
const HOME_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7a5cde6c-c205-4518-a846-8c583529d0db/id-preview-cf54571e--6109d9a1-8043-4081-8fd7-c0751533960a.lovable.app-1782854219214.png";
const HOME_TITLE = "DªTªBLe — Crea y vende tus productos personalizados";
const HOME_DESC = "Diseña tus productos, ponles tu precio y publícalos en tu propia tienda online en minutos. Nosotros producimos y enviamos cada pedido a tu cliente.";

const HOME_FAQS_STATIC = [
  {
    q: "¿Qué puedo hacer con Datable?",
    a: "Eliges un producto del catálogo, subes tu diseño, ves cómo queda en las maquetas, defines tu precio y lo publicas en tu tienda online con enlace propio para empezar a vender.",
  },
  {
    q: "¿Necesito comprar inventario?",
    a: "No. Cada producto se fabrica cuando alguien te lo compra, así que no inviertes en inventario ni te quedas con producto sin vender.",
  },
  {
    q: "¿Quién produce y envía los pedidos?",
    a: "Datable coordina la producción y el envío de cada pedido hasta tu cliente. Tú te concentras en diseñar y vender.",
  },
  {
    q: "¿Necesito saber programar o diseñar?",
    a: "No. El editor te guía paso a paso: producto, diseño, maquetas, información, precio y publicar. Tu tienda queda lista sin escribir una línea de código.",
  },
  {
    q: "¿Yo decido el precio y mi ganancia?",
    a: "Sí. Al fijar tu precio de venta ves el costo de producción y envío y tu ganancia por venta antes de publicar.",
  },
  {
    q: "¿Cuánto se queda DªTªBLe de cada venta?",
    a: "20% de tu ganancia si vendes en la modalidad gratuita y 0% si activas Pro por $499 MXN al mes. El resto es tuyo.",
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
          mainEntity: HOME_FAQS_STATIC.map((f) => ({
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
  const t = useT();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">{t("Cómo funciona", "How it works")}</a>
          <a href="#para-quien" className="hover:text-foreground">{t("Para quién", "Who it's for")}</a>
          <a href="#precios" className="hover:text-foreground">{t("Precios", "Pricing")}</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">{t("Entrar", "Log in")}</Link>
          </Button>
          <Button asChild size="sm" className="shine-on-hover">
            <Link to="/crear">
              {t("Crear mi tienda", "Create my store")} <ArrowRight className="ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  const t = useT();
  const bullets = [
    t("Sin comprar inventario", "No inventory to buy"),
    t("Diseña y ve tus maquetas al instante", "Design and preview your mockups instantly"),
    t("Tú pones el precio y ves tu ganancia", "You set the price and see your profit"),
    t("Nosotros producimos y enviamos", "We produce and ship"),
  ];
  return (
    <section className="hero-surface relative overflow-hidden">
      <div className="grid-noise absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div>
          <Badge className="mb-5 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" /> {t("Tu tienda de productos personalizados", "Your custom-product store")}
          </Badge>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t("Diseña tus productos y", "Design your products and")}{" "}
            <span className="bg-linear-to-r from-primary to-action bg-clip-text text-transparent">
              {t("véndelos en tu propia tienda", "sell them in your own store")}
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            {t(
              "Elige un producto, sube tu diseño, ponle precio y publícalo. Tu tienda queda en línea con enlace propio y nosotros producimos y enviamos cada pedido a tu cliente.",
              "Pick a product, upload your design, set your price and publish. Your store goes live with its own link, and we produce and ship every order to your customer."
            )}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shine-on-hover shadow-cta">
              <Link to="/crear">
                {t("Crear mi tienda", "Create my store")} <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#precios">{t("Ver precios", "See pricing")}</a>
            </Button>
          </div>
          <ul className="mt-7 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {bullets.map((f) => (
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

/* ---------- Cómo funciona ---------- */

function QueEsActivo() {
  const t = useT();
  const receives = [
    t("Un catálogo de productos listos para personalizar.", "A catalog of products ready to customize."),
    t("Un editor para subir tu diseño y colocarlo en el producto.", "An editor to upload your design and place it on the product."),
    t("Maquetas realistas para ver cómo queda antes de publicar.", "Realistic mockups to see the result before publishing."),
    t("Tu tienda online con enlace propio y tu estilo visual.", "Your online store with its own link and your visual style."),
    t("Precio y ganancia calculados por producto.", "Price and profit calculated per product."),
    t("Cobro a tus clientes y panel para seguir tus ventas.", "Customer checkout and a panel to track your sales."),
    t(
      "Producción y envío coordinados por Datable hasta la puerta de tu cliente.",
      "Production and shipping coordinated by Datable all the way to your customer's door."
    ),
  ];
  const workflow = [
    t("ELIGE QUÉ QUIERES VENDER.", "CHOOSE WHAT YOU WANT TO SELL."),
    t("SUBE TU DISEÑO Y COLÓCALO EN EL PRODUCTO.", "UPLOAD YOUR DESIGN AND PLACE IT ON THE PRODUCT."),
    t("REVISA TUS MAQUETAS.", "REVIEW YOUR MOCKUPS."),
    t("ESCRIBE EL TÍTULO Y LA DESCRIPCIÓN.", "WRITE THE TITLE AND DESCRIPTION."),
    t("DECIDE TU PRECIO Y VE TU GANANCIA.", "SET YOUR PRICE AND SEE YOUR PROFIT."),
    t(
      "PUBLICA EN TU TIENDA Y NOSOTROS PRODUCIMOS Y ENVIAMOS CADA PEDIDO.",
      "PUBLISH TO YOUR STORE AND WE PRODUCE AND SHIP EVERY ORDER."
    ),
  ];
  return (
    <section id="como-funciona" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <SectionHeader
          eyebrow={t("De la idea a la venta", "From idea to sale")}
          title={t("Tu tienda lista en la misma sesión.", "Your store ready in one sitting.")}
          desc={t(
            "Un solo recorrido: producto, diseño, maquetas, información, precio y publicar.",
            "One single flow: product, design, mockups, details, price and publish."
          )}
        />

        <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">{t("¿Qué incluye?", "What's included?")}</h3>
            <ul className="mt-5 space-y-3">
              {receives.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">{t("¿Cómo funciona?", "How does it work?")}</h3>
            <ol className="mt-5 space-y-3">
              {workflow.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-action" />
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-12 border-t border-border/60 pt-8">
          <h3 className="font-display text-xl font-bold text-foreground">{t("¿Y el inventario?", "What about inventory?")}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "No necesitas comprarlo. Cada producto se fabrica hasta que alguien te lo compra: tu cliente paga en tu tienda, Datable coordina la producción y el envío, y tú te quedas con tu ganancia. Sin bodega, sin mínimos de compra y sin producto sin vender.",
              "You don't need to buy it. Each product is made only after someone buys it: your customer pays in your store, Datable coordinates production and shipping, and you keep your profit. No warehouse, no minimum orders and no unsold stock."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}


/* ---------- Para quién ---------- */

function ParaQuien() {
  const t = useT();
  const items = [
    t("TIENES UN DISEÑO, UNA MARCA O UNA COMUNIDAD Y QUIERES VENDERLE PRODUCTOS.", "YOU HAVE A DESIGN, A BRAND OR A COMMUNITY AND WANT TO SELL THEM PRODUCTS."),
    t("QUIERES EMPEZAR SIN COMPRAR INVENTARIO NI INVERTIR DE MÁS.", "YOU WANT TO START WITHOUT BUYING INVENTORY OR OVER-INVESTING."),
    t(
      "QUIERES VENDER SIN OCUPARTE DE LA PRODUCCIÓN, EL ENVÍO NI LA PARTE TÉCNICA.",
      "YOU WANT TO SELL WITHOUT HANDLING PRODUCTION, SHIPPING OR THE TECHNICAL SIDE."
    ),
    t("QUIERES ADMINISTRAR TUS PRODUCTOS Y TUS VENTAS DESDE UN SOLO LUGAR.", "YOU WANT TO MANAGE YOUR PRODUCTS AND SALES FROM ONE PLACE."),
  ];
  return (
    <section id="para-quien" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow={t("PARA QUIÉN ES", "WHO IT'S FOR")}
          title={t("PARA TI, QUE QUIERES VENDER TUS PRODUCTOS SIN COMPLICARTE.", "FOR YOU, WHO WANTS TO SELL YOUR PRODUCTS WITHOUT THE HASSLE.")}
          desc={t(
            "Tú pones el diseño y el precio. Datable pone la tienda, la producción y el envío.",
            "You bring the design and the price. Datable brings the store, the production and the shipping."
          )}
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
      </div>
    </section>
  );
}

/* ---------- Precios ---------- */

function Precios() {
  const t = useT();
  const plans = [
    {
      name: t("GRATIS", "FREE"),
      price: "$0",
      commission: t("20% de comisión sobre tu ganancia.", "20% commission on your profit."),
      cta: t("Empezar gratis", "Start for free"),
      featured: false,
    },
    {
      name: "PRO",
      price: "$499",
      commission: t("0% de comisión por venta.", "0% commission per sale."),
      cta: t("Activar Pro", "Activate Pro"),
      featured: true,
    },
  ];
  return (
    <section id="precios" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow={t("Precios", "Pricing")}
          title={t("EMPIEZA CON DATABLE SIN ARRIESGAR TU CAPITAL.", "START WITH DATABLE WITHOUT RISKING YOUR CAPITAL.")}
          desc={t(
            "Empieza a vender sin pagar mensualidad ni invertir dinero para poner tu tienda en marcha.",
            "Start selling without paying a monthly fee or investing money to launch your store."
          )}
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-4 text-center">
          <p className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {t("Tú vendes. Nosotros crecemos contigo.", "You sell. We grow with you.")}
          </p>
          <p className="text-base text-muted-foreground">
            {t("Mientras utilizas esta modalidad, Datable recibe el 20% de tu ganancia (nunca de tus costos).", "While using this mode, Datable takes 20% of your profit, never of your costs.")}
          </p>
          <p className="text-base text-muted-foreground">
            {t(
              "Cuando quieras conservar el 100% de tus ventas, puedes pasar a una mensualidad de $499 MXN y dejar de pagar comisión por venta.",
              "When you want to keep 100% of your sales, you can switch to a $499 MXN monthly plan and stop paying a commission per sale."
            )}
          </p>
          <p className="font-display text-lg font-semibold text-foreground">
            {t("Empieza hoy. Vende primero. Decide después.", "Start today. Sell first. Decide later.")}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
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
                  {t("Más elegido", "Most popular")}
                </span>
              )}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold">{p.price}</span>
                <span className={p.featured ? "opacity-80" : "text-muted-foreground"}>
                  MXN / {t("mes", "mo")}
                </span>
              </div>
              <p className={"mt-5 text-sm " + (p.featured ? "opacity-80" : "text-muted-foreground")}>
                {p.commission}
              </p>
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

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          {t(
            "*La modalidad de $499 MXN al mes elimina la comisión del 20% sobre tu ganancia. Puedes elegir la modalidad que más te convenga.",
            "*The $499 MXN monthly mode removes the 20% commission on your profit. You can choose whichever mode suits you best."
          )}
        </p>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function FAQ() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    {
      q: t("¿Qué puedo hacer con Datable?", "What can I do with Datable?"),
      a: t(
        "Eliges un producto del catálogo, subes tu diseño, ves cómo queda en las maquetas, defines tu precio y lo publicas en tu tienda online con enlace propio para empezar a vender.",
        "You pick a product from the catalog, upload your design, preview it on mockups, set your price and publish it in your own online store with its own link, ready to sell."
      ),
    },
    {
      q: t("¿Necesito comprar inventario?", "Do I need to buy inventory?"),
      a: t(
        "No. Cada producto se fabrica cuando alguien te lo compra, así que no inviertes en inventario ni te quedas con producto sin vender.",
        "No. Each product is made once someone buys it, so you don't invest in inventory or get stuck with unsold stock."
      ),
    },
    {
      q: t("¿Quién produce y envía los pedidos?", "Who produces and ships the orders?"),
      a: t(
        "Datable coordina la producción y el envío de cada pedido hasta tu cliente. Tú te concentras en diseñar y vender.",
        "Datable coordinates production and shipping of every order to your customer. You focus on designing and selling."
      ),
    },
    {
      q: t("¿Necesito saber programar o diseñar?", "Do I need to know how to code or design?"),
      a: t(
        "No. El editor te guía paso a paso: producto, diseño, maquetas, información, precio y publicar. Tu tienda queda lista sin escribir una línea de código.",
        "No. The editor guides you step by step: product, design, mockups, details, price and publish. Your store is ready without writing a line of code."
      ),
    },
    {
      q: t("¿Yo decido el precio y mi ganancia?", "Do I decide the price and my profit?"),
      a: t(
        "Sí. Al fijar tu precio de venta ves el costo de producción y envío y tu ganancia por venta antes de publicar.",
        "Yes. When you set your selling price you see the production and shipping cost and your profit per sale before publishing."
      ),
    },
    {
      q: t("¿Cuánto se queda DªTªBLe de cada venta?", "How much does DªTªBLe keep from each sale?"),
      a: t(
        "20% de tu ganancia si vendes en la modalidad gratuita y 0% si activas Pro por $499 MXN al mes. El resto es tuyo.",
        "20% of your profit on the free mode and 0% if you activate Pro for $499 MXN per month. The rest is yours."
      ),
    },

    {
      q: t("¿Puedo cancelar cuando quiera?", "Can I cancel anytime?"),
      a: t(
        "Sí, sin penalización. Tu tienda se mantiene en pausa por 30 días por si quieres volver.",
        "Yes, with no penalty. Your store stays paused for 30 days in case you want to come back."
      ),
    },
  ];
  return (
    <section id="faq" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
        <SectionHeader
          eyebrow={t("Preguntas frecuentes", "Frequently asked questions")}
          title={t("Lo que todos preguntan.", "What everyone asks.")}
          desc=""
        />
        <div className="mt-10 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {faqs.map((f, i) => {
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
  const t = useT();
  return (
    <section id="cta" className="relative overflow-hidden border-t border-border/60 bg-primary text-primary-foreground">
      <div className="grid-noise absolute inset-0 opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
        <Sparkles className="mx-auto mb-5 size-7" />
        <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">
          {t("Crea tu tienda con Datable.", "Create your store with Datable.")}
        </h2>
        <p className="mt-4 text-base opacity-90 md:text-lg">
          {t("Sube tu diseño, ponle precio y publica. Nosotros producimos y enviamos.", "Upload your design, set your price and publish. We produce and ship.")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="shine-on-hover">
            <Link to="/crear">
              {t("Crear mi tienda", "Create my store")} <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href="#precios">{t("Ver precios", "See pricing")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {t(
                "Crea y vende tus productos personalizados en tu propia tienda online. Hecho con ♥ en México.",
                "Create and sell your custom products in your own online store. Made with ♥ in Mexico."

              )}
            </p>
          </div>
          <FooterCol
            title={t("Producto", "Product")}
            links={[
              { label: t("Cómo funciona", "How it works"), href: "#como-funciona" },
              { label: t("Precios", "Pricing"), href: "#precios" },
              { label: t("Para quién", "Who it's for"), href: "#para-quien" },
            ]}
          />
          <FooterCol
            title={t("Empresa", "Company")}
            links={[
              { label: "FAQ", href: "#faq" },
              { label: t("Términos", "Terms"), href: "#" },
              { label: t("Privacidad", "Privacy"), href: "#" },
              { label: t("Contacto", "Contact"), href: "#" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} DªTªBLe. {t("Todos los derechos reservados.", "All rights reserved.")}</span>
          <span>{t("Hecho en México", "Made in Mexico")}</span>
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
