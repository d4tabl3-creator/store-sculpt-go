// Catálogo de rubros y kits pre-armados. Cada kit trae productos listos
// que se insertan en store_products al crear la tienda.

export type Kit = {
  id: string;
  name: string;
  tagline: string;
  margin: string;
  products: Array<{
    name: string;
    description: string;
    price_cents: number;
    image_url: string;
  }>;
};

export type Niche = {
  id: string;
  label: string;
  emoji: string;
  kits: Kit[];
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

export const NICHES: Niche[] = [
  {
    id: "moda",
    label: "Moda",
    emoji: "👗",
    kits: [
      {
        id: "moda-streetwear",
        name: "Streetwear Esencial",
        tagline: "4 básicos de calle que se venden solos",
        margin: "Margen 45–60%",
        products: [
          { name: "Hoodie Oversize Negro", description: "Sudadera unisex 100% algodón pesado.", price_cents: 89900, image_url: img("photo-1556821840-3a63f95609a7") },
          { name: "Tee Box Fit Crema", description: "Playera caída holgada premium.", price_cents: 39900, image_url: img("photo-1521572163474-6864f9cf17ab") },
          { name: "Cargo Pants Beige", description: "Pantalón cargo con bolsas amplias.", price_cents: 109900, image_url: img("photo-1542272604-787c3835535d") },
          { name: "Gorra Trucker Bordada", description: "Logo bordado, malla trasera.", price_cents: 29900, image_url: img("photo-1588850561407-ed78c282e89b") },
        ],
      },
    ],
  },
  {
    id: "belleza",
    label: "Belleza",
    emoji: "💄",
    kits: [
      {
        id: "belleza-skincare",
        name: "Skincare Coreano",
        tagline: "Rutina de 4 pasos lista para vender",
        margin: "Margen 55–70%",
        products: [
          { name: "Limpiador Facial Suave", description: "Espuma con extracto de arroz.", price_cents: 32900, image_url: img("photo-1556228720-195a672e8a03") },
          { name: "Tónico Hidratante", description: "Equilibra el pH, sin alcohol.", price_cents: 38900, image_url: img("photo-1571781926291-c477ebfd024b") },
          { name: "Sérum Vitamina C 10%", description: "Ilumina y unifica el tono.", price_cents: 54900, image_url: img("photo-1620916566398-39f1143ab7be") },
          { name: "Crema Hidratante Ligera", description: "Acabado matte, todo tipo de piel.", price_cents: 44900, image_url: img("photo-1556228453-efd6c1ff04f6") },
        ],
      },
    ],
  },
  {
    id: "hogar",
    label: "Hogar",
    emoji: "🏠",
    kits: [
      {
        id: "hogar-aroma",
        name: "Aromaterapia de Autor",
        tagline: "Velas y difusores artesanales",
        margin: "Margen 60–75%",
        products: [
          { name: "Vela Soya Vainilla", description: "Cera de soya, mecha de algodón. 200g.", price_cents: 34900, image_url: img("photo-1602874801006-e26c4c9c1c41") },
          { name: "Difusor de Caña Lavanda", description: "Aceite natural, 100ml, 4 semanas.", price_cents: 39900, image_url: img("photo-1602007174960-c8e6ef4f33ff") },
          { name: "Set Mini Velas x3", description: "Cítrico, eucalipto, sándalo.", price_cents: 29900, image_url: img("photo-1608571423902-eed4a5ad8108") },
          { name: "Quemador Cerámico", description: "Hecho a mano, terracota.", price_cents: 24900, image_url: img("photo-1530018607912-eff2daa1bac4") },
        ],
      },
    ],
  },
  {
    id: "comida",
    label: "Comida gourmet",
    emoji: "🍫",
    kits: [
      {
        id: "comida-cafe",
        name: "Café de Especialidad",
        tagline: "Tueste fresco para conocedores",
        margin: "Margen 40–55%",
        products: [
          { name: "Café Chiapas 250g", description: "Cuerpo medio, notas a chocolate.", price_cents: 22900, image_url: img("photo-1559056199-641a0ac8b55e") },
          { name: "Café Oaxaca 250g", description: "Acidez cítrica, postgusto floral.", price_cents: 24900, image_url: img("photo-1497935586351-b67a49e012bf") },
          { name: "Prensa Francesa 350ml", description: "Vidrio borosilicato + acero.", price_cents: 44900, image_url: img("photo-1517705008128-361805f42e86") },
          { name: "Set Cata 3 Orígenes", description: "Mini bolsas 100g cada una.", price_cents: 49900, image_url: img("photo-1495474472287-4d71bcdd2085") },
        ],
      },
    ],
  },
  {
    id: "mascotas",
    label: "Mascotas",
    emoji: "🐾",
    kits: [
      {
        id: "mascotas-perro",
        name: "Esenciales para Perro",
        tagline: "Lo que todo dueño compra el primer mes",
        margin: "Margen 50–65%",
        products: [
          { name: "Collar Ajustable Premium", description: "Nylon reforzado, hebilla metálica.", price_cents: 24900, image_url: img("photo-1601758228041-f3b2795255f1") },
          { name: "Cama Donut Antiestrés", description: "Felpa suave, lavable.", price_cents: 69900, image_url: img("photo-1601758124510-52d02ddb7cbd") },
          { name: "Snacks Naturales 200g", description: "Pollo deshidratado sin conservadores.", price_cents: 17900, image_url: img("photo-1568640347023-a616a30bc3bd") },
          { name: "Cepillo Anti-pelo", description: "Quita pelo muerto sin lastimar.", price_cents: 29900, image_url: img("photo-1583337130417-3346a1be7dee") },
        ],
      },
    ],
  },
  {
    id: "wellness",
    label: "Wellness",
    emoji: "🧘",
    kits: [
      {
        id: "wellness-yoga",
        name: "Yoga & Mindfulness",
        tagline: "Kit completo para empezar a practicar",
        margin: "Margen 50–65%",
        products: [
          { name: "Tapete Yoga 6mm", description: "Antiderrapante, 183x61cm.", price_cents: 59900, image_url: img("photo-1545205597-3d9d02c29597") },
          { name: "Bloque Cork x2", description: "Corcho natural, ligero.", price_cents: 34900, image_url: img("photo-1518611012118-696072aa579a") },
          { name: "Banda Elástica Set", description: "3 niveles de resistencia.", price_cents: 27900, image_url: img("photo-1518310383802-640c2de311b2") },
          { name: "Botella Acero 750ml", description: "Doble pared, mantiene 12h frío.", price_cents: 32900, image_url: img("photo-1602143407151-7111542de6e8") },
        ],
      },
    ],
  },
];

export const THEMES = [
  { id: "berry", name: "Berry", primary: "#CF3790", description: "Rosa atrevido, fondo crema." },
  { id: "midnight", name: "Midnight", primary: "#6366F1", description: "Índigo elegante, fondo oscuro." },
  { id: "lima", name: "Lima Fresh", primary: "#10B981", description: "Verde vibrante, fondo blanco." },
];

export function findKit(kitId: string): { niche: Niche; kit: Kit } | null {
  for (const n of NICHES) {
    const k = n.kits.find((x) => x.id === kitId);
    if (k) return { niche: n, kit: k };
  }
  return null;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}
