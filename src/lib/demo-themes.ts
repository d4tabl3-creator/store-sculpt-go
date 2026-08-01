/**
 * Temas de la tienda demo (marca blanca).
 * Cada tema sobreescribe los tokens semánticos dentro del contenedor /demo,
 * para mostrar que la tienda del cliente NO se ve como DªTªBLe.
 */
export type DemoTheme = {
  id: string;
  brand: string;
  tagline: string;
  initials: string;
  label: string;
  headingFont: string;
  bodyFont: string;
  radius: string;
  vars: Record<string, string>;
};

export const DEMO_THEMES: DemoTheme[] = [
  {
    id: "nordic",
    brand: "ATELIER NORTE",
    tagline: "Ropa básica de autor",
    initials: "AN",
    label: "Minimal",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    radius: "0.4rem",
    vars: {
      "--background": "oklch(0.98 0.004 90)",
      "--foreground": "oklch(0.18 0.01 260)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.18 0.01 260)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.18 0.01 260)",
      "--primary": "oklch(0.22 0.02 260)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--secondary": "oklch(0.93 0.01 90)",
      "--secondary-foreground": "oklch(0.22 0.02 260)",
      "--accent": "oklch(0.72 0.09 40)",
      "--accent-foreground": "oklch(0.16 0.01 40)",
      "--muted": "oklch(0.95 0.005 90)",
      "--muted-foreground": "oklch(0.48 0.01 260)",
      "--border": "oklch(0.18 0.01 260 / 14%)",
      "--input": "oklch(0.18 0.01 260 / 18%)",
      "--ring": "oklch(0.22 0.02 260)",
    },
  },
  {
    id: "street",
    brand: "BARRIO 88",
    tagline: "Streetwear mexicano",
    initials: "88",
    label: "Street",
    headingFont: '"Space Grotesk", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    radius: "0.9rem",
    vars: {
      "--background": "oklch(0.14 0.01 280)",
      "--foreground": "oklch(0.97 0.01 280)",
      "--card": "oklch(0.19 0.02 280)",
      "--card-foreground": "oklch(0.97 0.01 280)",
      "--popover": "oklch(0.19 0.02 280)",
      "--popover-foreground": "oklch(0.97 0.01 280)",
      "--primary": "oklch(0.72 0.2 20)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--secondary": "oklch(0.28 0.03 280)",
      "--secondary-foreground": "oklch(0.97 0.01 280)",
      "--accent": "oklch(0.8 0.16 190)",
      "--accent-foreground": "oklch(0.14 0.02 190)",
      "--muted": "oklch(0.22 0.02 280)",
      "--muted-foreground": "oklch(0.75 0.02 280)",
      "--border": "oklch(1 0 0 / 12%)",
      "--input": "oklch(1 0 0 / 16%)",
      "--ring": "oklch(0.72 0.2 20)",
    },
  },
  {
    id: "pastel",
    brand: "Casa Lila",
    tagline: "Regalos y hogar",
    initials: "CL",
    label: "Pastel",
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    radius: "1.6rem",
    vars: {
      "--background": "oklch(0.98 0.015 330)",
      "--foreground": "oklch(0.26 0.05 330)",
      "--card": "oklch(1 0.004 330)",
      "--card-foreground": "oklch(0.26 0.05 330)",
      "--popover": "oklch(1 0.004 330)",
      "--popover-foreground": "oklch(0.26 0.05 330)",
      "--primary": "oklch(0.6 0.16 340)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--secondary": "oklch(0.94 0.03 330)",
      "--secondary-foreground": "oklch(0.32 0.06 330)",
      "--accent": "oklch(0.82 0.11 200)",
      "--accent-foreground": "oklch(0.2 0.03 200)",
      "--muted": "oklch(0.96 0.02 330)",
      "--muted-foreground": "oklch(0.52 0.04 330)",
      "--border": "oklch(0.4 0.06 330 / 16%)",
      "--input": "oklch(0.4 0.06 330 / 20%)",
      "--ring": "oklch(0.6 0.16 340)",
    },
  },
];

export function themeStyle(t: DemoTheme): React.CSSProperties {
  return {
    ...(t.vars as unknown as React.CSSProperties),
    ["--radius" as string]: t.radius,
    ["--font-display" as string]: t.headingFont,
    ["--font-bubble" as string]: t.headingFont,
    ["--font-sans" as string]: t.bodyFont,
    fontFamily: t.bodyFont,
  } as React.CSSProperties;
}
