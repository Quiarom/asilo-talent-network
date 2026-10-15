import { existsSync, readFileSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ServiciosPage from "../src/pages/servicios.astro";
import { hero, processSteps, services, testimonials, workCases } from "../src/data/landing";

const SITE = "https://builders.asilodigital.com";

async function render() {
  const container = await AstroContainer.create();
  return container.renderToString(ServiciosPage);
}

function anchorsWithText(html: string, text: string): string[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(([, , inner]) => inner.replace(/<[^>]+>/g, "").trim() === text)
    .map(([, attrs]) => attrs.match(/href="([^"]*)"/)?.[1] ?? "");
}

describe("landing de servicios", () => {
  it("renders a Spanish page with a single h1 for the hero", async () => {
    const html = await render();

    expect(html).toContain('<html lang="es">');
    expect(html).toMatch(/<main\b/);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Hacemos que tu app se entienda.");
    expect(html).toContain("Diagnosticamos tu UX, rediseñamos tu producto con identidad propia y lo llevamos a producción.");
  });

  it("renders the sections in order with their anchors", async () => {
    const html = await render();
    const ids = ["inicio", "servicios", "proceso", "trabajo", "testimonios", "nosotros", "contacto"];
    const positions = ids.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const headline of [
      "Tres formas de trabajar juntos.",
      "Tres pasos. Cero adivinanzas.",
      "Trabajo reciente, diseñado para que se use.",
      "Lo que dicen los equipos con los que trabajamos.",
      "Nacimos como comunidad. Seguimos pensando como una.",
      "Hagamos que tu app se entienda.",
    ]) {
      expect(html).toContain(headline);
    }
  });

  it("points every primary CTA to #contacto with the exact label", async () => {
    const html = await render();
    const ctas = anchorsWithText(html, "Agenda un diagnóstico");

    // Nav, menú móvil, hero y CTA final.
    expect(ctas.length).toBe(4);
    expect(new Set(ctas)).toEqual(new Set(["#contacto"]));
    expect(anchorsWithText(html, "Ver servicios")).toEqual(["#servicios"]);
  });

  it("renders the services as an exclusive accordion with the first item open", async () => {
    const html = await render();
    const details = html.match(/<details\b[^>]*>/g) ?? [];

    expect(details).toHaveLength(services.length);
    expect(details.every((tag) => tag.includes('name="servicios"'))).toBe(true);
    expect(details[0]).toMatch(/\bopen\b/);
    expect(details.slice(1).some((tag) => /\bopen\b/.test(tag))).toBe(false);
    for (const item of ["Benchmark de competidores", "Sitios en Framer/Webflow", "Design system base"]) {
      expect(html).toContain(item);
    }
  });

  it("renders the process steps, work cases, and testimonials without team cards", async () => {
    const html = await render();

    expect(processSteps).toHaveLength(3);
    expect(workCases).toHaveLength(3);
    for (const step of processSteps) expect(html).toContain(step.title);
    for (const item of workCases) {
      expect(html).toContain(item.name);
      expect(html).toContain(item.problem);
    }
    expect(html).toContain("Ver todos los casos");
    expect(html).toContain("— Equipo Asilo Digital");
    expect(html.match(/<blockquote\b/g)).toHaveLength(testimonials.items.length);
    expect(html).not.toContain("l-member");
  });

  it("keeps the footer links and contact email", async () => {
    const html = await render();

    expect(html).toContain("La comunidad de los ciudadanos de internet");
    expect(html).toContain('href="mailto:hola@asilodigital.com"');
    for (const label of ["Telegram", "X", "Instagram", "LinkedIn"]) {
      expect(html).toContain(`aria-label="${label} (se abre en otra pestaña)"`);
    }
    expect(anchorsWithText(html, "Privacidad")).toHaveLength(1);
    expect(anchorsWithText(html, "Términos")).toHaveLength(1);
  });

  it("has its own SEO head and light theme without the community styles", async () => {
    const html = await render();

    expect(html).toContain("<title>Asilo Digital — Diseño de producto que se entiende</title>");
    expect(html).toContain(`<link rel="canonical" href="${SITE}/servicios">`);
    expect(html).toContain('<meta property="og:site_name" content="Asilo Digital">');
    expect(html).toContain(`<meta property="og:image" content="${SITE}/og-servicios.png">`);
    expect(html).toMatch(/<meta\b[^>]*name="theme-color"[^>]*content="#fafafa"/);
    expect(html).not.toContain("#000a11");
  });

  it("references placeholder assets that exist in public/", () => {
    const paths = [
      ...hero.avatars,
      ...hero.clientLogos.map((logo) => logo.src),
      ...hero.screens.map((screen) => screen.src),
      ...services.map((service) => service.image.src),
      ...processSteps.map((step) => step.image.src),
      ...workCases.map((item) => item.image.src),
      ...testimonials.items.map((item) => item.avatar),
      "/og-servicios.png",
      "/logo-asilo.svg",
      "/fonts/geist-sans.woff2",
      "/fonts/geist-mono.woff2",
    ];

    for (const path of paths) {
      expect(existsSync(new URL(`../public${path}`, import.meta.url)), path).toBe(true);
    }
    expect(readFileSync(new URL("../src/styles/fonts.css", import.meta.url), "utf8")).toContain("Geist Sans");
  });
});
