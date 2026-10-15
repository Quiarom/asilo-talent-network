// Contenido de la landing de servicios de Asilo Digital (/servicios).
// Todo el copy, los links y las rutas de imágenes viven aquí para editarlos sin tocar el markup.
// Las imágenes son placeholders en /public/placeholders: reemplaza el archivo y mantén el nombre.

export const CTA_LABEL = "Agenda un diagnóstico";

// Todos los CTA principales apuntan aquí. TODO: conectar a Cal.com.
export const CTA_HREF = "#contacto";

// TODO: confirmar el correo de contacto definitivo.
export const CONTACT_EMAIL = "hola@asilodigital.com";

export interface NavLink {
  label: string;
  href: string;
}

export const navLinks: NavLink[] = [
  { label: "Servicios", href: "#servicios" },
  { label: "Proceso", href: "#proceso" },
  { label: "Trabajo", href: "#trabajo" },
  { label: "Nosotros", href: "#nosotros" },
];

export interface ImageAsset {
  src: string;
  alt: string;
}

export const hero = {
  title: "Hacemos que tu app se entienda.",
  subtitle:
    "Diagnosticamos tu UX, rediseñamos tu producto con identidad propia y lo llevamos a producción.",
  secondaryCta: { label: "Ver servicios", href: "#servicios" },
  proof: "Comunidad tech de LatAm desde 2021",
  // TODO: reemplazar con avatares reales de la comunidad.
  avatars: [1, 2, 3, 4, 5].map((n) => `/placeholders/avatar-${n}.webp`),
  // TODO: reemplazar con logos reales de clientes (con permiso). SVG o PNG en escala de grises.
  clientLogos: [1, 2, 3, 4, 5, 6].map((n) => ({ src: `/placeholders/logo-${n}.svg`, name: `Cliente ${n}` })),
  // TODO: reemplazar con pantallas reales de apps diseñadas.
  screens: [1, 2, 3, 4, 5, 6].map(
    (n): ImageAsset => ({ src: `/placeholders/screen-${n}.webp`, alt: `Pantalla de app diseñada por Asilo ${n}` }),
  ),
};

export interface Service {
  number: string;
  name: string;
  hook: string;
  includes: string[];
  image: ImageAsset;
}

export const services: Service[] = [
  {
    number: "01",
    name: "UX Assessment",
    hook: "Tu app no convierte y no sabes por qué.",
    includes: [
      "Auditoría heurística",
      "Análisis de flujos críticos",
      "Benchmark de competidores",
      "Reporte con quick wins",
    ],
    image: { src: "/placeholders/service-1.webp", alt: "Ejemplo de reporte de UX Assessment" },
  },
  {
    number: "02",
    name: "UI/UX e Identidad",
    hook: "Tu app funciona, pero se ve como todas.",
    includes: ["Rediseño de flujos", "UI de alta fidelidad", "Identidad de marca", "Design system base"],
    image: { src: "/placeholders/service-2.webp", alt: "Ejemplo de rediseño de UI e identidad" },
  },
  {
    number: "03",
    name: "Implementaciones",
    hook: "Tienes el diseño, falta construirlo.",
    includes: ["Sitios en Framer/Webflow", "Front-end", "QA de diseño"],
    image: { src: "/placeholders/service-3.webp", alt: "Ejemplo de implementación en producción" },
  },
];

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  image: ImageAsset;
}

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Diagnosticamos",
    description: "Entendemos tu negocio y cómo usan tu app tus usuarios.",
    image: { src: "/placeholders/process-1.webp", alt: "Sesión de diagnóstico" },
  },
  {
    number: "02",
    title: "Diseñamos",
    description: "Flujos e identidad, con revisiones hasta que funcione.",
    image: { src: "/placeholders/process-2.webp", alt: "Flujos de diseño en revisión" },
  },
  {
    number: "03",
    title: "Implementamos",
    description: "Lo llevamos a producción contigo.",
    image: { src: "/placeholders/process-3.webp", alt: "Producto implementado en producción" },
  },
];

export interface WorkCase {
  name: string;
  problem: string;
  service: string;
  year: string;
  image: ImageAsset;
}

export const workCases: WorkCase[] = [
  // TODO: reemplazar con caso real
  {
    name: "Pana Pay",
    problem: "La mitad de los usuarios abandonaba el registro antes de verificar su cuenta.",
    service: "UX Assessment",
    year: "2025",
    image: { src: "/placeholders/case-1.webp", alt: "Pantallas del proyecto Pana Pay" },
  },
  // TODO: reemplazar con caso real
  {
    name: "Ruta Viva",
    problem: "Una app de logística que funcionaba bien, pero nadie la recordaba.",
    service: "UI/UX e Identidad",
    year: "2025",
    image: { src: "/placeholders/case-2.webp", alt: "Pantallas del proyecto Ruta Viva" },
  },
  // TODO: reemplazar con caso real
  {
    name: "Cuaderno",
    problem: "El diseño estaba aprobado hace meses y seguía sin llegar a producción.",
    service: "Implementaciones",
    year: "2024",
    image: { src: "/placeholders/case-3.webp", alt: "Pantallas del proyecto Cuaderno" },
  },
];

// TODO: apuntar a la página con todos los casos cuando exista.
export const allCasesHref = "#trabajo";

export interface TeamMember {
  name: string;
  role: string;
  photo: string;
}

export const about = {
  title: "Nacimos como comunidad. Seguimos pensando como una.",
  body: [
    "En enero de 2021 abrimos un canal de Telegram para hablar de privacidad y tecnología sin tecnicismos.",
    "Hoy llevamos ese mismo propósito a los productos que diseñamos: que la tecnología se entienda.",
  ],
  signature: "— Equipo Asilo Digital",
  // TODO: reemplazar con el equipo real (foto, nombre y rol).
  team: [
    { name: "Nombre Apellido", role: "Diseño de producto", photo: "/placeholders/team-1.webp" },
    { name: "Nombre Apellido", role: "Identidad de marca", photo: "/placeholders/team-2.webp" },
    { name: "Nombre Apellido", role: "Front-end", photo: "/placeholders/team-3.webp" },
  ] satisfies TeamMember[],
};

export const contact = {
  title: "Hagamos que tu app se entienda.",
  emailLabel: "o escríbenos a",
};

export interface SocialLink {
  label: string;
  href: string;
  icon: "telegram" | "x" | "instagram" | "linkedin";
}

export const socialLinks: SocialLink[] = [
  // TODO: confirmar el link del canal de Telegram.
  { label: "Telegram", href: "https://t.me/asilodigital", icon: "telegram" },
  { label: "X", href: "https://x.com/asilodigital", icon: "x" },
  { label: "Instagram", href: "https://www.instagram.com/asilodigitalcom/", icon: "instagram" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/asilodigital/", icon: "linkedin" },
];

export const footer = {
  tagline: "La comunidad de los ciudadanos de internet",
  // TODO: apuntar a las páginas reales de Privacidad y Términos.
  legal: [
    { label: "Privacidad", href: "#" },
    { label: "Términos", href: "#" },
  ],
};

export const seo = {
  title: "Asilo Digital — Diseño de producto que se entiende",
  description:
    "Estudio de diseño de producto nacido como comunidad tech en LatAm. Diagnosticamos tu UX, rediseñamos tu app con identidad propia y la llevamos a producción.",
};
