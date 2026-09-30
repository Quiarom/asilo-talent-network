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
  });

  it("renders the sort control as a plain GET form with the current order selected", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, { props: { projects: [], sort: "za" } });

    expect(html).toMatch(/<form class="prj-sort" method="get" action="\/#proyectos"/);
    expect(html).toContain('<option value="za" selected>Nombre: Z–A</option>');
    expect(html).toContain('<option value="az">Nombre: A–Z</option>');
  });

  it("links published projects to their detail page and exposes likes only when enabled", async () => {
    const projects: Project[] = [
      {
        href: "https://panapay.com",
        title: "Pana Pay",
        description: "Pagos",
        author: "Ana",
        tags: ["Fintech"],
        id: "0123456789ab",
        slug: "pana-pay-0123456789ab",
        likes: 7,
      },
      { href: "https://sin-likes.example", title: "Sin likes", description: "", author: "", tags: [], id: "ba9876543210", slug: "sin-likes-ba9876543210" },
    ];
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, {
      props: { projects, sort: "populares", likesEnabled: true },
    });

    expect(html).toContain('href="/proyectos/pana-pay-0123456789ab"');
    expect(html).not.toContain('href="https://panapay.com"');
    expect((html.match(/data-like="/g) ?? []).length).toBe(1);
    expect(html).toMatch(/data-like-count>7</);
    expect(html).toMatch(/<option value="populares" selected>Más votados<\/option>/);
    expect(html).toContain('<option value="za">Nombre: Z–A</option>');
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

  it("hides the likes order when likes are not configured", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ProjectDirectory, {
      props: { projects: [], sort: "az", likesEnabled: false },
    });

    expect(html).not.toContain('value="populares"');
    expect(html).toContain("Todavía no hay proyectos publicados.");
  });
});
