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

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

export const testimonials = {
  title: "Lo que dicen los equipos con los que trabajamos.",
  // TODO: reemplazar con testimonios reales (con permiso): cita, nombre, cargo · empresa y foto.
  items: [1, 2, 3].map(
    (n): Testimonial => ({
      quote:
        "Aquí va el testimonio de un cliente: qué problema tenía, qué cambió después de trabajar con Asilo y un resultado concreto.",
      name: "Nombre Apellido",
      role: "Cargo · Empresa",
      avatar: `/placeholders/testimonial-${n}.webp`,
    }),
  ),
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const faq = {
  eyebrow: "¿Aún tienes dudas?",
  title: "Preguntas frecuentes.",
  card: {
    title: "¿No encuentras tu respuesta?",
    body: "Lo hablamos en una llamada.",
    emailLabel: "O escríbenos a",
    // TODO: reemplazar con la foto de quien atiende las llamadas.
    avatar: "/placeholders/faq-contact.webp",
  },
  // TODO: confirmar las respuestas con el equipo antes de publicar.
  items: [
    {
      question: "¿Con quién trabajan mejor?",
      answer:
        "Con founders y PMs de startups latinoamericanas que ya tienen una app en manos de usuarios, o están por lanzarla, y sienten que no se entiende como debería.",
    },
    {
      question: "¿En qué nos pueden ayudar exactamente?",
      answer:
        "En tres cosas: diagnosticar la UX de tu app, rediseñarla con identidad propia y llevar ese diseño a producción. Puedes contratar una sola o las tres.",
    },
    {
      question: "¿Son una agencia de diseño o de desarrollo?",
      answer:
        "Somos un estudio de diseño de producto. También implementamos: construimos sitios en Framer o Webflow, hacemos front-end y revisamos que lo construido respete el diseño.",
    },
    {
      question: "¿Pueden ayudarnos con un producto desde cero?",
      answer:
        "Sí. Empezamos por entender el problema que resuelve tu producto y a quién se lo resuelve, y desde ahí diseñamos los primeros flujos y la identidad.",
    },
    {
      question: "¿Cuánto cuesta trabajar con ustedes?",
      answer:
        "Depende del alcance. Después de la llamada de diagnóstico te enviamos una propuesta con entregables, tiempos y precio, para que decidas con todo sobre la mesa.",
    },
    {
      question: "¿Qué tan rápido pueden empezar?",
      answer: "Depende de nuestra agenda en ese momento. En la llamada te decimos la fecha de inicio más cercana.",
    },
    {
      question: "¿Cómo trabajamos día a día?",
      answer:
        "Con un canal de comunicación compartido y revisiones periódicas. Ves el avance desde el primer día y no esperas a una gran entrega final para opinar.",
    },
    {
      question: "¿Pueden trabajar con nuestro equipo interno?",
      answer:
        "Sí. Trabajamos junto a tu equipo de producto y desarrollo, y les dejamos la documentación y el design system para que sigan sin nosotros.",
    },
  ] satisfies FaqItem[],
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
