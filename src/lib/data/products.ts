import type { Product, ProductVariant } from "@/types";
import { stockMap } from "./stock";

type ProductSeed = Omit<Product, "stock"> & {
  variants?: Omit<ProductVariant, "stock">[];
};

function applyStock(p: ProductSeed): Product {
  if (p.variants && p.variants.length > 0) {
    const variants: ProductVariant[] = p.variants.map((v) => ({
      ...v,
      stock: stockMap[`${p.id}::${v.id}`] ?? 0,
    }));
    const total = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    return { ...p, stock: total, variants };
  }
  return { ...p, stock: stockMap[p.id] ?? 0 };
}

const PLACEHOLDER_MAKEUP = [
  "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=80",
];
const PLACEHOLDER_SKINCARE = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=80",
];

// price = precio regular (tarjeta)
// compareAtPrice = precio "antes" inflado artificialmente (price × 1.14–1.26)
// precio efectivo = calculado en runtime via cashPrice(price) con cashDiscountPercent ≈ 16.67%

const productsRaw: ProductSeed[] = [
  // ─── MEJILLAS / ILUMINADOR ───────────────────────────────────────────────
  {
    id: "rare-beauty-highlighter-exhilarate",
    slug: "rare-beauty-highlighter-exhilarate",
    name: "Rare Beauty Positive Light Silky Touch Highlighter",
    brand: "Rare Beauty",
    shortDescription: "Iluminador en polvo champagne gold con acabado glass-skin.",
    description:
      "Un innovador iluminador en polvo que da a la piel un brillo instantáneo similar al de un vidrio para un brillo natural y fácil que dura. Hecho con microbrillantes perlas al 50% en una base semitransparente, este iluminador es más delicado de lo que parece. Ganador del premio Allure Best of Beauty.\n\nColor: Exhilarate - champagne gold\nTamaño: 0.098 oz / 2.8g",
    price: 106300,
    compareAtPrice: 126500,
    category: "mejillas-iluminador",
    tags: ["iluminador", "highlighter", "allure-best-of-beauty"],
    images: PLACEHOLDER_MAKEUP,
    featured: true,
  },
  {
    id: "dior-backstage-glow-maximizer",
    slug: "dior-backstage-glow-maximizer",
    name: "Dior Backstage Glow Maximizer Face Palette",
    brand: "Dior",
    shortDescription: "Paleta iluminadora multiusos en 4 tonos nacarado, metálico, purpurina y duochrome.",
    description:
      "Una paleta iluminadora multiuso, con polvos ultrafinos y nacarados en gel que aportan un brillo intenso al rostro, los ojos y el escote.\n\nEl Dior Backstage Glow Maximizer es el icónico iluminador multiusos y paleta de colorete. Cada paleta incluye cuatro tonos ultraradiantes de iluminador y colorete en acabados nacarado, metálico, purpurina y duochrome glow. El polvo ultrafino se mezcla perfectamente para conseguir un brillo personalizable y modulable.\n\nColor: 001 Universal Glow - essential highlighting shades\nTamaño: 0.4oz / 10g",
    price: 162600,
    compareAtPrice: 198400,
    category: "mejillas-iluminador",
    tags: ["iluminador", "paleta", "nacarado", "duochrome"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── MEJILLAS / BLUSH ────────────────────────────────────────────────────
  {
    id: "rare-beauty-mini-blush-happy",
    slug: "rare-beauty-mini-blush-happy",
    name: "Rare Beauty Mini Soft Pinch Liquid Blush",
    brand: "Rare Beauty",
    shortDescription: "Colorete líquido dewy pink de larga duración, hasta 12 horas.",
    description:
      "Colorete líquido ingrávido y duradero con hasta 12 horas de uso. Se difumina y se construye de forma maravillosa para conseguir un rubor suave y saludable en acabados mate o húmedos.\n\nEste colorete crea un rubor perfecto usando una fórmula ligera con pigmentos duraderos que duran todo el día. Disponible en acabados mate o húmedo, se mezcla de forma maravillosa para crear un color suave y modulable con un acabado natural de segunda piel. Ganador del premio Allure Best of Beauty.\n\nColor: Happy - dewy cool pink · Acabado radiante\nTamaño: 0.11 oz",
    price: 71500,
    compareAtPrice: 83700,
    category: "mejillas-blush",
    tags: ["blush", "líquido", "dewy", "allure-best-of-beauty"],
    images: PLACEHOLDER_MAKEUP,
    featured: true,
  },
  {
    id: "patrick-ta-blush-duo",
    slug: "patrick-ta-blush-duo",
    name: "Patrick Ta Mini Major Headlines Double-Take Crème & Powder Blush Duo",
    brand: "Patrick Ta",
    shortDescription: "Mini dúo de blush crema + polvo en tonos soft pink o mauve rose.",
    description:
      "Una versión mini del dúo viral de fórmulas de polvo y crema para conseguir un color audaz duradero que se funde con la piel y crea un brillo precioso.\n\nEste dúo de coloretes superventas está inspirado en la viral técnica de colorete crema sobre polvo de Patrick. Los pigmentos ricos se mezclan para lograr un acabado de piel que dura mucho y crea un brillo iluminado desde dentro.\n\n• Pigmentos biomiméticos patentados: Reflejan la estructura ceramida de la piel, asegurando adhesión, color verdadero y el acabado más natural\n• Pigmentos micronizados: Proporcionan un resultado uniforme e impecable, un acabado luminoso y un uso prolongado\n• Base Emoliente Cremosa: Se difumina perfectamente con la piel, proporciona un acabado húmedo y retiene el color\n\nTamaño: Crème 0.05 oz (1.6g) · Powder 0.09 oz (2.8g)",
    price: 95200,
    compareAtPrice: 118000,
    category: "mejillas-blush",
    tags: ["blush", "crema-polvo", "duo"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "shes-that-girl", name: "She's That Girl - soft pink" },
      { id: "she-goes-to-the-gym", name: "She Goes To The Gym - cool mauve rose" },
    ],
  },
  {
    id: "nyx-fat-cheeks-blush",
    slug: "nyx-fat-cheeks-blush",
    name: "NYX Fat Cheeks Juicy Plump Blush",
    brand: "NYX",
    shortDescription: "Rubor líquido ligero con acabado dewy y color jugoso modulable.",
    description:
      "El NYX Fat Cheeks Juicy Plump Blush es un rubor líquido de textura ligera que aporta un color jugoso, fresco y luminoso a las mejillas. Está diseñado para dar un acabado dewy (brillante natural) mientras hidrata la piel y se difumina fácilmente.\n\n• Textura líquida ligera y fácil de difuminar\n• Acabado jugoso y luminoso (dewy glow)\n• Color modulable: de suave a más intenso\n• Hidratación de la piel durante el uso\n• Fórmula con efecto piel fresca y saludable\n• Aplicador práctico para aplicación directa\n\nTamaño: 8mL",
    price: 40000,
    compareAtPrice: 47200,
    category: "mejillas-blush",
    tags: ["blush", "líquido", "dewy"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "peach-plunge", name: "Peach Plunge" },
      { id: "guava-gush", name: "Guava Gush" },
    ],
  },
  {
    id: "rare-beauty-soft-pinch-matte-bouncy-blush",
    slug: "rare-beauty-soft-pinch-matte-bouncy-blush",
    name: "Rare Beauty Soft Pinch Matte Bouncy Blush",
    brand: "Rare Beauty",
    shortDescription: "Rubor bouncy crema a polvo con acabado mate difuminado, tono Divine.",
    description:
      "El Soft Pinch Matte Bouncy Blush de Rare Beauty es un rubor con textura innovadora tipo bouncy (elástica/cremosa) que se transforma en acabado mate suave al difuminarse. Está diseñado para dar un color intenso pero natural en las mejillas, con un efecto de piel difuminada y saludable.\n\n• Textura bouncy (crema a polvo): suave y fácil de aplicar\n• Acabado mate difuminado tipo blurred skin\n• Color modulable: se puede intensificar por capas\n• Larga duración y resistencia al sudor y humedad\n• Fórmula ligera que no marca textura ni poros\n• Enriquecido con ingredientes hidratantes como aceites y cacao seed\n• Apto para piel sensible y no comedogénico\n\nColor: Divine\nTamaño: 6.4g",
    price: 102600,
    compareAtPrice: 123100,
    category: "mejillas-blush",
    tags: ["blush", "matte", "bouncy"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── MEJILLAS / CONTORNO ─────────────────────────────────────────────────
  {
    id: "patrick-ta-contour-bronzer-duo",
    slug: "patrick-ta-contour-bronzer-duo",
    name: "Patrick Ta Major Sculpt Crème Contour & Powder Bronzer Duo",
    brand: "Patrick Ta",
    shortDescription: "Dúo contorno crema + bronzeador polvo para un esculpido natural.",
    description:
      "Un dúo de contorno crema y bronceador en polvo que define, da forma y añade dimensiones a tu tez para lograr un aspecto natural, sin costuras y esculpido. Dos tonos complementarios en una paleta de contorno fácil de usar, formulados para combinar y lograr la escultura perfecta y bañada por el sol.\n\nPrimero, aplicá el contorno en crema de forma fluida sobre la piel para crear dimensiones. Terminá aplicando capas sobre el polvo bronceador sin talco para un acabado natural y bonito. Ganador del premio Allure Best of Beauty.\n\nColor: She's Sculpted - medium with warm bronzer and cool contour\nTamaño: 0.24 oz crème / 0.23 oz powder (6.8g crème / 9g powder)",
    price: 157700,
    compareAtPrice: 181400,
    category: "mejillas-contorno",
    tags: ["contorno", "bronzeador", "esculpido", "allure-best-of-beauty"],
    images: PLACEHOLDER_MAKEUP,
    featured: true,
  },
  {
    id: "makeup-bymario-mini-softsculpt-stick",
    slug: "makeup-bymario-mini-softsculpt-stick",
    name: "Makeup By Mario Mini SoftSculpt® Shaping Stick",
    brand: "Makeup By Mario",
    shortDescription: "Mini stick de contorno en crema mate, tono Medium para pieles claras-medias.",
    description:
      "Un mini stick de contorno en crema que crea un look suave y sin esfuerzo. Esta fórmula cremosa y no comedogénica se adapta a todo tipo de piel, reuniendo la técnica SoftSculpt® de Mario en un solo producto que ofrece una cobertura difuminable y modulable con un acabado mate natural. Los tonos complementan todas las tez, independientemente de los subtonos, y nunca son anaranjados ni apagados.\n\nColor: (Mini) Medium - natural matte finish for light-medium to medium skin tones (warm golden)\nTamaño: 0.14 oz / 4g",
    price: 62200,
    compareAtPrice: 78400,
    category: "mejillas-contorno",
    tags: ["contorno", "stick", "crema", "matte"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── MEJILLAS / BASE ─────────────────────────────────────────────────────
  {
    id: "elf-halo-glow-liquid-filter",
    slug: "elf-halo-glow-liquid-filter",
    name: "e.l.f. Halo Glow Liquid Filter",
    brand: "e.l.f.",
    shortDescription: "Glow booster líquido efecto piel-filtro, hidratante con squalane e hialurónico.",
    description:
      "El e.l.f. Halo Glow Liquid Filter es un producto multifuncional tipo glow booster que le da a la piel un efecto luminoso suave y radiante, como si fuera un filtro de redes sociales en la vida real. Su textura líquida ligera deja la piel con acabado jugoso y saludable, se puede usar solo, debajo o mezclado con base de maquillaje.\n\n• Efecto piel filtro: luminosidad suave y natural\n• Textura líquida ligera y fácil de difuminar\n• Acabado glow (brillante saludable, no glitter)\n• Uso versátil: solo, con base, mezclado o como iluminador\n• Hidrata la piel con ingredientes como squalane y ácido hialurónico\n• No es base de cobertura, es un potenciador de luminosidad\n• Apto para distintos tipos de piel",
    price: 61900,
    compareAtPrice: 74900,
    category: "mejillas-base",
    tags: ["glow", "luminoso", "primer", "hialurónico"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "tono-2-fair-light", name: "Tono 2 Fair/Light" },
      { id: "tono-05-fair", name: "Tono 0.5 Fair" },
      { id: "tono-35-medium", name: "Tono 3.5 Medium" },
    ],
  },

  // ─── ROSTRO / POLVOS ─────────────────────────────────────────────────────
  {
    id: "laura-mercier-setting-powder",
    slug: "laura-mercier-setting-powder",
    name: "Laura Mercier Mini Translucent Loose Longwear Setting Powder",
    brand: "Laura Mercier",
    shortDescription: "Polvo suelto fijador traslúcido, control de brillo 24 hs.",
    description:
      "Un mini polvo ligero, fácil de aplicar, suelto, que se difumina sin esfuerzo para fijar el maquillaje hasta 16 horas de uso y tiene un control del brillo las 24 horas, ideal para piel grasa o normal.\n\nEste mini polvo fijador refuerza el maquillaje para un uso prolongado, sin añadir peso ni textura. Crea un acabado moderno y mate con un toque de cobertura transparente, mientras absorbe el aceite y reduce el brillo durante todo el día. Sin flashback en las fotos.\n\nColor: Translucent · Acabado: Matte\nTamaño: 0.33 oz / 9.3g",
    price: 111100,
    compareAtPrice: 128900,
    category: "rostro-polvos",
    tags: ["polvo-fijador", "matte", "traslúcido", "anti-brillo"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "huda-beauty-mini-easy-bake-powder",
    slug: "huda-beauty-mini-easy-bake-powder",
    name: "Huda Beauty Mini Easy Bake Loose Baking & Setting Powder",
    brand: "Huda Beauty",
    shortDescription: "Polvo suelto fijador y baking ligeramente pigmentado, 18 hs de duración.",
    description:
      "Un polvo fijador ligeramente pigmentado y ultrailuminador que hornea y fija, difumina las líneas finas y los poros, y fija el maquillaje durante 18 horas con un acabado con aerógrafo. La fórmula, de larga duración, no comedogénica y sin flashbacks se integra perfectamente con la piel con un acabado mate para controlar el brillo y mantener el maquillaje en su sitio durante todo el día. El polvo enriquecido con vitamina E correcciona sutilmente el color, ilumina y ilumina los contornos del rostro, dejando un velo translúcido de color en la piel. Mini Easy Bake Loose tiene un tamiz removible y un nuevo aplicador mini esponja.\n\nTamaño: 0.21 oz / 6g",
    price: 87900,
    compareAtPrice: 108100,
    category: "rostro-polvos",
    tags: ["polvo-fijador", "baking", "vitamina-e"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      {
        id: "banana-bread",
        name: "Banana Bread - light, medium and tan skin tones (golden undertones)",
      },
      {
        id: "cherry-blossom",
        name: "Cherry Blossom - sheer soft pink (brighten under-eye darkness)",
      },
    ],
  },

  // ─── ROSTRO / SETTING SPRAY ──────────────────────────────────────────────
  {
    id: "one-size-on-til-dawn-setting-spray",
    slug: "one-size-on-til-dawn-setting-spray",
    name: "ONE/SIZE by Patrick Starrr On 'Til Dawn Mattifying Waterproof Setting Spray",
    brand: "ONE/SIZE",
    shortDescription: "Spray fijador mate e impermeable de 16 hs, con extracto de té verde.",
    description:
      "Un spray con un acabado mate impermeable de 16 horas en una fórmula a prueba de transferencia, extracto de té verde y hamamelis absorbente de aceite. Conocé al bestseller viral: este spray fijador ultraligero y matificante ofrece una fórmula no pegajosa, impermeable, resistente al sudor y a prueba de manchas. La fórmula no comedogénica y probada por dermatólogos no obstruirá los poros, mientras que una película polimérica fina y transpirable difumina el maquillaje para una resistencia de siguiente nivel hasta 16 horas.\n\nAcabado: Matte\nTamaño: 3.4 oz / 143mL",
    price: 131700,
    compareAtPrice: 156700,
    category: "rostro-setting-spray",
    tags: ["setting-spray", "matte", "impermeable"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "loreal-infallible-3second-setting-mist",
    slug: "loreal-infallible-3second-setting-mist",
    name: "L'Oréal Infallible 3-Second Setting Mist",
    brand: "L'Oréal",
    shortDescription: "Spray fijador aerosol de bruma ultra fina, fijación hasta 36 hs.",
    description:
      "El Infallible 3 Second Setting Mist de L'Oréal es un spray fijador de maquillaje en formato aerosol que crea una bruma ultrafina para sellar el maquillaje en solo 3 segundos, prolongando su duración durante todo el día.\n\n• Fijación de larga duración (hasta 36 h)\n• Secado en 3 segundos\n• Resistente al sudor, calor y agua\n• Efecto transfer-proof (no mancha ropa ni celular)\n• Bruma microfina para aplicación uniforme\n• No deja gotas, marcas ni sensación pegajosa\n• Acabado natural y ligero sobre la piel\n\nTamaño: 111g / 3.9oz",
    price: 51500,
    compareAtPrice: 58700,
    category: "rostro-setting-spray",
    tags: ["setting-spray", "aerosol", "transfer-proof"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "elf-matte-magic-mist-set",
    slug: "elf-matte-magic-mist-set",
    name: "e.l.f. Matte Magic Mist & Set",
    brand: "e.l.f.",
    shortDescription: "Spray fijador mate con vitaminas B y E, fórmula vegana y cruelty free.",
    description:
      "Fijá tu maquillaje y controlá el brillo con este spray de acabado mate. Su fórmula ligera ayuda a prolongar la duración del makeup mientras deja la piel fresca, suave y sin efecto grasoso.\n\n• Fijación duradera: mantiene el maquillaje en su lugar por más tiempo\n• Acabado mate: controla el brillo y la oleosidad\n• Fórmula ligera y transparente\n• Con vitaminas B y E: hidratan y suavizan la piel\n• Refresca el maquillaje durante el día\n• Apto para todo tipo de piel\n• Producto vegano y cruelty free\n\nTamaño: 60mL",
    price: 32600,
    compareAtPrice: 39800,
    category: "rostro-setting-spray",
    tags: ["setting-spray", "matte", "vegano"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── OJOS / PALETAS ──────────────────────────────────────────────────────
  {
    id: "huda-beauty-icy-nude-palette",
    slug: "huda-beauty-icy-nude-palette",
    name: "Huda Beauty Icy Nude Eyeshadow Palette",
    brand: "Huda Beauty",
    shortDescription: "Paleta de 18 sombras ultrapigmentadas con texturas icónicas.",
    description:
      "Una paleta de ojos con 18 tonos de sombras ultrapigmentadas y texturas innovadoras para un look increíblemente seguro.\n\nLa paleta incluye:\n• 1 Duochrome Metallic: fórmula brillante para un resplandor multicromático sobrecargado\n• 1 purpurina biodegradable: purpurina vegetal para un brillo instantáneo\n• 2 fórmulas Trio Chrome con lujosas escamas trituradas para un brillo intenso\n• 3 Foil Shimmers suavemente mezclados con finas perlas para un efecto foil\n• 11 Velvety Mattes, potentemente pigmentados y suaves como el terciopelo para un acabado de ante sin costuras",
    price: 285600,
    compareAtPrice: 357000,
    category: "ojos-paletas",
    tags: ["paleta", "sombras", "duochrome", "matte"],
    images: PLACEHOLDER_MAKEUP,
    featured: true,
  },
  {
    id: "tarte-tartelette-palette",
    slug: "tarte-tartelette-palette",
    name: "Tarte Tartelette In Bloom Amazonian Clay Eyeshadow Palette",
    brand: "Tarte",
    shortDescription: "Paleta viral de 12 tonos neutros y bronce con arcilla amazónica.",
    description:
      "Una paleta viral repleta de tonos esenciales y cotidianos. Con 12 tonos multitarea neutros y bronce diseñados para delinear, iluminar y esculpir tus párpados y pliegues, esta paleta siempre está en temporada. Los tonos se dispusieron en filas coordinadas para crear tres looks sencillos, perfectos tanto para mañanas frescas como para noches coquetas. Las fórmulas están infusionadas con arcilla amazónica para ofrecer un desgaste durante todo el día.\n\nTamaño: 12 x 0.046oz / 12 x 1.3g",
    price: 206300,
    compareAtPrice: 241400,
    category: "ojos-paletas",
    tags: ["paleta", "neutros", "arcilla-amazónica", "everyday"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "natasha-denona-mini-rose-palette",
    slug: "natasha-denona-mini-rose-palette",
    name: "Natasha Denona Mini Rose Eyeshadow Palette",
    brand: "Natasha Denona",
    shortDescription: "5 tonos rosa frío y malva con taupe ahumado para looks cotidianos o glamorosos.",
    description:
      "Una constelación de cinco tonos de rosa frío y malva con un tono taupe ahumado perfecto, ideal para looks suaves y cotidianos hasta un glamour rosado.\n\nEsta paleta muestra las fórmulas altamente pigmentadas y ultra difuminables de Natasha. La paleta presenta mates cremosos rosa suave, lila media y taupe oscuro, junto con un cromo rosa dúo con un toque dorado y una sombra de ojos cristalina rosa bebé brillante con folio. Esta paleta crea sin esfuerzo un look mate cotidiano hasta un glamour rosado y soñador.",
    price: 109900,
    compareAtPrice: 131900,
    category: "ojos-paletas",
    tags: ["paleta", "rosa", "mauve", "mini"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── OJOS / CEJAS ────────────────────────────────────────────────────────
  {
    id: "rare-beauty-brow-harmony-gel",
    slug: "rare-beauty-brow-harmony-gel",
    name: "Rare Beauty Brow Harmony Flexible Lifting and Laminating Eyebrow Gel",
    brand: "Rare Beauty",
    shortDescription: "Gel transparente de cejas impermeable para efecto laminado todo el día.",
    description:
      "Un gel universal transparente e impermeable para cejas que moldea, levanta y fija los pelos con una fijación flexible todo el día sin que se sienta pegajoso ni crujiente. Este gel ingrávido se construye fácilmente para esculpir y suavizar las cejas, logrando un aspecto cepillado y laminado que nunca sea rígido, pegajoso ni crujiente. Perfecto para todos los colores de cejas, el gel transparente se seca hasta obtener un acabado resistente a las escamas y al pastel sin dejar rastro. La fórmula resistente al agua resiste el sudor y los aceites naturales.\n\nColor: Clear\nTamaño: 0.15 oz / 4.5g",
    price: 80600,
    compareAtPrice: 100000,
    category: "ojos-cejas",
    tags: ["cejas", "gel", "laminado", "impermeable"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "got2b-glued-gel",
    slug: "got2b-glued-gel",
    name: "göt2B Glued Styling Gel",
    brand: "göt2B",
    shortDescription: "Gel de alta fijación transparente para cejas laminadas y baby hairs.",
    description:
      "Es un gel transparente de alta fijación que sirve para peinar y fijar cejas o cabello. Proporciona un efecto firme y duradero, ideal para lograr cejas laminadas o controlar el frizz. Su fórmula seca rápido, no deja residuos visibles y mantiene el peinado intacto por muchas horas.\n\n• Fijación muy fuerte (tipo pegamento)\n• Larga duración (todo el día o hasta lavado)\n• Textura transparente\n• Sirve para cejas, baby hairs y cabello\n• Ayuda a lograr efecto cejas laminadas\n\nTamaño: 35g",
    price: 19100,
    compareAtPrice: 22200,
    category: "ojos-cejas",
    tags: ["cejas", "gel", "fijación-fuerte", "laminado"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── LABIOS / LIPS ───────────────────────────────────────────────────────
  {
    id: "fenty-beauty-gloss-bomb",
    slug: "fenty-beauty-gloss-bomb",
    name: "Fenty Beauty Gloss Bomb Universal Lip Gloss Luminizer",
    brand: "Fenty Beauty",
    shortDescription: "Gloss XXL no pegajoso con aroma adictivo a melocotón y vainilla.",
    description:
      "Un brillo de labios definitivo, imprescindible, con un brillo explosivo que se siente tan bien como se ve. Un solo movimiento de la varita XXL de Gloss Bomb deja los labios instantáneamente más llenos y suaves.\n\nLa fórmula no pegajosa es súper brillante y tiene un aroma adictivo a melocotón y vainilla del que no te cansás más. Rihanna estaba obsesionada con crear el brillo perfecto que te den ganas de aplicarlo una y otra vez.\n\nColor: Riri - shimmering rose mauve nude\nTamaño: 0.30 oz / 9 mL",
    price: 99200,
    compareAtPrice: 117100,
    category: "labios-lips",
    tags: ["gloss", "brillo", "no-pegajoso"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "gisou-honey-lip-oil",
    slug: "gisou-honey-lip-oil",
    name: "Gisou Honey Infused Hydrating Lip Oil",
    brand: "Gisou",
    shortDescription: "Lip oil con miel Mirsalehi y ácido hialurónico, alto brillo no pegajoso.",
    description:
      "Un aceite de labios alimentado por miel Mirsalehi y aceites de jardín de abejas para hidratar intensamente los labios y retener la humedad con un acabado de alto brillo y no pegajoso.\n\nFormulado con una mezcla de miel nutritiva de Mirsalehi, aceites de jardín de abejas y ácido hialurónico, este aceite de labios superventas ofrece una hidratación duradera y un alto brillo para saciar los labios agrietados con un aroma jugoso y un toque de color. La fórmula no pegajosa de Gisou suaviza y retiene la humedad durante todo el día. Gisou obtiene con orgullo su miel Mirsalehi, libre de crueldad, de su propio Gisou Bee Garden en los Países Bajos, donde la tradición familiar de apicultura ha continuado durante seis generaciones.\n\nTamaño: 0.27 oz / 8mL",
    price: 106300,
    compareAtPrice: 128600,
    category: "labios-lips",
    tags: ["lip-oil", "hidratante", "miel"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "coco-cacao", name: "Coco Cacao - Sheer Brown Shimmer" },
      { id: "watermelon-sugar", name: "Watermelon Sugar - Clear Pink Shimmer" },
    ],
  },
  {
    id: "fenty-beauty-gloss-bomb-oil-miss-jellyfish",
    slug: "fenty-beauty-gloss-bomb-oil-miss-jellyfish",
    name: "Fenty Beauty Gloss Bomb Oil Lip Oil 'N Gloss",
    brand: "Fenty Beauty",
    shortDescription: "Lip oil gloss en tono Miss Jellyfish - lila helada brillante.",
    description: "Descripción por agregar.\n\nColor: Miss Jellyfish - lila helada brillante\nTamaño: 0.3 oz / 9 mL",
    price: 0,
    category: "labios-lips",
    tags: ["lip-oil", "gloss", "luminosizador"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "rhode-peptide-lip-tint",
    slug: "rhode-peptide-lip-tint",
    name: "Rhode Peptide Lip Tint",
    brand: "Rhode",
    shortDescription: "Tinte labial con péptidos, hidratante y nutritivo con acabado brillante.",
    description:
      "El cuidado de los labios es cuidado de la piel. El Tinte Labial con Péptidos es una fórmula nutritiva con un toque de color que hidrata y revitaliza los labios, dejándoles un acabado brillante y luminoso.\n\n• Color translúcido pero modulable que se funde en los labios\n• Ayuda a retener la hidratación de inmediato\n• Nutre, hidrata y revitaliza los labios secos\n• Deja los labios con una sensación suave y mullida\n• Suaviza las líneas finas de los labios y los rellena visiblemente con el tiempo\n\nIngredientes destacados:\n• Palmitoil Tripéptido-1: hidrata, suaviza y da volumen a los labios, reduciendo la apariencia de líneas de expresión\n• Manteca de karité, babasú y cupuaçu: nutrición profunda\n\nTamaño: 10mL / 0.3 oz",
    price: 81300,
    compareAtPrice: 93500,
    category: "labios-lips",
    tags: ["lip-tint", "péptidos", "hidratante"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "raspberry-jelly", name: "Raspberry Jelly" },
      { id: "toast", name: "Toast" },
      { id: "ribbon", name: "Ribbon" },
      { id: "espresso", name: "Espresso" },
      { id: "pbj", name: "PBJ" },
    ],
  },

  // ─── LABIOS / TRATAMIENTOS ───────────────────────────────────────────────
  {
    id: "carmex-lip-balm-spf15",
    slug: "carmex-lip-balm-spf15",
    name: "Carmex Lip Balm SPF 15 (Stick)",
    brand: "Carmex",
    shortDescription: "Bálsamo labial medicado en stick con protección solar SPF 15.",
    description:
      "El Carmex Classic Lip Balm SPF 15 en formato stick (barra sólida) es un bálsamo labial medicado diseñado para hidratar, proteger y reparar los labios secos o agrietados, mientras los protege del sol gracias a su filtro solar SPF 15.\n\nTamaño: 4.25g",
    price: 10900,
    compareAtPrice: 13700,
    category: "labios-tratamientos",
    tags: ["bálsamo", "SPF15", "stick", "medicado"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "classic", name: "Classic" },
      { id: "strawberry", name: "Strawberry" },
      { id: "wintergreen", name: "Wintergreen" },
    ],
  },
  {
    id: "carmex-lip-balm-medicated",
    slug: "carmex-lip-balm-medicated",
    name: "Carmex Lip Balm Medicated (Pote)",
    brand: "Carmex",
    shortDescription: "Bálsamo labial medicado en pote con mentol y alcanfor para labios agrietados.",
    description:
      "Es un bálsamo labial en formato pomada que viene en un pote pequeño. Sirve para hidratar, proteger y reparar los labios secos o agrietados, dejando una sensación de alivio y frescura gracias a sus ingredientes medicados como mentol y alcanfor.\n\n• Hidratación intensa y reparación de labios\n• Efecto calmante y refrescante (mentol y alcanfor)\n• Protege contra el frío, viento y resequedad\n• Uso diario o según necesidad\n\nTamaño: 10g",
    price: 10900,
    compareAtPrice: 13300,
    category: "labios-tratamientos",
    tags: ["bálsamo", "medicado", "mentol", "pote"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── SKIN CARE ───────────────────────────────────────────────────────────
  {
    id: "biodance-caviar-eye-patch",
    slug: "biodance-caviar-eye-patch",
    name: "Biodance Caviar PDRN Eye Patch",
    brand: "Biodance",
    shortDescription: "30 pares de parches de hidrogel con caviar, PDRN y cafeína.",
    description:
      "Una mascarilla nutritiva con caviar y PDRN para tratar el aspecto de las ojeras y la textura de la piel. Estos parches de hidrogel cortados en diamante, alimentados por caviar, PDRN y cafeína, abrazan la zona inferior de los ojos como una segunda piel, ofreciendo un doble impulso para un aspecto firme y renovado.\n\n• PDRN: Apoya la recuperación y renovación de la piel para un brillo revitalizado y saludable.\n• Exosomas probióticos: Refuerza la zona delicada bajo los ojos para una piel de aspecto más saludable.\n• Cafeína: Reduce el aspecto hinchado para un aspecto más fresco.\n\n30 pares / 60 patches",
    price: 91300,
    compareAtPrice: 108600,
    category: "skincare",
    tags: ["parches-ojos", "caviar", "PDRN", "anti-ojeras"],
    images: PLACEHOLDER_SKINCARE,
    featured: false,
  },
  {
    id: "biodance-bio-collagen-mask",
    slug: "biodance-bio-collagen-mask",
    name: "Biodance Bio Collagen Real Deep Mask",
    brand: "Biodance",
    shortDescription: "Mascarilla de colágeno ultrabajo para minimizar poros y aumentar elasticidad.",
    description:
      "Esta mascarilla contiene colágeno molecular ultra bajo Dalton 234, que se absorbe profundamente para cerrar los poros y aumentar la elasticidad. Es 20.000 veces más pequeño que un mechón de pelo, lo que garantiza una mejor absorción de la piel. Altamente concentrada diseñada para mejorar la elasticidad de la piel, hidratar y disminuir el aspecto de los poros.\n\n• Colágeno de bajo peso molecular: Minimiza el aspecto de los poros y aumenta la elasticidad de la piel\n• Ácido hialurónico: Proporciona una hidratación profunda\n• Galactomyces: Mejora el tono y la textura de la piel\n\nTamaño: 1 Mask",
    price: 21800,
    compareAtPrice: 24900,
    category: "skincare",
    tags: ["mascarilla", "colágeno", "poros", "elasticidad"],
    images: PLACEHOLDER_SKINCARE,
    featured: true,
  },
  {
    id: "rhode-peptide-eye-patches",
    slug: "rhode-peptide-eye-patches",
    name: "Rhode Peptide Eye Prep Depuffing Eye Patches",
    brand: "Rhode",
    shortDescription: "6 pares de parches de hidrogel que desinflan e iluminan bajo los ojos.",
    description:
      "Parches refrescantes de hidrogel que desinflan y iluminan bajo los ojos, ayudando a reducir el aspecto de las líneas finas y las ojeras. Demostrado clínicamente mejorar la hinchazón bajo los ojos de forma inmediata.\n\nProporcionan un efecto tensante mientras dejan la parte inferior de los ojos más brillante. Úsalos en tu rutina, úsalos para preparar el maquillaje y llévatelos cuando tus ojos necesiten un pequeño despertar.\n\nIngredientes destacados:\n• Cafeína: Reduce la apariencia de la hinchazón bajo las ojos\n• Péptido: Mejora el aspecto de las ojeras, haciendo que la parte inferior de los ojos luzca más brillante\n• PCA sódico: Un derivado de aminoácidos que hidrata para la piel más suave\n\n6 pares / pack",
    price: 95000,
    compareAtPrice: 116900,
    category: "skincare",
    tags: ["parches-ojos", "péptidos", "desinflamante", "hidrogel"],
    images: PLACEHOLDER_SKINCARE,
    featured: false,
  },
  {
    id: "vaseline-sunlit-glow-gel-oil",
    slug: "vaseline-sunlit-glow-gel-oil",
    name: "Vaseline Sunlit Glow Gel Oil",
    brand: "Vaseline",
    shortDescription: "Aceite corporal en gel con efecto glow dorado y aroma a vainilla y cacao.",
    description:
      "Aceite corporal en gel con brillo que hidrata la piel y le da un efecto luminoso natural. Tiene un aroma cálido a vainilla y cacao, se absorbe rápido y deja la piel suave, brillante y sin sensación grasosa.\n\n• Efecto glow: brillo tipo piel iluminada con destellos dorados\n• Alta hidratación: con manteca de cacao y aceites nutritivos\n• Textura gel-oil: ligera, se desliza fácil y no es pegajosa\n• Secado rápido y sin residuos grasos\n• Aroma: mezcla cálida de vainilla y cacao tostado\n\nTono: Vanilla Cocoa\nTamaño: 200mL / 6.8 fl oz",
    price: 39800,
    compareAtPrice: 46600,
    category: "skincare",
    tags: ["cuerpo", "glow", "hidratante", "gel-oil"],
    images: PLACEHOLDER_SKINCARE,
    featured: false,
  },
  {
    id: "charlottes-magic-water-cream",
    slug: "charlottes-magic-water-cream",
    name: "Charlotte Tilbury Charlotte's Magic Water Cream",
    brand: "Charlotte Tilbury",
    shortDescription: "Crema hidratante gel efecto glass skin con niacinamida y péptidos.",
    description:
      "Charlotte's Magic Water Cream es una crema hidratante en textura gel ligera diseñada para dar una hidratación intensa y rápida absorción, dejando la piel con un acabado fresco, luminoso y tipo glass skin. Está formulada para pieles deshidratadas, mixtas o grasas que buscan hidratación sin sensación pesada. Funciona muy bien como prebase de maquillaje (primer), ya que prepara la piel, la suaviza y ayuda a que el make up se aplique mejor y dure más tiempo sin marcar zonas secas.\n\n• Textura gel acuosa y liviana de rápida absorción\n• Hidratación prolongada (hasta 100 horas)\n• Efecto piel luminosa (dewy glow) y aspecto saludable\n• Ayuda a reducir la apariencia de poros y rojeces\n• Contiene niacinamida y péptidos que mejoran textura y tono de la piel\n• Fórmula ligera ideal para pieles mixtas o grasas\n\nTamaño: 15mL / 0.5 fl oz",
    price: 124400,
    compareAtPrice: 155500,
    category: "skincare",
    tags: ["hidratante", "glass-skin", "niacinamida", "péptidos"],
    images: PLACEHOLDER_SKINCARE,
    featured: false,
  },

  // ─── BRUSHES ─────────────────────────────────────────────────────────────
  {
    id: "elf-flawless-face-eye-brush-set",
    slug: "elf-flawless-face-eye-brush-set",
    name: "e.l.f. Flawless Face & Eye Brush Set",
    brand: "e.l.f.",
    shortDescription: "Set de 6 brochas suaves para rostro y ojos con acabado uniforme y profesional.",
    description:
      "El e.l.f. Flawless Face & Eye Brush Set es un set de 6 brochas de maquillaje diseñado para aplicar, difuminar y perfeccionar productos tanto en el rostro como en los ojos. Sus brochas tienen cerdas suaves que permiten un acabado uniforme y profesional.\n\n• Cerdas suaves y densas para una aplicación cómoda\n• Incluye brochas para rostro y ojos\n• Permite difuminar maquillaje fácilmente\n• Apto para productos en polvo, crema o líquidos\n• Diseño ergonómico para mejor manejo\n• Ideal para looks naturales o más elaborados",
    price: 65600,
    compareAtPrice: 75400,
    category: "brushes",
    tags: ["brochas", "set", "rostro", "ojos"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "real-techniques-everything-blending-duo",
    slug: "real-techniques-everything-blending-duo",
    name: "Real Techniques Everything Blending Duo",
    brand: "Real Techniques",
    shortDescription: "Set brocha facial + esponja beauty blender para un acabado tipo airbrush.",
    description:
      "El Real Techniques Everything Blending Duo es un set de 2 herramientas de maquillaje que incluye una brocha para rostro y una esponja tipo beauty blender, diseñadas para aplicar y difuminar productos de manera fácil y uniforme.\n\n• Incluye 1 brocha facial + 1 esponja de maquillaje\n• La brocha sirve para base, rubor, polvo y bronceador\n• La esponja permite un acabado natural y difuminado\n• Ideal para productos líquidos, en crema o polvo\n• Diseño pensado para lograr un acabado uniforme tipo airbrush\n• Herramientas suaves, veganas y libres de crueldad animal",
    price: 54800,
    compareAtPrice: 69000,
    category: "brushes",
    tags: ["brochas", "esponja", "blending", "vegano"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "real-techniques-matte-moment-blending-set",
    slug: "real-techniques-matte-moment-blending-set",
    name: "Real Techniques Matte Moment Ultimate Blending Set",
    brand: "Real Techniques",
    shortDescription: "Kit brochas y esponjas para acabado mate profesional en polvos, cremas y líquidos.",
    description:
      "El Real Techniques Matte Moment Ultimate Blending Set es un kit de herramientas de maquillaje diseñado para aplicar y difuminar productos líquidos, en crema y en polvo, logrando un acabado mate, suave y sin líneas marcadas. Incluye brochas y esponjas para aplicar base, corrector, polvos y rubor.\n\n• Diseñado para productos líquidos, cremosos y en polvo\n• Permite un acabado mate, suave y difuminado\n• Herramientas veganas y cruelty free\n• Ideal para base, corrector, rubor, contorno y polvos\n• Ayuda a lograr un maquillaje más uniforme y profesional",
    price: 53500,
    compareAtPrice: 63100,
    category: "brushes",
    tags: ["brochas", "esponja", "matte", "set"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },

  // ─── ACCESORIOS ──────────────────────────────────────────────────────────
  {
    id: "porta-algodon-acrilico-bambu",
    slug: "porta-algodon-acrilico-bambu",
    name: "Porta Algodón en Discos Acrílico/Bambú",
    shortDescription: "Porta algodón transparente con tapa de bambú, 10cm.",
    description:
      "Porta algodón de acrílico con tapa de bambú. Organizá tus algodones de forma práctica y elegante. Su diseño transparente permite ver el contenido fácilmente, mientras la tapa de bambú lo mantiene limpio y protegido. Ideal para un baño o tocador moderno.\n\nTamaño: 10cm",
    price: 8000,
    compareAtPrice: 9600,
    category: "accesorios",
    tags: ["organizador", "bambú", "acrílico"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "espejo-arco-escritorio",
    slug: "espejo-arco-escritorio",
    name: "Espejo Arco de Escritorio",
    shortDescription: "Espejo minimalista con forma de arco para tocador o escritorio, 16x18cm.",
    description:
      "Diseño moderno con forma de arco en el frente y detalle tipo arcoíris en la parte trasera, todo en un mismo color para un look minimalista y elegante. Ideal para decorar y usar en tu tocador o escritorio, aportando estilo y funcionalidad en un solo accesorio.\n\nTamaño: 16cm ancho × 18cm alto",
    price: 14400,
    compareAtPrice: 17000,
    category: "accesorios",
    tags: ["espejo", "escritorio", "minimalista"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "blanco", name: "Blanco" },
      { id: "rosa", name: "Rosa" },
      { id: "amarillo", name: "Amarillo" },
    ],
  },
  {
    id: "limpiador-silicona-brochas",
    slug: "limpiador-silicona-brochas",
    name: "Limpiador Plegable de Silicona para Brochas",
    shortDescription: "Limpiador de silicona con texturas en relieve para brochas, 14x11cm.",
    description:
      "El limpiador de brochas de silicona plegable es un accesorio de maquillaje diseñado para limpiar brochas y pinceles de forma rápida, profunda y sin dañarlos. Su superficie tiene texturas en relieve que ayudan a remover residuos de maquillaje, grasa e impurezas de las cerdas.\n\nTamaño: 14 × 11cm",
    price: 7200,
    compareAtPrice: 8400,
    category: "accesorios",
    tags: ["limpiador", "brochas", "silicona"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
    variants: [
      { id: "verde-agua", name: "Verde Agua" },
      { id: "fucsia", name: "Fucsia" },
    ],
  },
  {
    id: "organizador-acrilico-bambu",
    slug: "organizador-acrilico-bambu",
    name: "Organizador Acrílico/Bambú Multiuso",
    shortDescription: "Organizador multiuso acrílico con tapa de bambú, 10x14x10cm.",
    description:
      "El organizador acrílico con tapa de bambú es un contenedor práctico y elegante diseñado para guardar y mantener ordenados artículos de maquillaje e higiene personal. Su cuerpo transparente permite ver el contenido fácilmente, mientras que la tapa de bambú protege el interior del polvo y aporta un estilo natural.\n\nTamaño: 10cm alto × 14cm largo × 10cm ancho",
    price: 21000,
    compareAtPrice: 26000,
    category: "accesorios",
    tags: ["organizador", "bambú", "acrílico", "multiuso"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
  {
    id: "organizador-cosmeticos-acrilico",
    slug: "organizador-cosmeticos-acrilico",
    name: "Organizador de Cosméticos Acrílico",
    shortDescription: "Organizador vertical de acrílico con 7 separaciones para paletas de maquillaje.",
    description:
      "El organizador de cosméticos de acrílico es un soporte práctico y resistente diseñado para mantener el maquillaje ordenado y fácilmente accesible. Cuenta con 7 separaciones individuales de 2cm cada una, lo que permite clasificar productos de forma vertical y organizada.\n\n• Material acrílico transparente: resistente y fácil de limpiar\n• Diseño vertical que ahorra espacio\n• Ideal para paletas de maquillaje (sombras, rostro o cejas)\n• Permite ver y acceder fácilmente a los productos\n• Ayuda a mantener el orden en tocadores o cajones\n\nTamaño: 13cm ancho × 17cm profundidad",
    price: 14900,
    compareAtPrice: 18000,
    category: "accesorios",
    tags: ["organizador", "acrílico", "paletas"],
    images: PLACEHOLDER_MAKEUP,
    featured: false,
  },
];

export const products: Product[] = productsRaw.map(applyStock);

export function getProduct(slug: string): Product | undefined {
  const p = productsRaw.find((x) => x.slug === slug);
  return p ? applyStock(p) : undefined;
}

export function getFeatured(): Product[] {
  return productsRaw.filter((p) => p.featured).map(applyStock);
}

export function getByCategory(category: string): Product[] {
  return productsRaw.filter((p) => p.category === category).map(applyStock);
}

export function getRelated(product: Product, count = 4): Product[] {
  return productsRaw
    .filter((p) => p.id !== product.id && p.category === product.category)
    .map(applyStock)
    .slice(0, count);
}
