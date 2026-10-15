// Interacciones de la landing de servicios (/servicios).

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Carruseles: los botones anterior/siguiente desplazan una tarjeta y se desactivan en los extremos.
function initScrollers(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-scroll-prev], [data-scroll-next]");
  const scrollers = new Set<HTMLElement>();

  buttons.forEach((button) => {
    const id = button.dataset.scrollPrev ?? button.dataset.scrollNext;
    const scroller = id ? document.getElementById(id) : null;
    if (!scroller) return;
    scrollers.add(scroller);
    const direction = button.dataset.scrollPrev ? -1 : 1;
    button.addEventListener("click", () => {
      const item = scroller.querySelector<HTMLElement>("li");
      const gap = parseFloat(getComputedStyle(item?.parentElement ?? scroller).columnGap) || 0;
      const step = item ? item.offsetWidth + gap : scroller.clientWidth * 0.8;
      scroller.scrollBy({ left: direction * step, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
  });

  scrollers.forEach((scroller) => {
    const prev = document.querySelector<HTMLButtonElement>(`[data-scroll-prev="${scroller.id}"]`);
    const next = document.querySelector<HTMLButtonElement>(`[data-scroll-next="${scroller.id}"]`);
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth - 1;
      if (prev) prev.disabled = scroller.scrollLeft <= 0;
      if (next) next.disabled = scroller.scrollLeft >= max;
    };
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
}

// Acordeón exclusivo: <details name> ya lo hace en navegadores modernos; esto cubre los demás.
function initAccordions(): void {
  if ("name" in HTMLDetailsElement.prototype) return;
  document.querySelectorAll<HTMLElement>("[data-accordion]").forEach((accordion) => {
    const items = accordion.querySelectorAll<HTMLDetailsElement>("details");
    items.forEach((item) =>
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => other !== item && (other.open = false));
      }),
    );
  });
}

initScrollers();
initAccordions();

export {};
