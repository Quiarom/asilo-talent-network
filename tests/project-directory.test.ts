import { readFileSync } from "node:fs";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ProjectDirectory from "../src/components/ProjectDirectory.astro";
import type { Project } from "../src/data/projects";

describe("ProjectDirectory", () => {
  it("shows ten projects per carousel page in two five-card columns", async () => {
    const projects: Project[] = Array.from({ length: 20 }, (_, index) => ({
      href: `https://project-${index}.example`,
      title: `Project ${index}`,
      description: "Test project",
      author: "Test author",
      tags: [],
    }));
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, { props: { projects } });

    expect((html.match(/class="prj-item"/g) ?? []).length).toBe(20);
    expect((html.match(/data-project-page/g) ?? []).length).toBe(2);
    expect((html.match(/class="prj-col"/g) ?? []).length).toBe(4);
    expect(html).toContain('data-project-page="0"');
    expect(html).toMatch(/data-project-page="1"[^>]*\bhidden\b/);
    expect(html).toContain('data-project-nav="previous"');
    expect(html).toContain('data-project-nav="next"');
    expect(html).toContain('id="project-directory-list"');
    // Projects without a detail page (no id) keep opening their site.
    expect((html.match(/target="_blank" rel="noopener noreferrer"/g) ?? []).length).toBe(20);
    expect((html.match(/icons\/pixelarticons\/box\.svg/g) ?? []).length).toBe(20);
    expect(readFileSync(new URL("../src/components/ProjectDirectory.astro", import.meta.url), "utf8"))
      .toContain("gsap.timeline");
  });

  it("shows a complete success state with actions instead of a buried status message", () => {
    const component = readFileSync(
      new URL("../src/components/ProjectFormModal.astro", import.meta.url),
      "utf8",
    );

    expect(component).toContain('class="modal-success"');
    expect(component).toContain("<span>Tu proyecto ya está</span>");
    expect(component).toContain("<span>en revisión</span>");
    expect(component).toContain("Gracias por sumarte.");
    expect(component).toContain('src="/check-thanks.svg"');
    expect(component).not.toContain("Revisaremos el proyecto");
    expect(component).toContain("Agregar otro proyecto");
    expect(component).toContain('data-success-view');
    expect(component).toContain('data-submit-another');
    expect(component).toContain("playConfetti();");
    expect(component).toContain('layer.className = "modal-confetti"');
    expect(component).toContain("Logo (opcional)");
  });

  it("only closes from a genuine backdrop click, not a text-selection gesture", () => {
    const component = readFileSync(
      new URL("../src/components/ProjectFormModal.astro", import.meta.url),
      "utf8",
    );

    expect(component).toContain('dialog.addEventListener("pointerdown"');
    expect(component).toContain("backdropPointerDown && e.target === dialog");
  });

  it("keeps hidden carousel pages out of the flex layout", () => {
    const styles = readFileSync(
      new URL("../src/styles/global.css", import.meta.url),
      "utf8",
    );

    expect(styles).toContain(".prj-list[hidden] { display: none; }");
    expect(styles).toContain(".prj-col { flex: 0 0 auto; width: 100%; }");
    expect(styles).toContain('.modal-card > [data-form-view][hidden] { display: none; }');
    expect(styles).toContain("@keyframes modal-confetti-fall");
    expect(styles).toContain('.modal-success-check { width: 74px; height: 40px; }');
    expect(styles).toContain('font-size: clamp(2rem, 5vw, 2.75rem)');
  });

  it("refreshes the directory from the server-rendered partial", () => {
    const component = readFileSync(
      new URL("../src/components/ProjectDirectory.astro", import.meta.url),
      "utf8",
    );

    // One renderer: the browser swaps in server HTML instead of rebuilding cards.
    expect(component).toContain("/partials/proyectos?orden=");
    expect(component).not.toContain('document.createElement("a")');
    expect(component).toContain("window.setInterval(refreshProjects, 60_000)");
    expect(component).toContain("document.visibilityState !== \"visible\"");
  });

  it("renders the sort control as a plain GET form with the current order selected", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, { props: { projects: [], sort: "za" } });

    expect(html).toMatch(/<form class="prj-sort" method="get" action="\/#proyectos"/);
    expect(html).toContain('<option value="za" selected>Nombre: Z–A</option>');
    expect(html).toContain('<option value="az">Nombre: A–Z</option>');
  });

  it("links published projects to their detail page", async () => {
    const projects: Project[] = [
      {
        href: "https://panapay.com",
        title: "Pana Pay",
        description: "Pagos",
        author: "Ana",
        tags: ["Fintech"],
        id: "0123456789ab",
        slug: "pana-pay-0123456789ab",
      },
    ];
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, { props: { projects } });

    expect(html).toContain('href="/proyectos/pana-pay-0123456789ab"');
    expect(html).not.toContain('href="https://panapay.com"');
  });

  it("puts uploaded logos on the logo tile and keeps category icons otherwise", async () => {
    const base = { description: "", author: "", tags: ["Proptech"] };
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, {
      props: {
        projects: [
          { ...base, href: "https://con-logo.example", title: "Con logo", logoUrl: "https://cdn.example/logo.png" },
          { ...base, href: "https://sin-logo.example", title: "Sin logo" },
        ],
      },
    });

    expect(html).toMatch(/<div class="prj-thumb"[^>]*>\s*<img class="prj-logo" src="https:\/\/cdn\.example\/logo\.png"/);
    expect(html).toContain('src="/icons/pixelarticons/home.svg"');
  });
});
